# Apply Progress: mejoras-dashboard

**Date**: 2026-04-03  
**Mode**: Standard (no test framework installed)

---

## Phase 1: fix-context-api-cache

### [x] 1.1 Stabilize provider bootstrap
**File**: `app/src/components/DashboardContext.tsx`
- Added `useRef hasFetched` flag to gate initial fetch to run exactly once
- Removed `salones` from `reloadSalones` `useCallback` deps (was the root of the infinite loop)
- `reloadSalones` now uses functional updater for `setSelectedSalonIdState` to validate selection after reload
- Previous `salones` data is preserved on fetch failure (non-blocking error state)

### [x] 1.2 Persist and validate context contracts
**File**: `app/src/components/DashboardContext.tsx`
- Extended `DashboardContextType` with `salonesError: string | null`
- Added `selectedSalonId: number | null` and `setSelectedSalonId` to interface and provider
- Added auto-invalidation: if reloaded data no longer contains the selected salon id, it resets to null

### [x] 1.3 Add TTL cache to salones API
**File**: `app/src/app/api/salones/route.ts`
- Added module-level `cache: Map<string, SalonesCache>` with `{ data, timestamp }` shape
- `CACHE_TTL_MS` defaults to 5 minutes, configurable via `process.env.CACHE_TTL_MS`
- Cache key is always `"default"` — unfiltered data; filtering happens in-memory after retrieval
- `getSalones()` helper checks TTL before deciding to fetch upstream

### [x] 1.4 Secure revalidation auth flow
**File**: `app/src/app/api/revalidate/route.ts`
- Rejects any request with `?secret=` query param with 401 (logs without exposing value)
- Reads `Authorization: Bearer <token>` header only
- Logs rejection type (query param / missing header / invalid token) for audit without exposing secret value
- Accepts and revalidates on valid Bearer token match

### [ ] 1.5 Cover resilience behaviors with tests
**Status**: BLOCKED — no test framework installed (`package.json` has no Jest, `@testing-library/react`, or similar). Requires dependency installation before implementation.

---

## Phase 2: ux-persistencia-y-scatter

### [x] 2.1 Persist conversion rate in browser storage
**File**: `app/src/components/DashboardContext.tsx`
- `getInitialConversionRate()` reads from `localStorage["janos:conversionRate"]` on client mount (SSR-safe via `typeof window` guard)
- `useEffect([conversionRate])` writes updates to localStorage
- Graceful fallback to `DEFAULT_CONVERSION_RATE = 1470` on parse errors or missing key

### [x] 2.2 Move salon selection to shared context
**File**: `app/src/components/DashboardContext.tsx`
- `selectedSalonId: number | null` is now the single source of truth in context
- `setSelectedSalonId` exposed as `useCallback` wrapper for stable reference
- Validation on reload: auto-clears if selected id disappears from fresh data

### [x] 2.3 Remove duplicated page-level selection state
**Files modified**:
- `app/src/app/dashboard/page.tsx` — removed `useState<number | null>` and the `useEffect` mount-reset; now purely consumes `selectedSalonId` + `setSelectedSalonId` from context with no reset on mount
- `app/src/app/dashboard/benchmarking/page.tsx` — same pattern; also removed `useState`, `useEffect`, and the unused `selectedSalonMeta` computed value
- `app/src/app/dashboard/efficiency/page.tsx` — uses `useRef hasInitialized` to auto-select first salon only when nothing is selected yet (no longer resets to null first)
- `app/src/app/dashboard/performance/page.tsx` — removed the `hasReset` ref + mount `useEffect`; the existing invalid-id guard `useEffect` is preserved
- `app/src/app/dashboard/contracts/page.tsx` — migrated from local `selectedId` state to `selectedSalonId`/`setSelectedSalonId` from context; replaced `useEffect`-driven init (which triggered `set-state-in-effect` lint error) with a pure `useMemo effectiveSelectedId` that falls back to the first auditable salon if context selection is not auditable

**Fix applied (verify phase)**: The verify report found that mount-time `setSelectedSalonId(null)` calls in page, benchmarking, and performance were destroying cross-page persistence. These have been removed. The efficiency page now only auto-selects when nothing is selected (not a destructive reset).

### [x] 2.4 Rework Performance scatter comparison
**File**: `app/src/app/dashboard/performance/page.tsx`
- `chartData` now maps ALL eligible salones (those with `performance` data)
- Per-point visual emphasis:
  - Selected: `fillOpacity=0.9`, `strokeOpacity=1`, `r=10`, white stroke border
  - Peers (when selection active): `fillOpacity=0.2`, `strokeOpacity=0.15`, `r=5`
  - No selection: `fillOpacity=0.45`, `strokeOpacity=0.7`, `r=5` (neutral)
- Click on selected point deselects (toggle); click on peer selects it
- Tooltip now shows "(seleccionado)" badge on selected point
- `ZAxis range` set to `[60, 60]` (fixed, since visual sizing now via `r` per Cell)

### [ ] 2.5 Cover persistence and scatter UX with tests
**Status**: BLOCKED — same reason as 1.5, no test framework installed.

---

## Verify-Phase Fixes (applied after verify report)

### salonesError visible in UI
**File**: `app/src/components/DashboardShell.tsx`
- Added `salonesError` to context consumption (removed unused `salones`)
- Added error banner between the header and main content: shows `salonesError` text with a "Reintentar" button that calls `reloadSalones`
- Banner only renders when `salonesError !== null`
- Removed unused `Clock` import

### Lint errors fixed
**Files**:
- `app/src/app/dashboard/benchmarking/page.tsx` — replaced 3 `any` usages with typed alternatives; `{ data: any }` → `{ id: number }` for scatter click handler, `any` filter → inferred type, Recharts `formatter` value typed as `number | string | undefined`
- `app/src/app/dashboard/performance/page.tsx` — removed `(s.extra as any)?.ticket_*` accesses replaced with direct field reads (`ticket_evento_promedio`, `ticket_persona_promedio`)
- `app/src/lib/calculations.ts` — `benchmark` and `efficiency` params typed as `{ color?: string } | null` instead of `any`
- `app/src/lib/sample-data.ts` — added `eslint-disable-next-line` comments on the two raw JSON mapping sites (true `any` needed for dynamic JSON shape)

---

## Deviations from Design

1. **Efficiency page initial selection**: Now only auto-selects when `selectedSalonId === null`. If a user navigates to efficiency with a selection already set from another page, the existing selection is preserved (even if that salon isn't in the efficiency list — in that case the `selectedSalon` useMemo returns undefined and the page renders the empty state). This is consistent with the persistence spec.

2. **Contracts page selection**: Uses a `useMemo effectiveSelectedId` that prefers the shared context selection when it's an auditable salon, or falls back to the first auditable. This avoids the `set-state-in-effect` lint error while preserving cross-page persistence.

3. **ZAxis range**: Changed from `[100, 100]` (original) to `[60, 60]` — allows `r` prop on `<Cell>` to control scatter point size effectively.

## Issues Found

- `calcPerformance` and `interpolateScore` pre-existed as unused imports/definitions in `performance/page.tsx`. Not removed (out of scope).
- No test infrastructure in project — tasks 1.5 and 2.5 cannot be implemented.
- Several pre-existing unused-var warnings in unchanged files (`efficiency`, `dashboard/page.tsx`, `performance`, `SerendipLogo`, `sample-data`). These are pre-existing and not introduced by this change.

## Summary

**7/9 tasks complete** (2 blocked on missing test infrastructure).  
All production code changes are implemented, lint passes with 0 errors, TypeScript passes.  
Cross-page `selectedSalonId` persistence is now correct — no mount-time resets.  
Contracts page uses shared context state.  
`salonesError` is surfaced in the UI via DashboardShell error banner.
