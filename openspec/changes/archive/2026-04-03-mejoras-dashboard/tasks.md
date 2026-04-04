# Tasks: Mejoras Dashboard

## 1. fix-context-api-cache

- [x] 1.1 Stabilize provider bootstrap  
  Files: `app/src/components/DashboardContext.tsx` — add `salonesError`, gate initial fetch with `useRef`, keep `reloadSalones` as explicit action, preserve previous `salones` on fetch failure. Depends on: none.

- [x] 1.2 Persist and validate context contracts  
  Files: `app/src/components/DashboardContext.tsx` — extend `DashboardContextType` with `salonesError`, `selectedSalonId`, `setSelectedSalonId`; clear invalid selected salon when reloaded data no longer contains it. Depends on: 1.1.

- [x] 1.3 Add TTL cache to salones API  
  Files: `app/src/app/api/salones/route.ts` — add module-level `Map<string, { data; timestamp }>` and `CACHE_TTL_MS`; return cached unfiltered payload inside TTL, fetch upstream only on miss/expiry. Depends on: none.

- [x] 1.4 Secure revalidation auth flow  
  Files: `app/src/app/api/revalidate/route.ts` — read `Authorization: Bearer <token>`, reject any `?secret=` usage or missing/invalid header with 401, log rejection without exposing the secret. Depends on: none.

- [ ] 1.5 Cover resilience behaviors with tests  
  Files: `app/src/components/DashboardContext.tsx` tests, `app/src/app/api/salones/route.ts` tests, `app/src/app/api/revalidate/route.ts` tests — verify single initial fetch, non-blocking error state, TTL hit/miss, valid Bearer acceptance, and query-secret rejection. Depends on: 1.1, 1.3, 1.4.

## 2. ux-persistencia-y-scatter

- [x] 2.1 Persist conversion rate in browser storage  
  Files: `app/src/components/DashboardContext.tsx` — hydrate `conversionRate` from `localStorage` key `janos:conversionRate` in the client-safe initializer and write updates via `useEffect`. Depends on: 1.1.

- [x] 2.2 Move salon selection to shared context  
  Files: `app/src/components/DashboardContext.tsx` — make `selectedSalonId` the shared source of truth and expose setter semantics for selected/unselected mode. Depends on: 1.2.

- [x] 2.3 Remove duplicated page-level selection state  
  Files: `app/src/app/dashboard/page.tsx`, `app/src/app/dashboard/benchmarking/page.tsx`, `app/src/app/dashboard/efficiency/page.tsx`, `app/src/app/dashboard/performance/page.tsx` — replace local `selectedSalonId` state with context consumption in one atomic pass. Depends on: 2.2.

- [x] 2.4 Rework Performance scatter comparison  
  Files: `app/src/app/dashboard/performance/page.tsx` — build chart data from all eligible `salones`, keep peers visible, and highlight the selected salon through `Cell` opacity/stroke/radius props. Depends on: 2.3.

- [ ] 2.5 Cover persistence and scatter UX with tests  
  Files: `app/src/components/DashboardContext.tsx` tests, `app/src/app/dashboard/performance/page.tsx` tests — verify conversion rate restore/write, cross-page shared selection, invalid selection reset, and scatter rendering with one highlighted point plus peers. Depends on: 2.1, 2.4.
