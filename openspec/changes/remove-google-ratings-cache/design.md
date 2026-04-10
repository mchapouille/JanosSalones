# Design: Remove Google Ratings Database Cache

## Technical Approach

Strip all Prisma/DB access from the ratings route. Route becomes: auth → validate input → resolve salon → call Google Places → return `available`/`unavailable`. Remove dead DB utility files and Prisma scripts once the route is clean.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Cache removal strategy | Delete all cache branches in one pass | Keep DB path gated by env flag | No `DATABASE_URL` in prod; conditional path adds complexity for zero benefit |
| `GoogleRatingsSource` type | Narrow to `"google"` only | Keep `"cache" \| "stale-cache"` | Consumers only branch on `state` field; removing dead source values prevents drift |
| `logGoogleRatingsEvent` signature | Drop `fallback: "cache-hit" \| "stale-cache"` | Keep union | Source values no longer emit; log field should match actual emissions |
| `db.ts` / `prisma.ts` removal | Delete both files | Leave as dead code | Only consumer was the ratings route; no other importer found |
| Prisma deps in `package.json` | Remove `@prisma/client`, `prisma`, `prisma generate` scripts | Keep | No runtime Prisma usage remains; keeping inflates build time and triggers `prisma generate` on deploy |
| `DashboardContext` | No change needed | Modify error handling | Context already handles `unavailable` state correctly; logic is API-response-driven |

## Data Flow

**Before (current):**

```
GET /api/google-ratings?salonId=N
  → auth check
  → find valid cache (DB)          ← removed
  → find stale cache (DB)          ← removed
  → check API key
  → resolveSalonRating (Google)
  → on success: upsert cache (DB)  ← removed
  → return available/unavailable
```

**After:**

```
GET /api/google-ratings?salonId=N
  → auth check
  → validate salonId + resolve salon
  → check API key → WARN + unavailable if missing
  → resolveSalonRating (Google Places)
  → on error: log + return unavailable
  → on success: return available (source: "google")
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/src/app/api/google-ratings/route.ts` | Modify | Remove all DB imports, `CACHE_TTL_MS`, `mapCacheToRating`, `getCacheAgeHours`, `decimalToNumber`, stale-cache branches, DB upsert block. Simplify `logGoogleRatingsEvent` fallback field. |
| `app/src/lib/google-ratings.ts` | Modify | `GoogleRatingsSource = "google"` (drop `"cache"` and `"stale-cache"`). Drop `stale` field from `GoogleRatingsAvailableResponse` or keep as always-false — prefer removal to prevent consumer confusion. |
| `app/src/lib/db.ts` | Delete | No remaining consumers after route cleanup |
| `app/src/lib/prisma.ts` | Delete | Re-exports `db`; no consumers |
| `app/package.json` | Modify | Remove `@prisma/client`, `prisma` deps; remove `prisma generate` from `build` and `postinstall` scripts; remove `"prisma"` config block |
| `app/src/components/DashboardContext.tsx` | None | Already handles `unavailable` state; no changes needed |

## Interfaces / Contracts

```ts
// google-ratings.ts — after change
export type GoogleRatingsSource = "google";

export interface GoogleRatingsAvailableResponse {
    state: "available";
    source: GoogleRatingsSource;
    rating: GoogleRating;
    // `stale` field removed — no stale-cache path exists
}
```

Logging shape (simplified):
```ts
// fallback field drops "cache-hit" | "stale-cache"
fallback: "unavailable" | "none"
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `buildAvailableResponse`, `buildUnavailableResponse` shape | Verify no `stale`/`source` regressions |
| Integration | `GET /api/google-ratings` with mocked Google fetch | Happy path returns `available`; missing key / 429 / network error return `unavailable` |
| Manual | Vercel deploy without `DATABASE_URL` | Route responds without startup crash; `prisma generate` no longer runs |

## Migration / Rollout

No data migration. Prisma schema file (`app/prisma/`) can remain on disk — it's not imported at runtime after removing the deps. Remove if desired in a follow-up cleanup. Deploy replaces current build; rollback = revert commit.

## Open Questions

- None — all decisions resolved by codebase inspection and proposal scope.
