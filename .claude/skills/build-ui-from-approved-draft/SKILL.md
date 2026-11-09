---
name: build-ui-from-approved-draft
description: How to build a new or changed UI screen, dialog or section in TraceMyMoneyUI from an approved design Artifact, matching it exactly. Use for any UI work larger than a text or color fix.
---

# Build UI from an approved design draft

The strict version of these rules is in `CLAUDE.md` ("Design drafts: the approved Artifact is the law").
This skill is the working recipe.

## 1. Draft first
- Make the Artifact (design canvas) with the real page around the new piece, desktop AND phone (390 wide),
  dark AND light, and every state: empty, loading, error, filled, hover/focus.
- Use the app's real tokens: `--acid` #B8FF00, `--red`, `--green`, `--purple`, fonts Barlow Condensed
  (headings), DM Mono (numbers), Barlow (body).
- Show the click path and count the taps. State the fewest-clicks choice you made.
- Wait for "proceed". Record the Artifact URL and the approval in the plan.

## 2. Before writing code (every UI step)
- Re-read the Artifact (Artifact `read` on the URL, then its `project/*.dc.html` files). Never build from memory.
- Write the checklist: each element, exact copy, order, spacing, sizes, colors (as CSS variables), icons,
  states, behavior, per breakpoint.

## 3. Build
- Server state and API calls only in `src/store/useStore.js`; components call store actions.
- Colors from CSS variables in `src/index.css` only. No hard-coded hex (except one-off brand colors).
- Phone-only code is gated on `usePhoneScreen()` so tablet and desktop stay untouched.
- Reuse existing classes first (`landing-hero-cta`, `landing-nav-signin`, `profile-copybox` ...).
- Animations are decoration: subtle, and off under `prefers-reduced-motion`.

## 4. Verify against the draft
- Run `npm run dev` (API on port 5000 unless `VITE_TM_BACKEND_URL` is set, no trailing slash).
- Compare each screen with the draft at phone, tablet and desktop, dark and light. Screenshots are best
  (Playwright works). Tick the checklist. List any difference.
- `npm run build:prod` must pass.
- Any difference from the draft needs the user's approval first.

## Lessons from this project
- **Build the smallest thing that matches the ask.** A full-width MCP band was built, animated and then
  replaced by a small address box plus an "i" help button. Confirm size and placement in the draft, not
  after the code.
- **Say where it shows.** Logged-out visitors (landing, login, register) and logged-in users (dashboard)
  see different screens. State which one(s) the feature appears on, and check phone separately: the
  dashboard command bar is not rendered on phones.
- **When the user says they cannot see it,** check the screen width, the logged-in state and a stale dev
  server or old build before changing code.
- **Do not rely on a README or summary of the design.** The Artifact itself is the source.
