# Delta for Dashboard

## MODIFIED Requirements

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
