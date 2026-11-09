---
name: landing-and-auth-visuals
description: Add visual polish to the landing page and login/register screens in TraceMyMoneyUI: Vanta birds background, the animated MCP address box, and new landing sections. Use when changing the logged-out look or adding a landing-page element.
---

# Landing and auth visuals

Reference: `src/components/LandingPage.jsx`, `VantaBirds.jsx`, `McpBox.jsx`, `Login.jsx`, `Register.jsx`,
and the matching blocks at the end of `src/index.css`.

## Vanta birds
- `VantaBirds.jsx` (login and register) and the effect in `LandingPage.jsx` use `three` and
  `vanta/dist/vanta.birds.min`. Colors follow the theme (`isDarkMode`): recreate the effect when it flips.
- Always skip it for `prefers-reduced-motion`, wrap creation in try/catch (no WebGL), and `destroy()` on cleanup.
- Fewer birds on phones (`quantity` 3 under 600px).
- Landing uses `.landing-birds` (fixed, behind the page, `z-index: -1`). Auth screens use `.auth-birds`
  (absolute inside `.auth-shell`, placed after the grid and glow and before the panel; `pointer-events: none`).

## MCP address box (`McpBox.jsx`)
- Pill with the connector URL (`${API_BASE_URL}/mcp`), a copy button (tick for about 1.4s) and an "i" button
  that opens a small popover with the three setup steps. Closes on outside click and Esc.
- `glory` prop adds the animated ring (conic gradient using `@property --mcp-angle`), breathing glow,
  shimmer and floating motion. Used on the landing page only; all of it stops under reduced motion.
- Shown: landing page between the hero and the Features grid (`.landing-mcp-strip`), dashboard command bar
  (desktop and tablet, `margin-right: auto`) and a full-width row above the account chips on phones
  (`.mcp-box-row`).

## Adding a landing section
- Place it in `LandingPage.jsx` in the order the user asked for (for example between the hero and the
  features grid). Reuse existing classes: `landing-eyebrow`, `landing-section-head`,
  `landing-hero-cta`, `landing-hero-secondary`, `landing-analytics-points`, `landing-demo-*`.
- Typing animations follow `TypingDemo`: one `phase` state and a timeout per phase, a fixed min-height so
  the section does not jump.
- Landing nav: do not show logged-in-only items to visitors. (An "Add MCP" nav link was tried and removed.)
- Use CSS variables only (`--acid`, `--ink`, `--ink-2`, `--line-mid`, `--purple`, `--acid-glow`) so
  dark and light both work. Check the phone width (the landing page has its own phone styles).

## Verify
Logged out: landing at phone, tablet and desktop, in dark and light mode; login and register with the
birds; then logged in: dashboard box. `npm run build:prod` passes.
