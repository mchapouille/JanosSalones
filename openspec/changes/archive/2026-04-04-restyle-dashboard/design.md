# Design: Restyle Dashboard to Premium Brand Aesthetic

## Technical Approach

Presentation-only restyle in three layers: (1) redefine `@theme` CSS variables and component utility classes in `globals.css` to a warm burgundy/gold/dark palette, (2) replace hardcoded Tailwind tech-palette classes and inline color object literals in `dashboard/page.tsx` and `DashboardShell.tsx`, (3) add the `Fraunces` display font via `next/font/google` for section headings in `layout.tsx`. No functional code, data flows, state, or semaphore colors are touched.

---

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| CSS variable scope | Redefine `@theme` tokens in `globals.css` only | Create a separate theme file | Single source of truth; Tailwind v4 `@theme` block already owns all tokens; no extra import chain needed |
| Inline class replacement | Search-and-replace specific classes in TSX files | CSS `@apply` overrides | Tailwind v4 does not support `@apply` for arbitrary class overrides at utility level; direct replacement is the only reliable path |
| KPI icon colors | Update hardcoded hex literals in the KPI data array in `page.tsx` | CSS variable via `style={{ color: 'var(--color-accent)' }}` | Array literals are self-contained and easy to audit; CSS variable reference in inline `style` is valid but less readable given existing pattern |
| Font strategy | Import `Fraunces` alongside existing `Inter` via `next/font/google` | Load from `<link>` in `<head>`, or use a local font | `next/font/google` is the project's established pattern (Inter is already loaded this way); consistent, no external network calls at render |
| Font application | CSS variable + `font-display` utility class applied to headings | Applying font globally | Section headings only — body/data text stays on `Inter` to preserve readability in dense panels |
| Semaphore colors | Keep all semaphore tokens unchanged | Shift to warmer equivalents | Semaphores are functional operational signals (green/yellow/red/critical); brand palette must not bleed into signal semantics |

---

## Data Flow

This is a pure presentation change — no state, API, or data flow modifications.

```
layout.tsx
  └── loads Inter + Fraunces fonts → injects CSS variables → <html className={...}>
        └── globals.css (@theme tokens + component classes)
              ├── DashboardShell.tsx  (sidebar, topbar — brand palette classes)
              └── dashboard/page.tsx  (panel wrappers, KPI icons, filter buttons)
                    └── semaphore colors ← getSemaphoreColor() [UNCHANGED]
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/src/app/globals.css` | Modify | Replace `@theme` color tokens with brand palette; update `.glass-card`, `.gradient-text`, `.gradient-border`, `.btn-primary`, `.kpi-card`, scrollbar, and component classes to burgundy/gold |
| `app/src/app/layout.tsx` | Modify | Import `Fraunces` from `next/font/google`; expose as `--font-display` CSS variable; add to `<html>` className |
| `app/src/components/DashboardShell.tsx` | Modify | Replace `bg-slate-950`, `border-slate-800`, `text-blue-400`, `bg-blue-500/*` and avatar gradient classes with brand-palette equivalents |
| `app/src/app/dashboard/page.tsx` | Modify | Replace blue/purple/cyan/slate hardcoded Tailwind classes; update KPI icon hex literals to gold/burgundy; apply `font-display` to section headings; keep semaphore `style={{ color: hex }}` intact |

---

## Interfaces / Contracts

No new types, interfaces, or API contracts introduced. All props, component signatures, and data models remain unchanged.

**New CSS tokens (additions to `@theme`):**

```css
/* globals.css @theme — replacing blue/cyan/purple tokens */
--color-background:    #0d0505;
--color-foreground:    #f5f0eb;
--color-primary:       #8b1a1a;
--color-primary-dark:  #5a0f0f;
--color-accent:        #c9a227;
--color-accent-light:  #e6c668;
--color-card:          rgba(20, 8, 8, 0.7);
--color-card-border:   rgba(201, 162, 39, 0.15);
--color-card-hover:    rgba(139, 26, 26, 0.2);
/* semaphore tokens — UNCHANGED */
--color-semaphore-green:    #22c55e;
--color-semaphore-yellow:   #eab308;
--color-semaphore-red:      #ef4444;
--color-semaphore-critical: #991b1b;
/* display font */
--font-display: "Fraunces", Georgia, serif;
```

**Font import pattern (layout.tsx):**

```typescript
import { Inter, Fraunces } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", style: ["italic", "normal"] });
// <html className={`${inter.variable} ${fraunces.variable}`}>
```

---

## Testing Strategy

No test runner is available in this project (`strict_tdd: false`). Verification is performed via static analysis and code inspection.

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type check | No regressions from TSX changes | `tsc --noEmit` |
| Lint | No new ESLint errors | `eslint app/src/` |
| Visual audit | Legacy tech-palette classes absent from restyled files | `grep` for `blue-`, `cyan-`, `purple-` in affected TSX files — only semaphore/functional usage should remain |
| Functional preservation | Semaphore colors, data calculations, filters unchanged | Code inspection — no logic files touched |

---

## Migration / Rollout

No migration required. This is a purely additive CSS + class replacement change.

Rollback: revert the four files (`globals.css`, `layout.tsx`, `DashboardShell.tsx`, `dashboard/page.tsx`) to their pre-change git state.

---

## Open Questions

- [ ] Should `Fraunces` use italic variant for headings (matches janoseventos.com elegance) or normal weight only? Italic adds character but may feel inconsistent with the dashboard's data-dense context.
- [ ] Are there other dashboard sub-routes (`/performance`, `/benchmarking`, `/efficiency`, `/contracts`) that also use hardcoded blue/cyan classes and should be in scope, or is scope intentionally limited to `/dashboard` page only for this change?
