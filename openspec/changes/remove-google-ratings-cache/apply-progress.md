# Apply Progress: remove-google-ratings-cache

## Mode

Standard (strict_tdd: false)

## Completed Tasks

- [x] 1.1 Inspect Prisma/cache touchpoints and remaining runtime consumers
- [x] 1.2 Simplify `GoogleRatingsSource` and available response shape
- [x] 2.1 Remove DB imports/helpers/cache logic from ratings route
- [x] 2.2 Simplify logging fallback values to `"unavailable" | "none"`
- [x] 2.3 Keep direct Google success and graceful unavailable failures only
- [x] 3.1 Verify `DashboardContext` does not depend on removed cache fields
- [x] 3.2 Delete `app/src/lib/db.ts` and `app/src/lib/prisma.ts`
- [x] 3.3 Remove Prisma deps/scripts/config from `app/package.json`
- [x] 4.1 Verify shared response builders/types preserve `available`/`unavailable` contract
- [x] 4.2 Run `tsc --noEmit` and `eslint`

## Pending Tasks

- [ ] 4.3 Manually exercise `GET /api/google-ratings?salonId={id}` with mocked/missing credentials for success + missing-key + upstream failure scenarios

## Verification Notes

- `npx tsc --noEmit` completed successfully.
- `npm run lint` completed successfully.
- `npm test` is not configured in `app/package.json` (`Missing script: "test"`).

## Deviations

None — implementation follows design and scope.
