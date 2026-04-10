# dashboard-google-ratings Specification

## Purpose

Define behavior of the Google Places ratings integration: the server-side API route that queries Places API (New) and the dashboard panel that displays rating and review count per salon.

---

## Requirements

### Requirement: Google Ratings API Route

The system MUST expose a server-side route `GET /api/google-ratings?salonId={id}` that resolves the salon's Google Places entry and returns its rating and review count without exposing the API key to the client.

#### Scenario: Happy path — salon found with rating

- GIVEN a valid `salonId` that maps to a salon in `salones_data.json`
- WHEN `GET /api/google-ratings?salonId={id}` is called
- THEN the response is `200` with `{ salonId, nombreSalon, rating, reviewCount, googlePlaceName }`
- AND `rating` is a number between 1 and 5
- AND `reviewCount` is a positive integer

#### Scenario: Salon found but no Google presence

- GIVEN a valid `salonId` whose salon name/address yields no Places API match
- WHEN `GET /api/google-ratings?salonId={id}` is called
- THEN the response is `200` with `{ salonId, nombreSalon, rating: null, reviewCount: 0, googlePlaceName: null }`

#### Scenario: Salon found but zero reviews

- GIVEN a Places match exists for the salon but `userRatingCount` is 0 or absent
- WHEN `GET /api/google-ratings?salonId={id}` is called
- THEN the response is `200` with `rating: null, reviewCount: 0`

#### Scenario: Unknown salonId

- GIVEN a `salonId` that does not exist in `salones_data.json`
- WHEN `GET /api/google-ratings?salonId={id}` is called
- THEN the response is `404` with `{ error: "Salon not found" }`

#### Scenario: Missing salonId param

- GIVEN a request to `/api/google-ratings` with no `salonId` query param
- WHEN the route handler processes the request
- THEN the response is `400` with `{ error: "salonId is required" }`

#### Scenario: Places API upstream error

- GIVEN the Google Places API returns a non-2xx response or network failure
- WHEN the route handler calls the upstream API
- THEN the response is `502` with `{ error: "Google Places API unavailable" }`
- AND the API key MUST NOT appear in the error body or response headers

---

### Requirement: Google API Key Confidentiality

The route MUST use the Google API key exclusively from a server-side environment variable and MUST NOT expose it in any client-visible response, header, or bundle.

#### Scenario: Key never leaves server

- GIVEN any client request to `/api/google-ratings`
- WHEN the route executes and responds
- THEN no response body, header, or redirect URL contains the Google API key value

---

### Requirement: Google Ratings Dashboard Panel

The dashboard page MUST render a "Reputación en Google" panel at the bottom of `/dashboard`, displaying all salons with their rating and review count, sorted descending by rating.

#### Scenario: Panel renders with ratings data

- GIVEN the dashboard loads and ratings data is available for all salons
- WHEN the panel section renders
- THEN each salon row shows: salon name, star rating (1–5), and review count
- AND rows are ordered from highest to lowest rating
- AND salons with `rating: null` appear last

#### Scenario: Salon without Google presence

- GIVEN at least one salon returned `rating: null` from the ratings route
- WHEN the panel renders that salon's row
- THEN the rating column shows "Sin presencia" or "N/A"
- AND the review count shows 0 or "—"

#### Scenario: Panel loading state

- GIVEN the dashboard page has mounted and ratings data is still being fetched
- WHEN the panel section renders before data resolves
- THEN a loading indicator is displayed inside the panel
- AND the rest of the dashboard content remains visible and interactive

#### Scenario: Panel graceful error state

- GIVEN the `/api/google-ratings` call failed for one or more salons
- WHEN the panel renders
- THEN a non-blocking error message is shown inside the panel (e.g. "No se pudo cargar la reputación")
- AND the dashboard does NOT throw or blank entirely

---

### Requirement: Single Fetch per Panel Load

The system MUST fetch ratings data at most once per dashboard page load or explicit user action, without polling or automatic refresh.

#### Scenario: No polling after initial load

- GIVEN the dashboard panel has loaded ratings data
- WHEN time passes without user interaction
- THEN no additional calls to `/api/google-ratings` are made automatically

#### Scenario: Ratings fetched on mount

- GIVEN the user navigates to `/dashboard`
- WHEN the page mounts and the ratings panel initializes
- THEN ratings for all salons are fetched (individual or batched) once
- AND results are stored in shared dashboard state

---

## Non-Functional Requirements

- **Security**: Google API key MUST NOT appear in client bundles or responses.
- **Resilience**: A single failing salon lookup MUST NOT prevent other salons' ratings from rendering.
- **Performance**: Total fetch time for all salon ratings SHOULD complete within reasonable time for typical dataset size (< 20 salons).
- **Accessibility**: The panel MUST use semantic HTML (table or list) with readable contrast on the dark brand background.
