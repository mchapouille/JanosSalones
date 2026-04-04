# Tasks: Restyle Dashboard to Premium Brand Aesthetic

## Phase 1: Theme Foundation

- [x] 1.1 Update `app/src/app/globals.css` `@theme` tokens from blue/cyan/purple to the burgundy/gold palette, keeping semaphore tokens unchanged.
- [x] 1.2 Restyle shared utilities in `app/src/app/globals.css` (`.glass-card`, `.gradient-text`, `.gradient-border`, `.btn-primary`, `.kpi-card`, scrollbar) to match the premium dark brand surfaces.
- [x] 1.3 Update `app/src/app/layout.tsx` to load `Fraunces` with `next/font/google`, expose `--font-display`, and keep `Inter` as the body font.

## Phase 2: Dashboard Shell Restyle

- [x] 2.1 Replace shell chrome classes in `app/src/components/DashboardShell.tsx` (`bg-slate-*`, `border-slate-*`, `text-blue-*`, avatar gradient) with brand-surface and gold/burgundy accents.
- [x] 2.2 Restyle dashboard shell interactions in `app/src/components/DashboardShell.tsx` for active nav, hover states, USD input, refresh action, help button, and logout without changing handlers or fetch logic.
- [x] 2.3 Keep semantic feedback intact in `app/src/components/DashboardShell.tsx`: preserve success/error banner meaning and only limit brand changes to decorative surfaces.

## Phase 3: Dashboard Page Restyle

- [x] 3.1 Replace tech-accent wrappers in `app/src/app/dashboard/page.tsx` for the selected-salon panel, map/list section, and overview panel with the new burgundy/gold gradients, borders, and backgrounds.
- [x] 3.2 Apply `font-display` to section headings in `app/src/app/dashboard/page.tsx` while keeping body, labels, controls, and dense data text on the readable default UI font.
- [x] 3.3 Restyle dashboard controls in `app/src/app/dashboard/page.tsx` (estado filters, list selection states, empty state, metadata chips) to the brand palette without changing filtering behavior.
- [x] 3.4 Update KPI/detail icon accents and hardcoded hex literals in `app/src/app/dashboard/page.tsx` to gold/burgundy equivalents, but leave `getSemaphoreColor()` usage and operational status colors untouched.

## Phase 4: Verification

- [x] 4.1 Run `tsc --noEmit` to verify the restyle introduces no TypeScript regressions in `layout.tsx`, `DashboardShell.tsx`, or `dashboard/page.tsx`.
- [x] 4.2 Run `eslint app/src/` to confirm the styling refactor does not add lint errors.
- [x] 4.3 Audit `app/src/components/DashboardShell.tsx` and `app/src/app/dashboard/page.tsx` for leftover `blue-`, `cyan-`, or `purple-` brand accents; only semaphore/functional colors may remain.
- [x] 4.4 Inspect the changed files to confirm `/dashboard` behavior, selectors, calculations, refresh flow, and semaphore semantics remain unchanged after the presentation-only restyle.
