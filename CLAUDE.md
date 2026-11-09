# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Branches (start of every fix or feature)

Before changing any code, create a new branch from an up-to-date `master`:

```bash
git fetch origin && git switch -c <BRANCH-NAME> origin/master
```

Name format: `FRONTEND-<TYPE>-<short-title>`, where `TYPE` is `BUG` or `FEATURE` and the title is a short lowercase hyphenated
phrase (a problem statement for a bug). Examples: `FRONTEND-BUG-sidebar-tag-list-not-refreshing`,
`FRONTEND-FEATURE-tags-manager-dialog`. If the work also touches the API repo, use the same title there with the `BACKEND-` prefix.

- If the working tree has uncommitted changes, do not switch silently: tell the user and ask what to do.
- Creating the branch is expected; committing and pushing are still left to the user (see below).
- Work that is only docs or config on a branch the user already named: keep using that branch.

## Commit messages (every session)

After every fix, feature, refactor, doc or config change, end the reply with exactly one line:
`[FRONTEND] - <commit message>` (plain words, present tense, about 10 words, for example
`[FRONTEND] - Add MCP address box to the dashboard`). Never run `git commit` or push unless asked; the user
commits and pushes themselves. If a task also changed the API, add a `[BACKEND] - <commit message>` line.

## How to work with the user

- "Just talk", "no code" or "explain": answer only. Do not change any files.
- Design or "craft" request: make a visual draft first (an Artifact) and wait for "proceed" before writing any code.
- Concept questions: explain in simple English with a short example and no code. Keep answers short unless asked for detail.
- Do not claim certainty you do not have. Say "this is my guess" and how to test it. Say "fixed" or "found it" only when something confirms it.
- Server (EC2/AWS) problems: give a few commands at a time, say what each one does, and wait for the output before the next step. Warn before anything that deletes data (`down -v`, removing volumes).
- If a request is unclear, ask one short question instead of guessing.
- Phone changes must leave tablet and desktop unchanged (phone-only code is gated on `usePhoneScreen`).

## Your role and UX principles

Whenever you work on this UI, act as a senior principal frontend and UX engineer who knows what end users want:

- **Fewest steps:** every task should take the fewest clicks, taps and typing. Prefer sensible defaults, remembered choices, inline actions and one-tap flows over extra dialogs, pages or confirmations. Confirm only destructive actions.
- **Speed you can feel:** show feedback at once (optimistic updates, loading and empty states). Never leave the user wondering whether something worked, and never make them wait for slow work (send it to the background).
- **Phone first:** thumb-reachable controls, tap targets of at least 44px, no horizontal scrolling, keyboard types that match the field (email, number). Check phone, tablet and desktop.
- **Clear and forgiving:** plain-language labels and error messages that say what to do next. Allow undo or an easy way back, keep typed input when something fails, and explain what a new feature does where it appears.
- **Accessible and consistent:** real buttons and labels, visible focus, enough contrast in dark and light mode, and the existing design system (CSS variables, no hard-coded colors) so new screens look like the rest of the app.
- **Respect motion preferences:** animations are decoration, so keep them subtle and turn them off for `prefers-reduced-motion`.
- **Say what you chose:** when a design trade-off matters (for example fewer clicks versus more safety), state the choice and why in one or two lines.

## Commands

```bash
npm install

# Dev server — http://localhost:5173
npm run dev

# Production build (reads .env.prod)
npm run build:prod

# Standard build
npm run build
```

No test runner is configured; verify changes manually in the browser.

## Architecture

### State & API calls — single Zustand store

**All** server state and API calls live in `src/store/useStore.js`. Components never import Axios or call the API directly — they call store actions and read store state.

```js
const { expenses, fetchExpenses, loading } = useStore();
```

### Auth flow

1. On boot (`main.jsx`), stored JWT is restored from `localStorage` and set on `axios.defaults.headers`
2. An Axios response interceptor deduplicates 401 retries via a shared `refreshPromise` — concurrent requests wait on the same refresh call rather than flooding `/refresh`
3. `isAuthenticated` in the store gates routing: unauthenticated → Login/Register, authenticated → Dashboard

Token helpers (`parseJwt`, `saveTokens`, `clearTokens`, `isTokenExpired`) are module-level functions inside `useStore.js`, not exported.

### Component structure

```
App.jsx              — auth gate; renders Login/Register or Dashboard
Dashboard.jsx        — main layout shell (sidebar + topbar + content area)
├── Topbar.jsx       — header with ticker strip and controls
├── Sidebar.jsx      — accounts list, balance stats, tag filter
├── SearchPanel.jsx  — collapsible advanced search / date range filters
├── ExpenseTable.jsx — paginated table with expandable entry rows
├── Pagination.jsx
├── AddExpenseDrawer.jsx   — slide-in drawer for adding an expense
├── CreateBankDialog.jsx
├── CreateTagDialog.jsx
└── ApplyTagsDialog.jsx    — edit tags and description on an entry
```

`Loader.jsx` and `AlertToast.jsx` are global overlays rendered from `App.jsx`.

### Design system

All tokens in `src/index.css` CSS custom properties:

| Variable | Value | Usage |
|---|---|---|
| `--acid` | #B8FF00 | Primary accent — all interactive states, focus rings |
| `--red` | #FF3B5C | Debits, errors |
| `--green` | #00F0A0 | Credits, success |
| `--purple` | #9B7FFF | Tags |
| `--f-head` | Barlow Condensed | All headings and labels |
| `--f-mono` | DM Mono | All numbers and amounts |
| `--f-body` | Barlow | Body text |

Dark mode is the default. Light mode is toggled by adding the `light` class to `<body>`.

Always use these CSS variables — never hardcode hex values.

## Environment

`.env` (or `.env.prod` for production builds):

```
VITE_TM_BACKEND_URL=https://api.stalk-my-money.in/
```

If the var is unset, `npm run dev` calls the API on port 5000 (`http://<page hostname>:5000`) and a production build uses `https://api.stalk-my-money.in/`. So either start the API with `--port 5000` or set `VITE_TM_BACKEND_URL` (without a trailing slash).
