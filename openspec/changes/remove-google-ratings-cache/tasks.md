# Tasks: Remove Google Ratings Database Cache

## Phase 1: Foundation

- [x] 1.1 Inspect `app/src/app/api/google-ratings/route.ts`, `app/src/lib/google-ratings.ts`, and repo imports to confirm every Prisma/cache touchpoint and any remaining `db`/`prisma` consumers before cleanup.
- [x] 1.2 Update `app/src/lib/google-ratings.ts` so `GoogleRatingsSource` is only `"google"` and `GoogleRatingsAvailableResponse` no longer exposes cache-only fields such as `stale`.

## Phase 2: API Route Simplification

- [x] 2.1 Refactor `app/src/app/api/google-ratings/route.ts` to remove DB imports/helpers (`CACHE_TTL_MS`, cache mappers, age calculators, Decimal conversion) and keep only auth, input validation, salon resolution, Google Places call, and response mapping.
- [x] 2.2 Simplify route logging in `app/src/app/api/google-ratings/route.ts` so fallback values only match live behavior (`"unavailable" | "none"`) for missing key, 429, invalid key, and network failures.
- [x] 2.3 Ensure `GET /api/google-ratings` returns direct-upstream `available` data on success and non-blocking `unavailable` responses on missing key or upstream failure, with no DB read/write branch left.

## Phase 3: Runtime Cleanup

- [x] 3.1 Verify `app/src/components/DashboardContext.tsx` and any other consumers do not depend on removed cache fields/source variants; adjust consumer typing only if compile errors prove it is needed.
- [x] 3.2 Delete `app/src/lib/db.ts` and `app/src/lib/prisma.ts` after confirming no runtime imports remain anywhere in `app/src`.
- [x] 3.3 Update `app/package.json` to remove `@prisma/client`, `prisma`, `prisma generate` hooks, and the `prisma` config block once Prisma is fully unused at runtime.

## Phase 4: Verification

- [x] 4.1 Verify the shared response builders/types in `app/src/lib/google-ratings.ts` still produce the expected `available`/`unavailable` shapes without `stale` or cache-source regressions.
- [x] 4.2 Run `tsc --noEmit` and `eslint` from `app/` to catch contract or import breakage caused by removing Prisma/cache code.
- [ ] 4.3 Manually exercise `GET /api/google-ratings?salonId={id}` with mocked/missing Google credentials to confirm: success returns Google payload, missing key logs WARN + `unavailable`, and 429/network failures return graceful `unavailable` without crashing the dashboard.
