# TraceMyMoney — React Redesign

**Terminal-aesthetic finance tracker** built with React 18 + Zustand + Vite.

## Stack
- **React 18** — UI
- **Zustand** — state management (replaces Pinia)
- **Axios** — API calls (same endpoints as Vue version)
- **react-datepicker** — date/range pickers
- **Vite** — build tool

## Setup

```bash
npm install
npm run dev
```

## Environment

Create `.env` in root (already included):
```
VITE_TM_BACKEND_URL=https://api.stalk-my-money.in/
```

## File Structure

```
src/
├── main.jsx                  # Entry — restores JWT token on boot
├── App.jsx                   # Root — auth routing
├── index.css                 # Global styles + CSS variables
├── store/
│   └── useStore.js           # Zustand store — ALL state + API calls
└── components/
    ├── Loader.jsx             # Full-screen dual-ring spinner
    ├── AlertToast.jsx         # Error toast (top-right)
    ├── Login.jsx              # Auth — login screen
    ├── Register.jsx           # Auth — register screen
    ├── Dashboard.jsx          # Main layout shell
    ├── Topbar.jsx             # Header with ticker strip + controls
    ├── Sidebar.jsx            # Left panel: accounts, stats, tag filter
    ├── SearchPanel.jsx        # Collapsible advanced search + filters
    ├── ExpenseTable.jsx       # Data table with expandable rows
    ├── Pagination.jsx         # Page controls
    ├── AddExpenseDrawer.jsx   # Slide-in drawer: add expense
    ├── CreateBankDialog.jsx   # Modal: create bank account
    ├── CreateTagDialog.jsx    # Modal: create tag
    └── ApplyTagsDialog.jsx    # Modal: edit entry tags/description
```

## Design System

All colors via CSS variables in `index.css`:
- `--acid` — #B8FF00 — primary accent (all interactive states)
- `--red` — #FF3B5C — debits / errors
- `--green` — #00F0A0 — credits / success
- `--purple` — #9B7FFF — tags
- `--f-head` — Barlow Condensed — all headings/labels
- `--f-mono` — DM Mono — all numbers/amounts
- `--f-body` — Barlow — body text

Dark mode is default. Light mode applies `body.light` class.
