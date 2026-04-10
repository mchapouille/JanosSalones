# Apply Progress: google-ratings-cache-7d-ttl

## Mode

Standard (strict_tdd: false in `openspec/config.yaml`)

## Completed Tasks

- [x] 1.1 Prisma singleton implemented (`db.ts`) and compatibility export (`prisma.ts`)
- [x] 1.2 Shared API response contract added in `google-ratings.ts`
- [x] 1.3 Route helpers refactored with upstream failure classification + structured logging
- [x] 2.1 Cache-first read implemented with TTL validity check (`expires_at > now`)
- [x] 2.2 Miss/expired flow calls Google and upserts cache with 7-day TTL
- [x] 2.3 Missing key/rate-limit/both-fail fallback branches implemented
- [x] 2.4 Diagnostic mode preserved and cache writes remain atomic via Prisma upsert
- [x] 3.1 Dashboard context now distinguishes available vs unavailable API responses
- [x] 3.2 Ratings error is only raised for truly unavailable salon ratings
- [x] 4.1 Route behavior verified against specified scenarios via code path review
- [x] 4.2 Quality checks executed: `tsc --noEmit`, targeted `eslint`

## Notes

- Prisma dependencies were added to `app/package.json` and lockfile, with Prisma pinned to `6.7.0` to match current schema format.
- `prisma generate` executed successfully before typecheck.

## Validation Evidence

- `npx tsc --noEmit` ✅
- `npx eslint src/app/api/google-ratings/route.ts src/components/DashboardContext.tsx src/lib/google-ratings.ts src/lib/db.ts src/lib/prisma.ts` ✅
