# Tasks: Google Ratings Cache con TTL de 7 días

## Phase 1: Foundation

- [x] 1.1 Create `app/src/lib/prisma.ts` with a shared `PrismaClient` singleton for Next.js server usage, reusing the existing `GoogleRatingsCache` schema.
- [x] 1.2 Extend `app/src/lib/google-ratings.ts` with response types for cache-backed success and non-blocking unavailable states so route/context share one contract.
- [x] 1.3 Refactor `app/src/app/api/google-ratings/route.ts` helpers to classify upstream failures (`rate-limit`, `missing-key`, `upstream-error`, `no-match`) and centralize structured logging fields (`salonId`, status/type, fallback decision).

## Phase 2: Cache-first API implementation

- [x] 2.1 In `app/src/app/api/google-ratings/route.ts`, query `GoogleRatingsCache` by `id_salon` before Google Places; return cached payload immediately when `expires_at > now`.
- [x] 2.2 For cache miss or expired cache, call Google Places, map the resolved place into the API payload, and upsert `GoogleRatingsCache` with `cached_at = now` and `expires_at = now + 7 days`.
- [x] 2.3 Handle fallback branches in `route.ts`: missing API key returns unavailable without UI-breaking error, rate-limit returns stale cache when present, and both-fail returns unavailable while preserving server logs.
- [x] 2.4 Keep diagnostic mode working in `route.ts`, ensuring cache logic does not leak secrets and concurrent writes remain safe through Prisma upsert on `id_salon`.

## Phase 3: Dashboard integration

- [x] 3.1 Update `app/src/components/DashboardContext.tsx` so `fetchGoogleRating()` distinguishes usable fallback data from unavailable responses instead of treating every non-200/failure path as `null`.
- [x] 3.2 Adjust `loadGoogleRatings()` in `DashboardContext.tsx` to show `"No se pudo cargar..."` ONLY when a salon has neither cache data nor fresh API data; stale cache responses must not raise `ratingsError`.

## Phase 4: Verification

- [x] 4.1 Verify `route.ts` against spec scenarios: valid cache hit skips upstream call, miss/expiry refreshes cache, rate-limit uses stale cache, missing key returns unavailable, and no-cache + upstream failure returns unavailable.
- [x] 4.2 Run `tsc --noEmit` from `app/` and fix any type regressions before commit; then run `eslint` if the touched files introduce lint issues per OpenSpec verify rules.
