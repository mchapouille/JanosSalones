# Tasks: Google Places Ratings en Dashboard

## Phase 1: Foundation / Contracts

- [x] 1.1 Agregar `GOOGLE_PLACES_API_KEY=...` en `.env.local` de forma manual y verificar que NO use prefijo `NEXT_PUBLIC_` ni se commitee.
- [x] 1.2 Crear `app/src/lib/google-ratings.ts` con la interfaz compartida `GoogleRating` y el contrato de respuesta usado por API, context y UI.

## Phase 2: Backend / API Route

- [x] 2.1 Crear `app/src/app/api/google-ratings/route.ts` con handler `GET`, lectura de `searchParams`, validación de `salonId` y respuestas `400`/`404` tipadas.
- [x] 2.2 Resolver el salón desde `app/src/lib/salones_data.json`, construir `textQuery` con nombre/dirección/municipio y armar `locationBias` usando `lat_salon`/`lon_salon` cuando existan.
- [x] 2.3 Llamar `POST https://places.googleapis.com/v1/places:searchText` con `process.env.GOOGLE_PLACES_API_KEY`, `maxResultCount: 1` y field mask mínima para `rating`, `userRatingCount` y `displayName`.
- [x] 2.4 Normalizar la respuesta del endpoint a `{ salonId, nombreSalon, rating, reviewCount, googlePlaceName }`, devolviendo `rating: null` y `reviewCount: 0` en no-match o zero-reviews.
- [x] 2.5 Manejar fallas upstream y red con `502 { error: "Google Places API unavailable" }`, sin exponer la key en body, headers ni logs de respuesta.

## Phase 3: Frontend / Dashboard Context

- [x] 3.1 Extender `app/src/components/DashboardContext.tsx` con `ratings`, `ratingsLoading`, `ratingsError` y tipos derivados de `GoogleRating`.
- [x] 3.2 Agregar en `DashboardContext.tsx` la función para pedir `/api/google-ratings?salonId={id}` por salón y una carga agregada (`Promise.all`/`allSettled`) que solo corra una vez por carga del panel.
- [x] 3.3 Guardar resultados parciales sin romper el dashboard completo: un fallo individual no debe vaciar `salones` ni bloquear el resto de ratings.

## Phase 4: Frontend / UI Integration

- [x] 4.1 Crear `app/src/components/GoogleRatingsPanel.tsx` como client component que consuma `useDashboard`, dispare la carga lazy al montarse y renderice loading, error y estado sin presencia.
- [x] 4.2 Renderizar en `GoogleRatingsPanel.tsx` una tabla/lista semántica ordenada por `rating` descendente, con `null` al final, mostrando nombre del salón, estrellas/rating y cantidad de reseñas.
- [x] 4.3 Integrar `<GoogleRatingsPanel />` al final de `app/src/app/dashboard/page.tsx` y aplicar clases Tailwind alineadas con los paneles premium existentes del dashboard.

## Phase 5: Verification

- [x] 5.1 Ejecutar `tsc --noEmit` en `app/` para validar tipos en la nueva ruta, el contexto y el panel.
- [ ] 5.2 Ejecutar `eslint app/src/` para confirmar que la integración no introduce errores de lint.
- [ ] 5.3 Verificar manualmente los escenarios del spec: happy path, salón sin match, `salonId` faltante, salón inexistente y error upstream no bloqueante en el panel.

## Phase 6: Rediseño Top/Low + Debug de Matching

- [x] 6.1 Mejorar `app/src/app/api/google-ratings/route.ts` con intentos de búsqueda, logging de query/status/candidato y debug payload en no-match/falla upstream.
- [x] 6.2 Actualizar `app/src/components/DashboardContext.tsx` para cargar ratings de todos los salones y ordenar por `rating desc` + `reviewCount desc`.
- [x] 6.3 Rediseñar `app/src/components/GoogleRatingsPanel.tsx` en dos listas (`Top 5` / `Low 5`) con `Ver más`/`Ver menos`, estrellas visuales y footer de salones sin presencia.

## Phase 7: Ponderación + Diagnóstico de Faltantes

- [x] 7.1 Implementar `calculateWeightedScore(rating, reviewCount)` en `app/src/components/DashboardContext.tsx` con fórmula ponderada (rating peso 10, reseñas peso 1) para ordenar ranking.
- [x] 7.2 Actualizar `app/src/components/GoogleRatingsPanel.tsx` para mostrar disclaimer, aplicar filtro `reviewCount >= 10` y calcular `Top 5`/`Low 5` con score ponderado.
- [x] 7.3 Extender `app/src/app/api/google-ratings/route.ts` con logging estructurado de no-match/upstream y modo diagnóstico temporal (`diagnostic=1`) que devuelve salones fallidos con queries intentadas.
- [x] 7.4 Mejorar estrategia de matching en API route con intentos por dirección completa, calle sin número y variaciones de provincia (`Buenos Aires`, `GBA`, `Provincia de Buenos Aires`).
- [ ] 7.5 Verificar manualmente con API key real que los 31 salones faltantes se reduzcan solo a casos sin presencia genuina en Google.

## Phase 8: Matching estable + Orden directo por rating

- [x] 8.1 Corregir `app/src/app/api/google-ratings/route.ts` para no marcar `failedReason: "no-match"` cuando Google sí devuelve `found: true` pero `userRatingCount` es 0/ausente.
- [x] 8.2 Ajustar `app/src/components/DashboardContext.tsx` para reconstruir `ratings` respetando el orden original de `salones` tras `Promise.allSettled`.
- [x] 8.3 Cambiar ranking de `app/src/components/GoogleRatingsPanel.tsx` a orden directo por `rating` (Top desc / Low asc), manteniendo filtro mínimo de 10 comentarios.
