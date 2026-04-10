## Implementation Progress

**Change**: google-ratings-proposal  
**Mode**: Standard (strict_tdd: false)

### Completed Tasks
- [x] 6.1 Mejorar `route.ts` con debug de matching (query/status/candidato) y fallback de búsqueda.
- [x] 6.2 Ajustar `loadGoogleRatings` para incluir todos los salones y ordenar por `rating` desc + `reviewCount` desc.
- [x] 6.3 Rediseñar panel con `Top 5` / `Low 5`, expansión por sección y footer de salones sin presencia.
- [x] 7.1 Implementar score ponderado `calculateWeightedScore` en `DashboardContext` para ranking.
- [x] 7.2 Aplicar filtro `reviewCount >= 10` + disclaimer en panel Top/Low.
- [x] 7.3 Agregar logging estructurado de no-match/upstream y modo diagnóstico `diagnostic=1`.
- [x] 7.4 Incorporar matching por dirección, calle sin número y variaciones de provincia.
- [x] 8.1 Corregir `failedReason` en `route.ts`: match con `reviewCount=0` ahora se considera encontrado (sin rating) y no `no-match`.
- [x] 8.2 Reconstruir `ratings` en `DashboardContext` según el orden original de `salones` después de `Promise.allSettled`.
- [x] 8.3 Cambiar el ranking del panel a orden directo por `rating` (Top desc / Low asc), sin score ponderado.
- [x] Hotfix: Diferenciar `rating: null` (no-match) de `rating: 0` (match sin reseñas) para evitar falsos "Sin presencia".

### Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `app/src/app/api/google-ratings/route.ts` | Modified | Se agregaron intentos de búsqueda, logs de debug por intento, fallback query y payload de debug en no-match/errores upstream. |
| `app/src/components/DashboardContext.tsx` | Modified | Se removió el filtro a salones activos para la carga de ratings y se agregó ordenamiento centralizado por ranking. |
| `app/src/components/GoogleRatingsPanel.tsx` | Modified | Se reemplazó tabla única por dos listas (`Top 5`/`Low 5`) con toggle `Ver más`/`Ver menos`, estrellas de texto y bloque de sin presencia. |
| `openspec/changes/google-ratings-proposal/tasks.md` | Modified | Se añadió Phase 6 y se marcaron tareas 6.1–6.3 como completadas. |
| `openspec/changes/google-ratings-proposal/tasks.md` | Modified | Se añadió Phase 7 con ponderación + diagnóstico y se marcaron tareas 7.1–7.4 como completadas. |
| `app/src/app/api/google-ratings/route.ts` | Modified | Se corrigió clasificación de fallo: cuando hay `place` encontrado con reseñas cero/ausentes devuelve 200 con `rating: null`, sin marcar `no-match`. |
| `app/src/components/DashboardContext.tsx` | Modified | Se eliminó ordenamiento por score ponderado y se conserva orden estable según `salones` al mapear resultados de `allSettled`. |
| `app/src/components/GoogleRatingsPanel.tsx` | Modified | Se reemplazó ranking ponderado por orden directo de calificación y se ajustó copy del encabezado. |
| `openspec/changes/google-ratings-proposal/tasks.md` | Modified | Se añadió Phase 8 y se marcaron tareas 8.1–8.3 como completadas. |
| `app/src/app/api/google-ratings/route.ts` | Modified | Cuando hay match con `reviewCount=0`, ahora responde `rating: 0` (numérico) en lugar de `null`; `null` queda reservado para no-match real. |
| `app/src/components/GoogleRatingsPanel.tsx` | Modified | Se ajustaron filtros: ranking usa `rating !== null && rating > 0`, y "Sin presencia" cuenta solo `rating === null`. |

### Deviations from Design
No hay desvíos nuevos. Se revierte específicamente la decisión de ponderación en UI para cumplir criterio de negocio: orden directo por rating.

### Issues Found
- `eslint src` mantiene 16 warnings preexistentes (0 errores).
- Falta validación manual en navegador para confirmar mejoras de matching con salones reportados.

### Remaining Tasks
- [ ] 5.3 Verificación manual end-to-end de escenarios de spec.
- [ ] 7.5 Validación manual de salones sin rating con API key real para separar no-match vs sin presencia genuina.

### Status
23/25 tareas completas en `tasks.md`. Ready for verify (con validación manual pendiente).
