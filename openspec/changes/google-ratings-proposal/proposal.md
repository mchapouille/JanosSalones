# Proposal: Google Places Ratings en Dashboard

## Intent

Mostrar rating promedio y cantidad de reseñas de Google Places por salón para comparar reputación online dentro del dashboard y apoyar decisiones de operación/comercial.

## Scope

### In Scope
- Crear API Route `app/src/app/api/google-ratings/route.ts` que reciba `salonId` y retorne `rating` + `userRatingCount`.
- Resolver salón objetivo desde `src/lib/salones_data.json` (`nombre_salon`, `direccion_salon`, `municipio_salon`, `lat_salon`, `lon_salon`) para construir búsqueda.
- Agregar panel al final de `app/src/app/dashboard/page.tsx` con rating (1-5) y total de reviews por salón.
- Integrar consumo vía `DashboardContext.tsx` para estado compartido en dashboard.

### Out of Scope
- Comentarios/reseñas individuales de Google.
- Estrategias de cache persistente o revalidación avanzada.
- Edición manual de matching en UI (corrección de lugar ambiguo).

## Capabilities

### New Capabilities
- `dashboard-google-ratings`: consulta server-side a Google Places (New) y exposición de rating + cantidad de reseñas por salón en el dashboard.

### Modified Capabilities
- None.

## Approach

API server-side (sin llamada directa desde cliente a Google). En `POST /api/google-ratings`, usar Text Search (Places API New) con `textQuery = "${nombre_salon} ${direccion_salon} ${municipio_salon}"` y `locationBias` por `lat/lon` del salón. Solicitar solo campos `rating` y `userRatingCount`; si no hay match válido, responder `null/0` controlado.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/src/app/api/google-ratings/route.ts` | New | Endpoint server-side para consulta Places New por `salonId`. |
| `app/src/app/dashboard/page.tsx` | Modified | Render del panel final con rating y total de reviews. |
| `app/src/context/DashboardContext.tsx` | Modified | Estado/carga de Google ratings para consumo compartido. |
| `app/src/lib/salones_data.json` | Referenced | Fuente de identidad y ubicación por salón. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Matching ambiguo devuelve otro negocio | Med | Combinar nombre+dirección+municipio y `locationBias`; fallback a estado “sin dato”. |
| Salón sin presencia en Google Places | High | Normalizar respuesta vacía (`rating: null`, `count: 0`) y UI explícita. |
| Costo por request (~0.032-0.04 USD) | Med | Limitar a una consulta por interacción requerida (sin polling). |

## Rollback Plan

Revertir ruta `/api/google-ratings` y panel en `/dashboard`; mantener `DashboardContext` sin el estado de ratings, restaurando comportamiento previo sin impacto a flujos existentes.

## Dependencies

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` disponible en entorno local.
- Google Places API (New) habilitada en el proyecto GCP.

## Success Criteria

- [ ] El dashboard muestra rating (1-5) y total de reviews por salón al final de la página principal.
- [ ] Para salones sin match, UI muestra estado controlado sin error runtime.
- [ ] Endpoint `/api/google-ratings` responde únicamente con `rating` + `userRatingCount` (o `null/0`).
- [ ] No se exponen keys de Google en llamadas client-side directas.
