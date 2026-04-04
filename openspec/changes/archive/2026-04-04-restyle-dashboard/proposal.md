# Proposal: Restyle Dashboard to Premium Brand Aesthetic

## Intent

Replace the current blue/cyan “tech” look in `/dashboard` with a premium burgundy + gold visual identity aligned with the Jano’s Eventos brand direction, while preserving all current data flows, component behavior, and semantic status colors.

## Scope

### In Scope
- Update global design tokens and reusable dashboard surface styles to a warm dark palette (`globals.css`).
- Replace hardcoded blue/cyan/purple Tailwind classes in dashboard views and shell with burgundy/gold equivalents.
- Add an accent display font for section headings to improve brand perception while keeping UI/data text readable.

### Out of Scope
- Any business logic, API integration, state model, selectors, chart calculations, or data contracts.
- Layout restructuring, feature additions, navigation changes, and semantic semaphore color meaning.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `dashboard`: Add visual-brand requirements for dashboard theming (palette, typography accents, and consistent shell/page styling) without changing functional behavior.

## Approach

Use a presentation-only restyle: (1) redefine CSS variables and component utility styles in `globals.css`, (2) normalize inline Tailwind color usage in `dashboard/page.tsx` and `DashboardShell.tsx`, and (3) introduce a heading display font via `next/font/google` in `layout.tsx`. Preserve functional colors for semaphore/status indicators and dynamic metric semantics.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/src/app/globals.css` | Modified | New brand tokens, cards, borders, hover, and text surfaces |
| `app/src/app/dashboard/page.tsx` | Modified | Replace hardcoded tech palette classes/object colors |
| `app/src/components/DashboardShell.tsx` | Modified | Restyle sidebar/topbar/action controls to new palette |
| `app/src/app/layout.tsx` | Modified | Add/display heading font integration |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Contrast regressions on dark surfaces | Medium | Validate key text/accent pairs; prefer warm off-white for body text |
| Visual inconsistency from missed inline classes | Medium | Audit all dashboard color classes and KPI icon color literals |
| Loss of semantic status clarity | Low | Keep semaphore/status functional colors unchanged |

## Rollback Plan

Revert `globals.css`, `dashboard/page.tsx`, `DashboardShell.tsx`, and `layout.tsx` to previous commit state; if partial rollback is needed, first restore `globals.css` and color-class replacements, then remove the added display font import.

## Dependencies

- `next/font/google` display font (Fraunces) for heading accent.

## Success Criteria

- [ ] Dashboard uses burgundy/gold premium theme across shell and main dashboard panels with no blue/cyan tech styling remnants.
- [ ] All dashboard functionality and data behavior remain unchanged (selectors, filters, charts, context flows).
- [ ] Semaphore/status colors remain semantically distinct and readable.
- [ ] Heading typography reflects premium brand direction without harming data-text readability.
