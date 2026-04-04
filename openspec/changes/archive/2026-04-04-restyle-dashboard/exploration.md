## Exploration: restyle-dashboard

### Current State

The dashboard is a Next.js 14+ App Router application using Tailwind CSS v4 with a **tech/cyber aesthetic** — blues, purples, cyan, glassmorphism — that feels generic and AI-generated. The design language is:

- **Background**: `#030712` (near black)
- **Primary color**: `#2563eb` (bright blue)
- **Accent**: `#8b5cf6` (purple), `#06b6d4` (cyan)
- **Cards**: dark glass effect with blue borders (`rgba(59, 130, 246, 0.15)`)
- **Typography**: Inter font, white on dark, uppercase tracking labels

The `/dashboard` page (`app/src/app/dashboard/page.tsx`) contains:
1. **Panel 1** — "Datos del Salón": Salon selector (PredictiveSearch + dropdown), then semaphore cards (4 colored indicators) + 6 detail metric tiles
2. **Map + Salon List**: Google Map (2/3 width) + scrollable salon list (1/3 width)
3. **Panel 2** — "Vista General de Salones": Filter buttons + 6 KPI cards (revenue, costs, guests, events, avg ticket, incidence)

The shell (`DashboardShell.tsx`) provides:
- **Sidebar**: Logo, nav items (Dashboard, Performance, Benchmarking, Eficiencia, Contratos), logout — collapsible, mobile drawer
- **Top bar**: USD rate input, Refresh button, Help button, User avatar

### Reference Site Analysis (janoseventos.com)

The Jano's Eventos landing site uses a **premium events brand** aesthetic:
- **Accent color**: `#7000fb` (vivid purple — their brand color) — *however user specified burgundy `#681212`*
- **Fonts**: Fraunces (display/serif, elegant), Domine (serif body), Inter (UI)
- **Color palette**: Dark backgrounds with high-contrast sections, clean white space, professional imagery
- **Typography**: Mix of serif display fonts for elegance + sans-serif for data
- **Style**: Premium, elegant — less "tech dashboard" more "luxury brand operations tool"

**User-specified palette** (overriding site's purple with requested burgundy):
- Primary dark: `#681212` (dark burgundy/wine) or similar deep red
- Gold accents: `#c9a227` or `#d4a843` (warm gold)
- Dark background: Stay dark but warmer — `#0f0a0a` or `#1a0a0a`

### Affected Areas

- `app/src/app/globals.css` — **primary target**: all CSS custom properties (colors, card styles, button styles, utilities)
- `app/src/app/dashboard/page.tsx` — inline Tailwind color classes (blue-*, cyan-*, purple-*, slate-*)
- `app/src/components/DashboardShell.tsx` — sidebar, top bar inline color classes
- `app/src/app/layout.tsx` — font import (could add Fraunces/Domine for headings)

**Not in scope (to preserve functionality):**
- All data logic, hooks, API calls, state management
- Component structure and layout
- `DashboardContext.tsx`, `Providers.tsx`, `GoogleMapView.tsx`, etc.

### Approaches

1. **CSS Variables Only** — Change only `globals.css` @theme variables + component classes
   - Pros: Minimal changes, no risk of breaking JSX structure, easy to rollback
   - Cons: Can't change inline Tailwind classes in TSX files (e.g. `text-blue-400`, `bg-blue-500/20`)
   - Effort: Low

2. **CSS Variables + TSX Class Update** — Update globals.css AND replace inline color classes in page.tsx + DashboardShell.tsx
   - Pros: Complete visual transformation, consistent palette everywhere
   - Cons: More files changed, risk of missing classes, need to handle dynamic color values (semaphore colors use `getSemaphoreColor()`)
   - Effort: Medium

3. **CSS Variables + TSX + Font Change** — All of (2) plus adding Fraunces serif font for headings
   - Pros: Maximum elegance — matches reference site's premium typography
   - Cons: More changes, need to update layout.tsx + globals.css font import
   - Effort: Medium-High

### Recommendation

**Approach 3** — CSS Variables + TSX class updates + optional font accent.

Rationale:
- The "AI-generated" feel comes primarily from the blue/cyan tech color scheme in inline Tailwind classes, NOT from the CSS variables alone (Tailwind v4 uses `@theme` which does work for custom tokens, but many classes like `text-blue-400` are hardcoded Tailwind defaults)
- The Fraunces display font would immediately elevate section headings (like "Datos del Salón", "Vista General") from generic to premium — matching janoseventos.com's character
- The semaphore colors (green/yellow/red/critical) should remain unchanged — they're functional semantic colors, not brand colors
- The KPI icon colors can be adapted to the gold/burgundy palette

**Color palette for the restyle:**
```
--color-background: #0d0505       (very dark wine/almost black)
--color-foreground: #f5f0eb       (warm off-white, not cold white)
--color-primary: #8b1a1a          (wine/burgundy red)
--color-primary-dark: #5a0f0f     (deeper burgundy)
--color-accent: #c9a227           (warm gold)
--color-accent-light: #e6c668     (lighter gold for highlights)
--color-card: rgba(20, 8, 8, 0.7) (warm dark glass)
--color-card-border: rgba(201, 162, 39, 0.15)  (subtle gold border)
--color-card-hover: rgba(139, 26, 26, 0.2)     (burgundy hover)
```

**Typography:**
- Add `Fraunces` (Google Fonts) as display font for section headings only
- Keep Inter for all UI/data text (already loaded in layout.tsx)

### Risks

- **Semaphore color contrast**: The green/yellow/red/critical colors must remain readable against the new dark background — they should still work as these are functional, not themed
- **Gold on dark readability**: Ensure gold `#c9a227` meets WCAG AA contrast on `#0d0505` (4.5:1 ratio) — preliminary check: should be ~7:1, fine
- **Fraunces font load**: Need to add it to the `next/font/google` import in `layout.tsx` — minor change
- **Dynamic inline styles**: `page.tsx` uses `style={{ color: hex }}` and `style={{ background: hex+15 }}` where `hex` is from `getSemaphoreColor()` — these are functional colors and should NOT be changed
- **KPI hardcoded colors**: Some KPI cards have `color: "#2563eb"` or `"#22c55e"` hardcoded as object values — these need to be updated in the TSX data array

### Ready for Proposal

**Yes** — The scope is clear, the risk is low (CSS + class replacement, no functional changes), and the approach is straightforward. Recommend proceeding to proposal.
