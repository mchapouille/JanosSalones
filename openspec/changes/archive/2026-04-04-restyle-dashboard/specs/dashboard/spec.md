# Delta for dashboard

## ADDED Requirements

### Requirement: Premium brand visual theme
The dashboard UI MUST apply a premium burgundy-and-gold visual theme across shell and page surfaces, and MUST remove prior blue/cyan/purple tech-oriented accent styling from dashboard-facing views.

#### Scenario: Premium theme on dashboard shell and panels
- GIVEN a user opens `/dashboard`
- WHEN the shell and dashboard content render
- THEN primary surfaces use the warm dark brand palette
- AND actionable accents and headings use burgundy/gold styling

#### Scenario: Legacy tech accents are not present
- GIVEN dashboard routes are rendered after the restyle change
- WHEN a visual audit checks reusable shell and page components
- THEN blue/cyan/purple accent classes from the previous style are not used for brand accents

### Requirement: Functional semantics remain unchanged
The dashboard restyle MUST preserve all functional data behavior and MUST NOT change semantic meaning of status indicators, including semaphore/status colors used for operational states.

#### Scenario: Restyle does not change data behavior
- GIVEN existing dashboard filters, selectors, and charts
- WHEN users interact with dashboard features after the restyle
- THEN all behaviors and calculated outputs remain functionally equivalent to pre-restyle behavior

#### Scenario: Status semantics stay distinct
- GIVEN status or semaphore indicators are shown in dashboard views
- WHEN the restyled theme is applied
- THEN each status keeps its prior semantic color mapping
- AND status meaning remains distinguishable from decorative brand accents

### Requirement: Branded heading typography with readable data text
The dashboard SHOULD apply a display font to section headings for brand expression, while body, data, and control text MUST remain readability-focused and operationally clear on dark surfaces.

#### Scenario: Heading accent typography applied
- GIVEN a dashboard section title is rendered
- WHEN typography styles are applied
- THEN the heading uses the configured display accent font
- AND adjacent data labels continue using readable UI text styling

#### Scenario: Readability preserved in dense data panels
- GIVEN KPI cards, tables, and chart labels are visible
- WHEN text appears on warm dark backgrounds
- THEN body/data text contrast is sufficient for normal dashboard use
- AND decorative typography does not reduce legibility of operational information
