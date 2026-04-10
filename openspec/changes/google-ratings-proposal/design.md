# Design: Google Places Ratings en Dashboard

## Technical Approach

Server-side API route queries Google Places (New) Text Search per-salon using `nombre_salon + direccion_salon + municipio_salon` as `textQuery` and lat/lon `locationBias`. The panel in `/dashboard` fetches all salons lazily on mount (one request per salon), stores results in `DashboardContext`, and renders a sorted table at the bottom of the page. The Google API key lives exclusively in a server-only env var (`GOOGLE_PLACES_API_KEY`) — never exposed to the client bundle.

---

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| **Fetch strategy** | Per-salon individual requests | Batch endpoint | Simpler implementation; dataset < 20 salons; resilience: one failure doesn't block others |
| **API key env var** | `GOOGLE_PLACES_API_KEY` (no `NEXT_PUBLIC_` prefix) | Reuse `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `NEXT_PUBLIC_` leaks key into client bundle via Next.js env exposure |
| **State ownership** | `DashboardContext` (new `ratings` slice) | Local state in panel component | Consistent with existing pattern (`salones`, `salonesLoading`); avoids refetch on re-render |
| **Load timing** | Lazy on panel mount (`useEffect`) | Eager on dashboard mount | Isolates performance impact; ratings panel is at page bottom, not critical path |
| **Places API method** | Text Search (New) — `POST /v1/places:searchText` | Nearby Search, Place Search (legacy) | Text Search accepts free-text + locationBias in one call; no place_id resolution needed |

---

## Data Flow

```
Client (DashboardContext)
  │  mount + authenticated
  ▼
GoogleRatingsPanel (useEffect on mount)
  │  fetchAllRatings() — parallel Promise.all
  ▼
GET /api/google-ratings?salonId={id}    (one per salon)
  │
  ├─ Read salones_data.json → find salon by id_salon
  ├─ Build textQuery: "nombre_salon direccion_salon municipio_salon"
  ├─ POST https://places.googleapis.com/v1/places:searchText
  │    headers: X-Goog-Api-Key: process.env.GOOGLE_PLACES_API_KEY
  │    body: { textQuery, locationBias, maxResultCount: 1,
  │            fieldMask: "places.rating,places.userRatingCount,places.displayName" }
  └─ Return: { salonId, nombreSalon, rating, reviewCount, googlePlaceName }

DashboardContext ← stores GoogleRatingResult[]
  │
  ▼
GoogleRatingsPanel renders sorted table (desc by rating; nulls last)
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/google-ratings/route.ts` | Create | GET handler — resolves salon, calls Places API, returns rating |
| `src/components/DashboardContext.tsx` | Modify | Add `ratings`, `ratingsLoading`, `ratingsError` slice |
| `src/app/dashboard/page.tsx` | Modify | Append `<GoogleRatingsPanel />` at bottom |
| `src/components/GoogleRatingsPanel.tsx` | Create | Client component — fetches on mount, renders sorted table |
| `.env.local` | Modify (manual) | Add `GOOGLE_PLACES_API_KEY=...` (server-only) |

---

## Interfaces / Contracts

```typescript
// API response shape — GET /api/google-ratings?salonId={id}
interface GoogleRatingResponse {
  salonId: number;
  nombreSalon: string;
  rating: number | null;          // 1.0–5.0 or null if no match
  reviewCount: number;            // 0 if no match
  googlePlaceName: string | null; // displayName from Places API or null
}

// Error responses
// 400: { error: "salonId is required" }
// 404: { error: "Salon not found" }
// 502: { error: "Google Places API unavailable" }

// DashboardContext additions
interface DashboardContextType {
  // ... existing fields ...
  ratings: GoogleRatingResult[];
  ratingsLoading: boolean;
  ratingsError: string | null;
}

// Stored in context (same as API response, aliased)
type GoogleRatingResult = GoogleRatingResponse;
```

---

## Sequence: API Route Internal Flow

```
GET /api/google-ratings?salonId=5
  1. Validate: salonId present → else 400
  2. Load salones_data.json (static import, no I/O cost)
  3. Find salon by id_salon → else 404
  4. Build textQuery = `${nombre_salon} ${direccion_salon} ${municipio_salon}`
  5. Build locationBias = { circle: { center: { lat, lng }, radius: 500 } }
     (skip if lat_salon / lon_salon are null)
  6. POST to Places API (New) with fieldMask
  7. On HTTP error → 502
  8. On empty results → { rating: null, reviewCount: 0, googlePlaceName: null }
  9. On match → extract places[0].rating, places[0].userRatingCount
 10. Return 200 JSON
```

---

## Testing Strategy

No test runner available (`strict_tdd: false` per config). Quality gates:

| Gate | What | How |
|------|------|-----|
| Type safety | Full type coverage, no `any` | `tsc --noEmit` |
| Lint | ESLint next/core-web-vitals | `eslint src/` |
| Manual | Happy path, no-match, error states | Manual browser verification |

---

## Migration / Rollout

No migration required. New files only; rollback = delete `src/app/api/google-ratings/route.ts`, `src/components/GoogleRatingsPanel.tsx`, and revert `DashboardContext.tsx` + `dashboard/page.tsx` diff.

---

## Open Questions

- [ ] Is `GOOGLE_PLACES_API_KEY` already provisioned in the Vercel project env, or does it need to be added?
- [ ] Should the panel show ALL salons (including DEVUELTOS/OBRA) or only ACTIVO ones?
