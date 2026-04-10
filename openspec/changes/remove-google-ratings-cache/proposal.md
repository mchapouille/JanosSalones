# Proposal: Remove Google Ratings Database Cache

## Intent

Restore production reliability by removing the Prisma/PostgreSQL cache path from Google ratings. Vercel production does not have `DATABASE_URL`, so ratings should return to direct Google Places calls with graceful fallback behavior.

## Scope

### In Scope
- Remove Prisma cache reads/writes from `app/src/app/api/google-ratings/route.ts` and keep direct Google API flow.
- Preserve `GOOGLE_PLACES_API_KEY` usage, auth checks, and graceful unavailable responses for missing key/rate-limit/upstream failures.
- Remove `app/src/lib/db.ts` and `app/src/lib/prisma.ts` if no remaining imports exist.
- Align shared response contract/types and `DashboardContext` handling with non-cache sources.
- Optionally remove Prisma-related dependencies/scripts from `app/package.json` if no runtime usage remains.

### Out of Scope
- Replacing Google Places with another provider.
- UI redesign of reputation panels.
- Adding a new caching strategy (Redis, edge cache, etc.) in this change.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `dashboard`: remove cache-first and stale-cache fallback requirements from Google ratings behavior; require direct upstream retrieval with non-blocking unavailable states.

## Approach

Refactor the ratings route to a single direct-upstream path: validate auth/input, resolve salon, call Google Places, map result, and return `available`/`unavailable` responses without DB access. Keep structured logging for rate-limit, missing key, and upstream failures. Update response source typing/handling to remove cache-specific states and keep `DashboardContext` error semantics stable.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/src/app/api/google-ratings/route.ts` | Modified | Remove Prisma cache logic; keep direct Google calls + graceful error handling. |
| `app/src/lib/google-ratings.ts` | Modified | Simplify source/failure contract to non-cache response states. |
| `app/src/components/DashboardContext.tsx` | Modified | Ensure ratings aggregation and error handling still work with simplified API response. |
| `app/src/lib/db.ts` | Removed | Delete if no remaining consumers. |
| `app/src/lib/prisma.ts` | Removed | Delete if no remaining consumers. |
| `app/package.json` | Modified (optional) | Remove Prisma deps/scripts only if fully unused. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Higher Google API call volume after cache removal | Med | Keep single-fetch-per-load behavior and monitor quota/rate-limit logs. |
| Breaking type contract in UI context | Med | Update shared types + `DashboardContext` together and verify unavailable-path handling. |
| Hidden Prisma usage elsewhere | Low | Run repo-wide import check before removing db files/dependencies. |

## Rollback Plan

Revert this change set to restore cache-based route behavior and Prisma files/dependencies. If needed, redeploy previous commit with known DB-backed cache flow.

## Dependencies

- `GOOGLE_PLACES_API_KEY` configured in runtime environment.
- Google Places API availability and quota.

## Success Criteria

- [ ] `/api/google-ratings` works in production without any `DATABASE_URL` dependency.
- [ ] Missing API key returns non-blocking `unavailable` response with server warning log.
- [ ] Rate-limit/upstream failures return graceful `unavailable` response without crashing dashboard.
- [ ] No remaining runtime imports of `db`/`prisma` after cleanup.
