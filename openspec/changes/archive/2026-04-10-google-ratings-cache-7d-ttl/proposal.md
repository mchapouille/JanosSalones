# Proposal: Google Ratings Cache con TTL de 7 días

## Intent

Reducir latencia/costo de Google Places y aumentar resiliencia del panel de reputación usando caché persistente en PostgreSQL. La API debe priorizar datos cacheados y solo mostrar error al usuario cuando no exista fallback útil.

## Scope

### In Scope
- Implementar estrategia cache-first en `GET /api/google-ratings` con TTL fijo de 7 días (`7 * 24 * 60 * 60 * 1000`).
- Persistir/leer caché en Prisma (`GoogleRatingsCache`) con campos: `id_salon`, `google_rating`, `review_count`, `cached_at`, `expires_at`, `google_place_name`, `formatted_address`.
- Definir comportamiento de fallback: cache válido, cache expirado, cache ausente, rate-limit de Google y API key faltante.
- Registrar errores/warnings de upstream en logs de servidor para debugging en producción.

### Out of Scope
- Cambios de UI/estilos del panel más allá del mensaje de error existente.
- Invalidación manual desde dashboard o job de limpieza periódica.
- Cambio de proveedor externo (solo Google Places).

## Capabilities

### New Capabilities
- `google-ratings-cache-resilience`: caché persistente con TTL, fallback inteligente y logging operativo para ratings de Google.

### Modified Capabilities
- `dashboard`: ajustar contrato de error en reputación para mostrar "No se pudo cargar..." únicamente cuando fallen caché y API.

## Approach

Usar una única ruta API cache-first: (1) leer `GoogleRatingsCache` por `id_salon`; (2) si `expires_at > now`, devolver caché; (3) si no existe/expiró, consultar Google Places, mapear respuesta y upsert con `cached_at=now` y `expires_at=now+7d`; (4) si Google falla por rate-limit, devolver caché existente aunque esté expirado; (5) si falta API key, log warning y responder estado no bloqueante sin error visible al usuario.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/src/app/api/google-ratings/route.ts` | Modified | Flujo cache-first, fallback por expiración/rate-limit y logging de errores. |
| `app/prisma/schema.prisma` | Referenced | Modelo `GoogleRatingsCache` y campos contractuales de caché. |
| `app/src/context/DashboardContext.tsx` | Modified | Regla de graceful error: solo mostrar mensaje cuando cache+API fallen. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Datos stale por TTL largo | Med | Marcar `cached_at`/`expires_at` en payload interno para observabilidad. |
| Sobrecarga por misses simultáneos | Med | Upsert atómico por `id_salon` y flujo determinista por request. |
| Errores upstream silenciosos | Low | Logging estructurado con contexto (`salonId`, status, tipo de fallo). |

## Rollback Plan

Revertir cambios en `route.ts` y `DashboardContext.tsx` para volver al flujo sin caché. Mantener tabla/modelo sin uso activo (compatible hacia atrás) o remover en cambio posterior controlado.

## Dependencies

- Prisma + Supabase operativos (ya configurados).
- Variable de entorno de Google Places en servidor.

## Success Criteria

- [ ] Requests dentro de 7 días reutilizan caché y evitan llamada a Google.
- [ ] Miss/expiración refresca caché con `expires_at = now + 7 días`.
- [ ] En rate-limit de Google se retorna caché expirado si existe.
- [ ] Si falta API key se loggea warning sin error visible al usuario.
- [ ] Mensaje "No se pudo cargar..." aparece solo cuando fallan caché y API.
