# Archive Report: mejoras-dashboard

**Date**: 2026-04-03  
**Status**: Partial (7/9 tasks complete — production code fully implemented)  
**Archived to**: `openspec/changes/archive/2026-04-03-mejoras-dashboard/`

---

## Summary

Change `mejoras-dashboard` delivered two capability blocks for the Janos Salones dashboard: **resilience** (`fix-context-api-cache`) and **UX persistence** (`ux-persistencia-y-scatter`). All 7 production code tasks were implemented, verified for TypeScript correctness (0 errors), and confirmed to pass lint (16 pre-existing warnings, 0 errors). The 2 remaining tasks (1.5 and 2.5) are test coverage tasks that could not be implemented because the project has no test framework installed.

---

## What Was Implemented

### Block 1 — `fix-context-api-cache` (tasks 1.1–1.4 ✅)

| Task | File | What changed |
|------|------|-------------|
| 1.1 Stabilize provider bootstrap | `app/src/components/DashboardContext.tsx` | Added `useRef hasFetched` flag to gate initial fetch to run exactly once; removed `salones` from `reloadSalones` deps; preserved previous data on failure |
| 1.2 Persist and validate context contracts | `app/src/components/DashboardContext.tsx` | Extended `DashboardContextType` with `salonesError`, `selectedSalonId`, `setSelectedSalonId`; auto-clears invalid selection after reload |
| 1.3 Add TTL cache to salones API | `app/src/app/api/salones/route.ts` | Module-level `Map<string, { data, timestamp }>` with `CACHE_TTL_MS` (5 min default, env-configurable); unfiltered data cached, filtering happens in-memory |
| 1.4 Secure revalidation auth flow | `app/src/app/api/revalidate/route.ts` | Accepts `Authorization: Bearer <token>` only; rejects `?secret=` with 401 + audit log; never exposes secret in logs |

### Block 2 — `ux-persistencia-y-scatter` (tasks 2.1–2.4 ✅)

| Task | Files | What changed |
|------|-------|-------------|
| 2.1 Persist conversion rate | `app/src/components/DashboardContext.tsx` | `getInitialConversionRate()` reads `localStorage["janos:conversionRate"]` (SSR-safe); `useEffect` writes updates; fallback to `DEFAULT_CONVERSION_RATE = 1470` |
| 2.2 Move salon selection to context | `app/src/components/DashboardContext.tsx` | `selectedSalonId: number \| null` is the single source of truth; `setSelectedSalonId` exposed as stable `useCallback` |
| 2.3 Remove duplicated page-level selection | `app/src/app/dashboard/page.tsx`, `benchmarking/page.tsx`, `efficiency/page.tsx`, `performance/page.tsx`, `contracts/page.tsx` | All 5 dashboard pages migrated to shared context selection; no page resets on mount |
| 2.4 Rework Performance scatter | `app/src/app/dashboard/performance/page.tsx` | All eligible salones plotted; per-`<Cell>` emphasis: selected (`fillOpacity=0.9`, `r=10`), peers (`fillOpacity=0.2`, `r=5`), unselected neutral; toggle deselect; tooltip badge |

### Verify-Phase Fixes (applied post-verification)

| Fix | File | What changed |
|-----|------|-------------|
| `salonesError` surfaced in UI | `app/src/components/DashboardShell.tsx` | Added error banner with "Reintentar" button; only renders when `salonesError !== null` |
| Lint `any` usages eliminated | `benchmarking/page.tsx`, `performance/page.tsx`, `app/src/lib/calculations.ts`, `app/src/lib/sample-data.ts` | Replaced `any` with proper types; 2 unavoidable cases in `sample-data.ts` suppressed with `eslint-disable-next-line` |

---

## What Was NOT Implemented

| Task | Status | Reason |
|------|--------|--------|
| **1.5** Cover resilience behaviors with tests | WON'T DO | No test framework installed in the project |
| **2.5** Cover persistence and scatter UX with tests | WON'T DO | No test framework installed in the project |

### Why tests were skipped

The project's `app/package.json` has **no `test` script** and no test-related dependencies (no Jest, no `@testing-library/react`, no Vitest, no test runner of any kind). Running `npm test` returned:

```
npm error Missing script: "test"
```

No test files exist under `app/src/**/*.{test,spec}.{ts,tsx,js,jsx}`. Installing a test framework was considered out of scope for this change, which focused on production behavior fixes.

---

## Files Changed

| File | Change type |
|------|------------|
| `app/src/components/DashboardContext.tsx` | Modified — stabilization, error state, selection lift, localStorage persistence |
| `app/src/app/api/salones/route.ts` | Modified — module-level TTL cache |
| `app/src/app/api/revalidate/route.ts` | Modified — Bearer auth, query-secret rejection, audit logging |
| `app/src/app/dashboard/page.tsx` | Modified — removed local selection state, consume context |
| `app/src/app/dashboard/benchmarking/page.tsx` | Modified — removed local selection state, consume context, typed `any` usages |
| `app/src/app/dashboard/efficiency/page.tsx` | Modified — removed local selection state, safe auto-select on first load only |
| `app/src/app/dashboard/performance/page.tsx` | Modified — all-salones scatter with per-Cell highlight |
| `app/src/app/dashboard/contracts/page.tsx` | Modified — migrated from local `selectedId` to shared context via `useMemo effectiveSelectedId` |
| `app/src/components/DashboardShell.tsx` | Modified — added non-blocking error banner |
| `app/src/lib/calculations.ts` | Modified — eliminated `any` typings on benchmark/efficiency params |
| `app/src/lib/sample-data.ts` | Modified — suppressed unavoidable `any` with eslint-disable-next-line |

---

## Quality Gates

| Check | Result |
|-------|--------|
| TypeScript (`npx tsc --noEmit`) | ✅ Passed — 0 errors |
| Lint (`npm run lint`) | ✅ Passed — 16 pre-existing warnings, 0 errors |
| Automated tests | ❌ Not available — no test framework installed |
| Build | Not executed (repository rule: never build after changes) |

---

## Specs Synced to Main

| Domain | Action | Details |
|--------|--------|---------|
| `dashboard` | Created | `openspec/specs/dashboard/spec.md` — first spec for this domain (2 capabilities, 7 requirements, 12 scenarios) |

Capabilities documented:
- `dashboard-data-resilience` — stable lifecycle, TTL cache, secure revalidation, non-blocking error state
- `dashboard-analysis-persistence` — cross-page selection, comparative scatter, conversion rate persistence

---

## Deviations from Design

1. **Efficiency page auto-select**: Only triggers when `selectedSalonId === null` (not a destructive reset). If user arrives with a selection from another page, it's preserved — consistent with persistence spec.
2. **Contracts page selection**: Uses `useMemo effectiveSelectedId` (prefers context selection when auditable, falls back to first auditable salon) instead of a `useEffect` setter — avoids lint `set-state-in-effect` error while preserving cross-page persistence.
3. **ZAxis range**: Changed from `[100, 100]` to `[60, 60]` to allow per-`<Cell>` `r` prop to control point sizing effectively.

---

## Recommendation: Next Steps

### If automated tests are needed (recommended)

Install Jest + React Testing Library:

```bash
cd app
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom ts-jest @types/jest
```

Add to `app/package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "jsdom",
    "setupFilesAfterFramework": ["@testing-library/jest-dom"]
  }
}
```

Then implement the 12 spec scenarios defined in tasks 1.5 and 2.5 (see `design.md` → Testing Strategy for the full test plan).

### Priority order for tests

1. `reloadSalones` single-fetch guarantee (prevents regression of the fixed infinite loop)
2. TTL cache hit/miss (prevents silent regression of API cache)
3. Bearer auth acceptance / query-secret rejection (security regression check)
4. Cross-page selection persistence (core UX regression check)
5. `conversionRate` localStorage restore (UX regression check)
6. Scatter highlight rendering (visual correctness)

---

## SDD Cycle Closure

| Phase | Status |
|-------|--------|
| Explore | ✅ Done |
| Propose | ✅ Done |
| Spec | ✅ Done |
| Design | ✅ Done |
| Tasks | ✅ Done |
| Apply | ✅ Done (7/9 tasks — 2 WON'T DO) |
| Verify | ✅ Done (FAIL on runtime coverage, PASS on static correctness) |
| Archive | ✅ Done (partial — production code complete, tests deferred) |
