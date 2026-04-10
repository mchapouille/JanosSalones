# Delta for Dashboard

## MODIFIED Requirements

### Requirement: Non-blocking visible data error state

The dashboard context MUST expose a user-visible non-blocking error state for reputation data when the upstream Google Places call fails or data is unavailable. No cache lookup is attempted before showing the error state.
(Previously: error state was shown ONLY when BOTH cache lookup AND upstream Google Places call fail; stale cache suppressed the error)

#### Scenario: Upstream failure with fallback continuity

- GIVEN upstream fetch fails during reload
- WHEN fallback or previous dataset exists
- THEN users can continue navigating with existing data
- AND an error message is exposed in shared context/UI

#### Scenario: Google API failure — no cache

- GIVEN Google Places API fails (rate-limit or network error)
- WHEN the ratings endpoint returns an unavailable state
- THEN the dashboard displays the "No se pudo cargar..." error message
- AND the rest of the dashboard remains functional and navigable

#### Scenario: Google API unavailable

- GIVEN Google Places API call fails for any reason (rate-limit, network, invalid key)
- WHEN the API returns an unavailable response
- THEN the dashboard shows a non-blocking unavailable state
- AND no crash or unhandled error is propagated to the user

## REMOVED Requirements

### Requirement: Cache-first rating retrieval

(Reason: Vercel production has no `DATABASE_URL`; Prisma/PostgreSQL cache path is not viable and causes runtime errors.)

### Requirement: Stale-cache fallback on Google rate-limit

(Reason: No cache layer exists after removal; rate-limit failures go directly to unavailable state.)

### Requirement: Cache upsert atomicity

(Reason: No DB writes occur after cache removal; upsert concurrency concern is eliminated.)

## ADDED Requirements

### Requirement: Direct upstream Google ratings retrieval

The ratings API MUST call Google Places directly on every request. No database read or write SHALL occur during ratings retrieval.

#### Scenario: Successful Google Places call

- GIVEN a valid `GOOGLE_PLACES_API_KEY` is set and Google Places is reachable
- WHEN `GET /api/google-ratings?salonId={id}` is called
- THEN the API returns `google_rating`, `review_count`, `google_place_name`, `formatted_address` from Google Places
- AND no database query is executed

#### Scenario: Missing API key at request time

- GIVEN the `GOOGLE_PLACES_API_KEY` environment variable is not set
- WHEN `GET /api/google-ratings?salonId={id}` is called
- THEN the API logs a `WARN` entry with `salonId` and missing-key indicator
- AND returns a non-blocking unavailable response without exposing an error to the UI

#### Scenario: Rate-limit or upstream failure

- GIVEN Google Places API returns an error (HTTP 429, network failure, or invalid key)
- WHEN the API handles the error
- THEN a structured server log entry is emitted with `salonId`, error classification, and fallback decision
- AND the API returns a non-blocking unavailable response to the caller
