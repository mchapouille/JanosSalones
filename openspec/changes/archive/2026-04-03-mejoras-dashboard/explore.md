# Exploration: mejoras-dashboard

## Exploration Date
2026-04-03

## Current State

Janos Salones Dashboard es un dashboard BI/auditoría construido en Next.js 16 (App Router) con TypeScript 5, Tailwind CSS 4, y NextAuth.js (v5 beta). Los datos provienen de un archivo JSON estático (`salones_data.json`) generado por un script Python que lee un Excel de Google Drive. La aplicación corre en Vercel y tiene 5 secciones: Dashboard principal, Performance, Benchmarking, Eficiencia, y Contratos.

### Arquitectura actual
- **Auth**: NextAuth.js con estrategia JWT + `auth()` en server components para proteger rutas
- **Data**: JSON estático local + fetch a GitHub API en runtime para datos frescos
- **State**: `DashboardContext` centraliza salones, conversionRate, y estado UI
- **Refresh**: Botón manual que dispara un GitHub Actions workflow en producción, o ejecuta un script Python localmente
- **Rendering**: Todas las páginas del dashboard son `"use client"` (Client Components)

---

## Affected Areas

- `app/src/app/dashboard/page.tsx` — Dashboard principal (~508 líneas)
- `app/src/app/dashboard/performance/page.tsx` — Performance, 695 líneas
- `app/src/app/dashboard/benchmarking/page.tsx` — Benchmarking, 433 líneas
- `app/src/app/dashboard/efficiency/page.tsx` — Eficiencia, 225 líneas
- `app/src/app/dashboard/contracts/page.tsx` — Contratos, 438 líneas
- `app/src/app/api/salones/route.ts` — API de datos (fetch a GitHub)
- `app/src/app/api/refresh-data/route.ts` — Trigger de GitHub Actions
- `app/src/app/api/revalidate/route.ts` — Webhook de revalidación
- `app/src/lib/calculations.ts` — Lógica de negocio (semáforos, scores)
- `app/src/lib/sample-data.ts` — Mapeo de datos y tipos
- `app/src/lib/formatters.ts` — Formatters (ARS, %, número)
- `app/src/components/DashboardContext.tsx` — Estado global
- `app/src/components/DashboardShell.tsx` — Shell/sidebar
- `app/src/components/GoogleMapView.tsx` — Mapa Google Maps
- `app/src/components/PredictiveSearch.tsx` — Búsqueda predictiva
- `app/src/auth.ts` — Configuración NextAuth

---

## Improvement Opportunities

### 1. ⚠️ Dependencia infinita en `useEffect` del DashboardContext
**Archivo**: `app/src/components/DashboardContext.tsx`
**Riesgo**: 🔴 Alto
**Prioridad**: 1 (Crítico)

```tsx
// ❌ Problema: reloadSalones está en el dep array pero cambia en cada render
// porque usa `salones` como fallback — esto puede causar re-fetches infinitos
const reloadSalones = useCallback(async (): Promise<SalonIntegral[]> => {
    // ... usa `salones` en el return del catch
}, [salones]);  // <-- salones en deps => reloadSalones se recrea siempre

useEffect(() => {
    reloadSalones();
}, [reloadSalones]);  // <-- re-ejecuta en cada cambio de salones
```

**Impacto**: En teoría, cada vez que se actualiza el estado `salones`, `reloadSalones` se recrea, lo que triggerearía otro `useEffect`, creando un potencial loop. En la práctica, React puede estar batching estos, pero es un bug latente.

**Fix propuesto**: Usar `useRef` para el fallback, o `useCallback` con deps vacías y eliminar el fallback desde `salones`.

---

### 2. ⚠️ API de salones hace un fetch a GitHub en cada request sin caché
**Archivo**: `app/src/app/api/salones/route.ts`
**Riesgo**: 🔴 Alto (performance + rate limiting)
**Prioridad**: 2

```ts
const res = await fetch(GITHUB_API_URL, {
    headers,
    cache: "no-store", // Never cache — always get the latest committed JSON
});
```

**Impacto**: Cada usuario que abre el dashboard genera un fetch HTTP a la GitHub API. Con múltiples usuarios concurrentes o navegaciones entre páginas (que llaman `reloadSalones()`), esto puede:
1. Agotar el rate limit de GitHub (5000 req/hora con PAT, 60 sin)
2. Ralentizar la experiencia (round-trip a GitHub en cada carga)
3. Los datos no cambian con frecuencia — están sincronizados solo cuando se dispara el workflow

**Fix propuesto**:
- Opción A: Server-side cache con TTL (5 min): `cache: "force-cache"` + `next: { revalidate: 300 }`
- Opción B: In-memory cache en la route con Map + timestamp
- Opción C: Leer desde el archivo JSON local en runtime (que ya existe y es el fallback) y revalidarlo con el webhook existente

---

### 3. ⚠️ Duplicación de lógica de score/label entre páginas
**Archivos**: `dashboard/page.tsx`, `performance/page.tsx`
**Riesgo**: 🟡 Medio (mantenibilidad)
**Prioridad**: 3

Las funciones `getIpScoreLabel()` y `getIpScoreColor()` están definidas **dos veces** de forma idéntica: una vez en `dashboard/page.tsx` y otra en `performance/page.tsx`. Además, la lógica de color/label de semáforos está parcialmente replicada en múltiples componentes.

```tsx
// En dashboard/page.tsx (líneas 39-51)
function getIpScoreLabel(score: number): string { ... }
function getIpScoreColor(score: number): string { ... }

// En performance/page.tsx (líneas 25-37) — IDÉNTICO
function getIpScoreLabel(score: number): string { ... }
function getIpScoreColor(score: number): string { ... }
```

**Fix propuesto**: Mover a `lib/calculations.ts` y exportar desde allí.

---

### 4. 🔐 Revalidate API no requiere autenticación de sesión
**Archivo**: `app/src/app/api/revalidate/route.ts`
**Riesgo**: 🟡 Medio (seguridad)
**Prioridad**: 4

```ts
// ❌ Solo valida un secret en query param, pero:
// 1. El secret puede enviarse en URL (aparece en logs)
// 2. No hay validación de que REVALIDATE_SECRET esté configurado correctamente
if (!REVALIDATE_SECRET || secret !== REVALIDATE_SECRET) { ... }
```

**Impacto**: Si `REVALIDATE_SECRET` no está configurado (`undefined`), la condición `!REVALIDATE_SECRET` bloquea correctamente. Pero el secret en la URL puede aparecer en logs de Vercel o proxies intermedios.

**Fix propuesto**: Leer el secret del header `Authorization` (Bearer token) en lugar de query param, o bien agregar verificación de que el secret tenga mínimo N caracteres de longitud.

---

### 5. ⚠️ Páginas de dashboard usan `getSalonesData()` como import aunque tienen el context
**Archivos**: `performance/page.tsx` (línea 8), `efficiency/page.tsx` (línea 8)
**Riesgo**: 🟡 Medio (inconsistencia, posible desincronización)
**Prioridad**: 5

```tsx
// ❌ Import estático que no se usa (dead import)
import { getSalonesData } from "@/lib/sample-data";
```

Ambas páginas importan `getSalonesData` pero usan exclusivamente `useDashboard()` para obtener los datos. Los imports son dead code que podrían confundir y causar bundle size innecesario.

---

### 6. 🎯 Scatter chart en Performance solo muestra 1 punto (información muy limitada)
**Archivo**: `performance/page.tsx` (líneas 78-107)
**Riesgo**: 🟢 Bajo (UX)
**Prioridad**: 6

```tsx
// El chart en modo "ningún salón seleccionado" muestra solo 1 punto agregado
const chartData = useMemo(() => {
    if (!selectedSalonId) {
        // Default View: Show ONE aggregate point
        return [{ id: 'total', name: 'Total Red', x: totalMargin, y: 100, ... }];
    }
    // Selected View: Show ONLY the selected salon
    return [{ id: s.id_salon, ... }];
}, ...);
```

El scatter chart de "Matriz de Performance" nunca muestra todos los salones como puntos. En su estado default muestra un único punto agregado (poco informativo), y cuando se selecciona un salón, solo muestra ese salón. La visualización pierde todo el valor comparativo de un scatter chart.

**Fix propuesto**: Mostrar **todos** los salones activos como puntos en el scatter cuando no hay selección, y destacar el seleccionado manteniendo los demás en baja opacidad (como ya hace el scatter de Benchmarking).

---

### 7. 🎯 Selección de salón no persiste entre navegaciones
**Riesgo**: 🟡 Medio (UX)
**Prioridad**: 7

Cada página tiene su propio `selectedSalonId` en state local. Si el usuario selecciona "Salón X" en Performance y navega a Benchmarking, debe buscar y seleccionar el salón nuevamente. No hay memoria de qué salón estaba siendo analizado.

**Fix propuesto**: Elevar `selectedSalonId` al `DashboardContext` para que persista entre páginas. Esto es especialmente valioso para el flujo de auditoría donde se analiza un salón en múltiples semáforos.

---

### 8. ⚠️ Conversión de incidencia ambigua en `get_color_from_incidence`
**Archivo**: `app/src/lib/calculations.ts` (líneas 201-209)
**Riesgo**: 🟡 Medio (bugs sutiles)
**Prioridad**: 8

```ts
export function get_color_from_incidence(incidence: number): string {
    // "If it's a small decimal (e.g. 0.15), we treat it as percentage (15%)"
    const value = incidence <= 1 ? incidence * 100 : incidence;
    ...
}
```

La función hace una detección automática de si el valor es decimal (0-1) o porcentaje (0-100). Esto es frágil: un valor de exactamente `1.0` se trata como decimal (`1%`) pero `1.01` se trata como porcentaje (`1.01%`). Un salon con incidencia del 100% (extremo pero posible) sería tratado como 1%.

**Fix propuesto**: Normalizar el uso de la función para que siempre reciba valores en el mismo formato (decimal 0-1), o agregar un parámetro `isDecimal: boolean` explícito.

---

### 9. 🎯 USD Conversion Rate se resetea en cada sesión/reload
**Archivo**: `app/src/components/DashboardContext.tsx` (línea 20)
**Riesgo**: 🟢 Bajo (UX)
**Prioridad**: 9

```tsx
const [conversionRate, setConversionRate] = useState<number>(1470);
```

El tipo de cambio USD/ARS está hardcodeado como estado inicial. El usuario puede editarlo en el header, pero si navega a otra tab o recarga, vuelve a `1470`. Este valor está también hardcodeado en `calculations.ts` como `USD_ARS_RATE = 1470`.

**Fix propuesto**: Persistir el `conversionRate` en `localStorage` para mantenerlo entre sesiones del mismo usuario.

---

### 10. 🎯 Ausencia total de manejo de error states en la UI
**Riesgo**: 🟡 Medio (UX + confiabilidad)
**Prioridad**: 10

```tsx
// DashboardContext.tsx
} catch (err) {
    console.error("Failed to reload salones from API:", err);
}
// El error se silencia. El usuario no ve ningún feedback de fallo.
```

Si el fetch a GitHub falla (token vencido, rate limit, network error), los datos de fallback estáticos se usan silenciosamente pero el usuario no sabe que está viendo datos potencialmente desactualizados. No hay `error` state en el context ni banners informativos.

**Fix propuesto**: Agregar `dataError: string | null` al context y mostrar un banner sutil (no bloqueante) cuando los datos frescos no pueden cargarse.

---

### 11. 🎯 El `solution/` folder misterioso en el app router
**Archivo**: `app/src/app/solution/`
**Riesgo**: 🟢 Bajo (limpieza)
**Prioridad**: 11

```
app/src/app/
├── solution/    ← ¿qué es esto?
```

Existe un directorio `solution/` en el router de la app que no aparece en el menú de navegación ni está documentado. Puede ser un artefacto de desarrollo o código de prueba que no debería estar en producción.

---

### 12. 🔐 ADMIN_PASSWORD en plain text en variables de entorno
**Archivo**: `app/src/auth.ts`
**Riesgo**: 🟡 Medio (seguridad)
**Prioridad**: 12

```ts
if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD  // plain text comparison
) {
```

Las credenciales se comparan directamente en plain text. Si bien las variables de entorno en Vercel están seguras en producción, esta arquitectura no permite agregar más usuarios en el futuro sin código adicional, y no usa hashing.

**Nota**: Para un sistema de un único admin, esto es aceptable a corto plazo, pero limita el escalado.

---

## Approaches

### Approach 1: Quick Wins — Correcciones críticas + UX
Abordar items 1-5 + 10:
- Fix dependencia infinita en Context
- Agregar caché en API de GitHub
- Extraer helpers duplicados
- Añadir error state en Context

- **Pros**: Impacto inmediato, bajo riesgo, sin cambios de arquitectura
- **Cons**: No mejora la experiencia comparativa de los charts
- **Effort**: Low

### Approach 2: UX Elevado — Persistencia de selección + scatter mejorado
Abordar items 6-9:
- Elevar `selectedSalonId` al context
- Mostrar todos los salones en scatter de Performance
- Persistir `conversionRate` en localStorage

- **Pros**: Mejora radical del flujo de análisis multi-semáforo
- **Cons**: Cambios en múltiples páginas, requiere re-test del flujo completo
- **Effort**: Medium

### Approach 3: Integral — Todo
Abordar todos los items en orden de prioridad.

- **Pros**: Codebase saludable, sin deuda técnica acumulada
- **Cons**: Más tiempo, requiere coordinación
- **Effort**: High

---

## Recommendation

**Approach 1 primero, luego Approach 2.**

Los issues 1 y 2 tienen riesgo real de afectar la estabilidad (loop de re-renders y rate limiting de GitHub). Deben abordarse primero. Luego, la persistencia del salón seleccionado (item 7) es la mejora de UX de mayor impacto para el flujo real de trabajo de un auditor que analiza el mismo salón en múltiples semáforos.

### Orden recomendado de propuestas:

| # | Ítem | Tipo | Riesgo | Esfuerzo |
|---|------|------|--------|----------|
| 1 | Fix useCallback deps en DashboardContext | Bug | 🔴 Alto | Low |
| 2 | Caché en API de GitHub | Perf | 🔴 Alto | Low |
| 3 | Extraer helpers duplicados a lib/calculations | Refactor | 🟡 Medio | Low |
| 4 | Error state en DashboardContext | UX | 🟡 Medio | Low |
| 5 | Persistir selectedSalonId en context | UX | 🟡 Medio | Medium |
| 6 | Scatter chart con todos los salones | UX | 🟢 Bajo | Medium |
| 7 | Fix ambigüedad en get_color_from_incidence | Bug | 🟡 Medio | Low |
| 8 | Persistir conversionRate en localStorage | UX | 🟢 Bajo | Low |
| 9 | Secret del revalidate en header en vez de query | Seguridad | 🟡 Medio | Low |
| 10 | Limpiar dead imports (getSalonesData) | Cleanup | 🟢 Bajo | Low |

---

## Risks

- **Breaking changes en DashboardContext**: Al cambiar el context (agregar selectedSalonId, errorState), todas las páginas que usen `useDashboard()` deben actualizarse o romperán su contrato con el provider.
- **GitHub rate limits en dev**: Si se agrega caché basado en `next.revalidate`, el comportamiento local puede diferir del productivo.
- **Scatter chart con 30+ puntos**: Mostrar todos los salones en el scatter de Performance puede hacer el chart ilegible si hay muchos salones superpuestos en el mismo rango. Requiere ajustes de opacidad y tamaño.
- **Compatibilidad de next-auth v5 beta**: El proyecto usa `next-auth@5.0.0-beta.30`. La API puede cambiar antes del release final, lo que limita la adopción de features avanzados.

---

## Ready for Proposal

**Sí.** El análisis es suficientemente profundo para proceder con propuestas específicas. Se recomienda crear al menos 3 propuestas separadas:

1. `fix-context-and-api-cache` — Bugs críticos + performance
2. `ux-persistencia-salon-seleccionado` — Mejora de flujo de trabajo
3. `scatter-todos-los-salones` — Mejora de visualización en Performance
