# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

The store falls back to `https://api.stalk-my-money.in/` if the var is unset.
