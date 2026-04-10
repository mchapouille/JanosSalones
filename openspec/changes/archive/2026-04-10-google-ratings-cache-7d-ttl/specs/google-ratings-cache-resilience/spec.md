# Google Ratings Cache Resilience Specification

## Purpose

Persistent PostgreSQL cache with 7-day TTL for Google Places ratings, enabling cache-first reads, stale-fallback on upstream failure, and structured error logging.

## Requirements

### Requirement: Cache-first rating retrieval

The ratings API MUST read from `GoogleRatingsCache` by `id_salon` before calling Google Places. If a valid cache entry exists (`expires_at > now`), the API SHALL return cached data without any upstream call.

#### Scenario: Cache hit within TTL

- GIVEN a `GoogleRatingsCache` row exists for `id_salon` with `expires_at` in the future
- WHEN `GET /api/google-ratings?salonId={id}` is called
- THEN the API returns `google_rating`, `review_count`, `google_place_name`, `formatted_address` from cache
- AND no request is made to Google Places API

#### Scenario: Cache miss — entry does not exist

- GIVEN no `GoogleRatingsCache` row exists for `id_salon`
- WHEN `GET /api/google-ratings?salonId={id}` is called
- THEN the API calls Google Places API
- AND on success, inserts a new cache row with `cached_at = now` and `expires_at = now + 7 days`
- AND returns the fresh data to the caller

#### Scenario: Cache expired — TTL exceeded

- GIVEN a `GoogleRatingsCache` row exists for `id_salon` with `expires_at` in the past
- WHEN `GET /api/google-ratings?salonId={id}` is called
- THEN the API calls Google Places API
- AND on success, upserts the cache row with new `cached_at` and `expires_at`
- AND returns the fresh data to the caller

### Requirement: Stale-cache fallback on Google rate-limit

When Google Places returns a rate-limit error, the API MUST return the existing cache entry (even if expired) rather than propagating an error to the caller.

#### Scenario: Rate-limit with stale cache available

- GIVEN a `GoogleRatingsCache` row exists for `id_salon` (expired or valid)
- WHEN Google Places API returns a rate-limit error (HTTP 429 or equivalent)
- THEN the API returns the stale cached data
- AND logs a server-side warning with `salonId`, error type, and cache age

#### Scenario: Rate-limit with no cache available

- GIVEN no `GoogleRatingsCache` row exists for `id_salon`
- WHEN Google Places API returns a rate-limit error
- THEN the API returns a non-blocking response indicating data is unavailable
- AND logs a server-side error with `salonId` and error type

### Requirement: Missing API key handling

If the Google Places API key environment variable is absent, the API MUST NOT throw a visible error to the caller. It SHALL log a server-side warning and return a non-blocking unavailable state.

#### Scenario: API key missing at request time

- GIVEN the Google Places API key environment variable is not set
- WHEN `GET /api/google-ratings?salonId={id}` is called
- THEN the API logs a `WARN` entry with context (`salonId`, missing-key indicator)
- AND returns a response that does not expose an error state to the UI

### Requirement: Structured server-side logging

The API MUST log upstream errors and warnings with structured context: `salonId`, error type/status, and fallback decision taken.

#### Scenario: Upstream error logged with context

- GIVEN any Google Places call fails (rate-limit, network error, invalid key)
- WHEN the API handles the error
- THEN a server log entry is emitted containing `salonId`, error classification, and the fallback path chosen (stale cache / unavailable)
- AND no secret values or raw API responses are included in the log

### Requirement: Cache upsert atomicity

Cache writes MUST use an upsert keyed on `id_salon` to prevent duplicate rows from concurrent requests.

#### Scenario: Concurrent miss for same salon

- GIVEN two simultaneous requests for the same `id_salon` with no cache entry
- WHEN both complete their Google Places call and attempt to write
- THEN only one cache row exists for `id_salon` after both writes complete
- AND no database constraint violation is raised
