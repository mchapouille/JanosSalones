# Specs: mejoras-dashboard

## Change 1 — `fix-context-api-cache`
### Capability: `dashboard-data-resilience` (NEW)

## Functional Requirements

### Requirement: Stable dashboard data lifecycle
The dashboard data provider MUST avoid unintended repeated reload cycles and MUST expose a single deterministic reload behavior per explicit trigger.

#### Scenario: Initial load without loop
- GIVEN the dashboard loads for the first time
- WHEN the provider initializes data
- THEN data is fetched once for that initialization event
- AND no self-triggered reload cycle is started

#### Scenario: Explicit reload
- GIVEN data is already present
- WHEN the user or page triggers a manual reload action
- THEN the provider executes one reload flow
- AND updates shared data state consistently for all consumers

### Requirement: Cached upstream salon data
The salones API MUST serve cached upstream data with a bounded TTL and SHALL re-fetch after TTL expiration.

#### Scenario: Cache hit inside TTL
- GIVEN a successful upstream response was cached and TTL is still valid
- WHEN a new request reaches the salones API
- THEN the API returns cached data
- AND does not perform a new upstream fetch

#### Scenario: Cache miss after TTL
- GIVEN cache is empty or TTL is expired
- WHEN a new request reaches the salones API
- THEN the API fetches fresh upstream data
- AND refreshes the cache entry

### Requirement: Secure revalidation secret transport
The revalidation endpoint MUST accept the secret via `Authorization: Bearer <token>` and MUST reject query-string secret usage.

#### Scenario: Authorized revalidation
- GIVEN a request includes a valid Bearer token header
- WHEN the revalidation endpoint validates the token
- THEN the endpoint accepts and executes revalidation

#### Scenario: Rejected insecure token transport
- GIVEN a request sends secret only in query params or missing header
- WHEN the endpoint validates authentication
- THEN the request is rejected with unauthorized status

### Requirement: Non-blocking visible data error state
The dashboard context MUST expose a user-visible non-blocking error state for reputation data ONLY when BOTH the cache lookup AND the upstream Google Places call fail. If cached data (even stale) is available, the error state MUST NOT be shown.
(Previously: error state was shown whenever fresh data loading fails, without distinguishing cache availability)

#### Scenario: Upstream failure with fallback continuity
- GIVEN upstream fetch fails during reload
- WHEN fallback or previous dataset exists
- THEN users can continue navigating with existing data
- AND an error message is exposed in shared context/UI

#### Scenario: Google API failure with stale cache available
- GIVEN Google Places API fails (rate-limit or network error)
- WHEN a stale cache entry exists for the requested salon
- THEN the dashboard displays the stale cached rating data
- AND NO error message is shown to the user

#### Scenario: Both cache and API unavailable
- GIVEN no cache entry exists for the salon AND Google Places API call fails
- WHEN the ratings endpoint returns an unavailable state
- THEN the dashboard displays the "No se pudo cargar..." error message
- AND the rest of the dashboard remains functional and navigable

## Non-Functional Requirements
- Performance: Under normal navigation, repeated route changes SHOULD reduce upstream GitHub API calls by at least 60% compared to no-cache baseline.
- Performance: Cache TTL MUST be configurable and default to a short bounded window suitable for operational freshness.
- Security: Secrets MUST NOT be accepted from URL query parameters.
- Security: Unauthorized revalidation attempts MUST be auditable via status codes and logs without disclosing secret values.

## Acceptance Criteria
- No unintended reload/re-render loop is observed from provider lifecycle alone.
- Salones API demonstrates cache-hit behavior and TTL-based refresh behavior.
- Revalidate accepts valid Bearer header and rejects query-secret flow.
- Data-load failures show non-blocking warning while dashboard remains usable.

---

## Change 2 — `ux-persistencia-y-scatter`
### Capability: `dashboard-analysis-persistence` (NEW)

## Functional Requirements

### Requirement: Cross-page salon selection persistence
The dashboard MUST persist `selectedSalonId` in shared dashboard state so selection is preserved across dashboard sections during the same session.

#### Scenario: Preserve selected salon across sections
- GIVEN a user selects salon A in Performance
- WHEN the user navigates to Benchmarking/Efficiency/Contracts
- THEN salon A remains the active selection context

#### Scenario: Invalid persisted salon
- GIVEN persisted selected salon no longer exists in loaded data
- WHEN the dashboard hydrates shared state
- THEN selection is cleared safely
- AND the UI falls back to unselected mode

### Requirement: Comparative scatter behavior
The Performance scatter chart MUST display all eligible salons and SHALL visually emphasize the currently selected salon while keeping peers visible for comparison.

#### Scenario: No selection
- GIVEN no salon is selected
- WHEN the Performance page renders scatter
- THEN all eligible salons are plotted with neutral emphasis

#### Scenario: Selected salon highlight
- GIVEN a salon is selected
- WHEN the scatter renders
- THEN all eligible salons remain visible
- AND the selected salon is visually highlighted

### Requirement: Conversion rate persistence
The dashboard MUST persist user-updated `conversionRate` across reloads for the same browser context.

#### Scenario: Reload keeps conversion rate
- GIVEN the user sets a custom conversion rate
- WHEN the page reloads
- THEN the previously set rate is restored and applied

## Non-Functional Requirements
- UX consistency: Shared selection and conversion rate persistence SHOULD remove repetitive user input between page transitions and reloads.
- Performance: Scatter rendering with all eligible salons MUST remain responsive for expected dataset size.
- Security/Privacy: Persisted UX preferences MUST exclude secrets and authentication tokens.

## Acceptance Criteria
- Selected salon context is preserved across dashboard sections.
- Scatter shows all salons and clearly highlights selected salon without hiding peers.
- Custom conversion rate survives reload and is reapplied.
- Invalid persisted state is handled gracefully without runtime errors.

---

## Change 3 — `restyle-dashboard`
### Capability: `dashboard-visual-brand` (ADDED)

## Functional Requirements

### Requirement: Premium brand visual theme
The dashboard UI MUST apply a premium burgundy-and-gold visual theme across shell and page surfaces, and MUST remove prior blue/cyan/purple tech-oriented accent styling from dashboard-facing views.

#### Scenario: Premium theme on dashboard shell and panels
- GIVEN a user opens `/dashboard`
- WHEN the shell and dashboard content render
- THEN primary surfaces use the warm dark brand palette
- AND actionable accents and headings use burgundy/gold styling

#### Scenario: Legacy tech accents are not present
- GIVEN dashboard routes are rendered after the restyle change
- WHEN a visual audit checks reusable shell and page components
- THEN blue/cyan/purple accent classes from the previous style are not used for brand accents

### Requirement: Functional semantics remain unchanged
The dashboard restyle MUST preserve all functional data behavior and MUST NOT change semantic meaning of status indicators, including semaphore/status colors used for operational states.

#### Scenario: Restyle does not change data behavior
- GIVEN existing dashboard filters, selectors, and charts
- WHEN users interact with dashboard features after the restyle
- THEN all behaviors and calculated outputs remain functionally equivalent to pre-restyle behavior

#### Scenario: Status semantics stay distinct
- GIVEN status or semaphore indicators are shown in dashboard views
- WHEN the restyled theme is applied
- THEN each status keeps its prior semantic color mapping
- AND status meaning remains distinguishable from decorative brand accents

### Requirement: Branded heading typography with readable data text
The dashboard SHOULD apply a display font to section headings for brand expression, while body, data, and control text MUST remain readability-focused and operationally clear on dark surfaces.

#### Scenario: Heading accent typography applied
- GIVEN a dashboard section title is rendered
- WHEN typography styles are applied
- THEN the heading uses the configured display accent font
- AND adjacent data labels continue using readable UI text styling

#### Scenario: Readability preserved in dense data panels
- GIVEN KPI cards, tables, and chart labels are visible
- WHEN text appears on warm dark backgrounds
- THEN body/data text contrast is sufficient for normal dashboard use
- AND decorative typography does not reduce legibility of operational information

---

## Change 4 — `google-ratings-cache-7d-ttl`
### Capability: `google-ratings-cache-resilience` (NEW)

## Functional Requirements

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

## Non-Functional Requirements
- Performance: Cache hits within 7-day TTL MUST avoid any Google Places API calls.
- Reliability: Stale cache fallback ensures availability during Google outages.
- Observability: Structured logs enable debugging without exposing API secrets.

## Acceptance Criteria
- Requests within 7 days return cached data without calling Google.
- Rate-limit errors return stale cache if available.
- Missing API key logs warning but returns non-blocking unavailable state.
- Concurrent cache writes are atomic through Prisma upsert.
