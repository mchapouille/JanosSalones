# Proposal: Mejoras Dashboard

## Problem Statement

El dashboard tiene dos problemas prioritarios: (1) re-fetch/re-render excesivo y llamadas sin caché a GitHub API (estabilidad, performance, rate limits); (2) fricción de UX por pérdida de contexto entre páginas y un scatter poco comparativo. Además, el secret de revalidate viaja por query string.

## Scope

### In Scope
- Implementar `fix-context-api-cache`:
  - estabilizar `DashboardContext`;
  - agregar caché/TTL en `api/salones`;
  - mover secret de revalidate a header `Authorization`;
  - agregar estado de error no bloqueante.
- Implementar `ux-persistencia-y-scatter`:
  - persistir `selectedSalonId` en `DashboardContext`;
  - mejorar scatter de Performance con todos los salones y resaltado del seleccionado;
  - persistir `conversionRate` en `localStorage`.

### Out of Scope
- Migración de autenticación/usuarios.
- Refactors no críticos no vinculados a estos dos cambios.
- Rediseño visual completo del dashboard.

## Capabilities

### New Capabilities
- `dashboard-data-resilience`: carga de datos con caché, manejo de error visible y revalidación segura por header.
- `dashboard-analysis-persistence`: persistencia de salón/tipo de cambio y scatter comparativo multi-salón.

### Modified Capabilities
- None (no hay `openspec/specs/` base en este repositorio aún).

## Approach

Aplicar dos bloques: primero resiliencia técnica (context + API cache + seguridad + error state), luego UX analítica (persistencia y scatter). Se prioriza compatibilidad incremental para evitar ruptura de páginas.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/src/components/DashboardContext.tsx` | Modified | Estado global, persistencia y manejo de errores |
| `app/src/app/api/salones/route.ts` | Modified | Estrategia de caché/TTL |
| `app/src/app/api/revalidate/route.ts` | Modified | Secret por header + validaciones |
| `app/src/app/dashboard/performance/page.tsx` | Modified | Scatter comparativo multi-salón |
| `app/src/app/dashboard/*/page.tsx` | Modified | Consumo de selección persistida |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Ruptura de contrato de `useDashboard()` | Med | Extensión backward-compatible + validación en todas las páginas |
| Caché sirviendo datos viejos | Med | TTL corto + endpoint de revalidate operativo |
| Scatter con sobreposición visual | Med | Opacidad, tamaño de punto y resaltado consistente |

## Rollback Plan

Revertir `DashboardContext` y rutas API al commit previo; volver a `no-store`, estado local por página y query secret.

## Dependencies

- Variables de entorno válidas para revalidate secret.
- Runtime Next.js con `fetch` revalidate/cache.

## Success Criteria

- [ ] No hay loops/re-fetches no intencionales al montar o actualizar dashboard.
- [ ] Requests a GitHub API se reducen significativamente bajo navegación normal.
- [ ] Revalidate solo acepta secret por header válido; query secret queda fuera de flujo.
- [ ] Usuario mantiene salón seleccionado y conversionRate tras navegar/recargar.
- [ ] Scatter de Performance muestra comparación entre salones y destaca el seleccionado.
