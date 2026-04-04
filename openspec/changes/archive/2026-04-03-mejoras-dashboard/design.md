# Design: Mejoras Dashboard

## Technical Approach

Two orthogonal blocks applied sequentially: (1) **resilience** — fix the `useEffect`/`useCallback` dependency loop in `DashboardContext`, add server-side module-level TTL cache in `api/salones`, and migrate revalidate secret to `Authorization: Bearer`; (2) **UX persistence** — lift `selectedSalonId` into `DashboardContext`, scatter plot updated to render all salones with selected-salon highlight, `conversionRate` persisted to `localStorage`.

---

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Context infinite loop fix | Remove `reloadSalones` from `useEffect` deps; use `useRef` flag to gate initial fetch | Separate `useMemo`, `useReducer` | Minimal diff; keeps existing `useCallback` pattern; flag ensures single-run semantics |
| API-layer cache | Module-level `Map` with `{ data, timestamp }` and `CACHE_TTL_MS` env-configurable constant in `route.ts` | Next.js `fetch` `revalidate` option, Redis | Module-level cache is zero-dep, works in both dev and prod; `no-store` on upstream stays compatible when cache misses |
| Revalidate auth | `Authorization: Bearer <token>` header only; reject if `searchParams.get('secret')` present or header absent | Keep query param | Spec hard-requirement; secrets in URLs appear in server logs and proxies |
| `selectedSalonId` state location | Lift into `DashboardContext` | Keep per-page local state, URL search param | Context already wraps all dashboard pages; lifting avoids query-param coupling and keeps clean routing |
| `conversionRate` persistence | `localStorage` with key `janos:conversionRate`; hydrated in `useState` initializer | `sessionStorage`, cookie | `localStorage` matches UX requirement (survives full reload); no server involvement needed; existing `conversionRate` state lives in context already |
| Scatter chart behavior | Render all `salones` as `<Cell>`; use `fillOpacity`/`strokeOpacity`/`r` to differentiate selected vs peers | Only show selected, separate `<Scatter>` series | Recharts `Cell` per-point already used in codebase; single `<Scatter>` with `Cell` differentiation is the established pattern |
| Error state in Context | Add `salonesError: string | null` field; set on catch; keep existing `salones` data on error | Toast outside context, throw to Error Boundary | Non-blocking per spec; context consumers already destructure it; backward-compatible extension |

---

## Data Flow

### fix-context-api-cache

```
DashboardProvider (mount)
  └─ useEffect (runs ONCE via hasFetched ref)
       └─ reloadSalones()
            ├─ setSalonesLoading(true)
            ├─ fetch("/api/salones")   ──→  route.ts GET
            │                                ├─ cache HIT  → return cached SalonIntegral[]
            │                                └─ cache MISS → fetchSalonesFromGitHub()
            │                                                   └─ fetch(GITHUB_API_URL, no-store)
            ├─ setSalones(data)   OR   setSalonesError(message)
            └─ setSalonesLoading(false)

POST /api/revalidate
  ├─ read Authorization header  →  Bearer <token>
  ├─ reject if query ?secret= present  →  401
  ├─ compare token vs REVALIDATE_SECRET
  └─ revalidatePath("/", "layout")
```

### ux-persistencia-y-scatter

```
DashboardContext
  ├─ selectedSalonId: number | null  (lifted from pages)
  └─ setSelectedSalonId: (id: number | null) → void
       └─ validate: if id not in salones → setSelectedSalonId(null)

localStorage ("janos:conversionRate")
  ├─ READ  → useState initializer  (hydration on mount)
  └─ WRITE → useEffect([conversionRate])

PerformancePage scatter
  salones (all eligible)
    └─ chartData = salones.map(s => ({
         ...scatterPoint,
         isSelected: s.id_salon === selectedSalonId,
         fillOpacity: isSelected ? 0.9 : 0.25,
         r: isSelected ? 10 : 5
       }))
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/src/components/DashboardContext.tsx` | Modify | Add `selectedSalonId`/`setSelectedSalonId`; add `salonesError`; fix `useEffect` loop with `useRef` flag; persist `conversionRate` to localStorage |
| `app/src/app/api/salones/route.ts` | Modify | Add module-level TTL cache (`Map` + timestamp); change `cache: "no-store"` to conditional per cache-miss path |
| `app/src/app/api/revalidate/route.ts` | Modify | Read `Authorization: Bearer` header; reject query-param secret; add audit log on rejection |
| `app/src/app/dashboard/performance/page.tsx` | Modify | Remove local `selectedSalonId` state; consume from context; update `chartData` to plot all salones with selected highlight |
| `app/src/app/dashboard/page.tsx` | Modify | Remove local `selectedSalonId` state; consume from context |
| `app/src/app/dashboard/benchmarking/page.tsx` | Modify | Remove local `selectedSalonId` state; consume from context |
| `app/src/app/dashboard/efficiency/page.tsx` | Modify | Remove local `selectedSalonId` state; consume from context |

---

## Interfaces / Contracts

```typescript
// DashboardContext.tsx — extended interface (backward compatible)
interface DashboardContextType {
    conversionRate: number;
    setConversionRate: (rate: number) => void;
    isHelpOpen: boolean;
    setIsHelpOpen: (open: boolean) => void;
    salones: SalonIntegral[];
    salonesLoading: boolean;
    salonesError: string | null;         // NEW — null when no error
    reloadSalones: () => void;
    selectedSalonId: number | null;      // NEW — lifted from pages
    setSelectedSalonId: (id: number | null) => void; // NEW
}

// api/salones/route.ts — internal cache shape
interface SalonesCache {
    data: SalonIntegral[];
    timestamp: number;  // Date.now()
}
// Module-level: const cache = new Map<string, SalonesCache>()
// Key: "default" (no filters applied at cache level; filtering remains in GET handler)
// TTL: const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 5 * 60 * 1000)

// api/revalidate/route.ts — auth logic
// Accept:  Authorization: Bearer <token>
// Reject:  ?secret= in URL  → 401 (logged without exposing value)
// Reject:  missing/wrong header → 401
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `reloadSalones` called exactly once on mount; not re-triggered by its own `salones` state update | Jest + `@testing-library/react`; mock `fetch`; count calls |
| Unit | `api/salones` returns cache on second call within TTL; fetches fresh after TTL | Jest; mock `Date.now()` + `global.fetch`; assert GitHub fetch call count |
| Unit | `api/revalidate` accepts valid Bearer header; rejects query secret | Jest; mock `revalidatePath`; assert 401 vs 200 |
| Unit | `selectedSalonId` cleared when salon no longer in list after reload | RTL; update context salones; assert state reset |
| Unit | `conversionRate` persisted to localStorage and restored on mount | RTL; spy on `localStorage.setItem`/`getItem` |
| Integration | Scatter renders one highlighted point + N peers when `selectedSalonId` set | RTL; assert `fillOpacity` attribute values on `<Cell>` elements |

---

## Migration / Rollout

No data migration required. Changes are incremental and backward-compatible:
- `DashboardContextType` new fields are additive; existing consumers using destructuring will continue to work.
- Pages removing local `selectedSalonId` must be updated in the same PR to avoid runtime `undefined` errors — all 4 affected pages must be updated atomically.
- `localStorage` key `janos:conversionRate` is new; existing users with no stored value will get the current default (`1470`) on first load.

---

## Open Questions

- [ ] Should the TTL cache key include query filters (`estado`, `municipio`, `tier`) or only cache the unfiltered response? Current design caches unfiltered and filters in memory — confirm this is acceptable for expected salon count.
- [ ] Should `selectedSalonId` reset when the user navigates between dashboard sections, or always persist for the session? Spec says "same session" — current design keeps it until explicitly cleared or salon removed.
