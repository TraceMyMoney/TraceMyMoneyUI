# StalkMyMoney — Frontend Documentation

> This is the complete technical reference for the `tm-ui` frontend.
> Written for someone who understands the product but is new to React / frontend code.
> Every concept is explained from first principles.

---

## Table of Contents

1. [What this app is](#1-what-this-app-is)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [How the app boots](#4-how-the-app-boots)
5. [Environment Variables](#5-environment-variables)
6. [Running locally](#6-running-locally)
7. [Building for production](#7-building-for-production)
8. [Document Index](#8-document-index)

---

## 1. What this app is

StalkMyMoney (SMM) is a **personal finance tracker**.  
The user can:

- Create bank / wallet accounts
- Add daily expense entries with amounts and descriptions
- Tag entries with labels (Groceries, Rent, etc.)
- Search and filter expenses by tag, keyword, date range, or account
- Chat with an AI assistant about their money
- Toggle dark / light mode and privacy mode (hides amounts)

The frontend is a **Single Page Application (SPA)** — meaning the browser loads one HTML file and React handles all the screen changes without ever doing a full page reload (except for a few special cases like after login).

---

## 2. Tech Stack

| Technology | Version | What it does |
|---|---|---|
| **React** | 18 | Builds the UI out of components. Handles what you see on screen. |
| **Vite** | 5 | Dev server + build tool. Much faster than the older Create React App. |
| **Zustand** | 4 | Global state management. Think of it as a shared memory box all components can read from and write to. |
| **Axios** | 1 | HTTP client. Makes all API calls to the backend. |
| **react-datepicker** | 7 | Pre-built date/date-range picker component. |
| **lucide-react** | latest | Icon library (Eye, Trash, MessageCircle, etc.). |
| **Pure CSS** | — | All styling is hand-written. No Tailwind, no MUI, no Bootstrap. |

---

## 3. Folder Structure

```
tm-ui/
├── index.html              ← The single HTML file. React mounts inside <div id="root">
├── vite.config.js          ← Vite configuration (port, aliases, etc.)
├── package.json            ← All dependencies and npm scripts
│
├── docs/                   ← ✅ You are here — all documentation lives here
│
└── src/
    ├── main.jsx            ← Entry point. Boots React, restores login session.
    ├── App.jsx             ← Root component. Decides Login vs Dashboard.
    ├── index.css           ← ALL styles for the entire app (one big file).
    │
    ├── store/
    │   └── useStore.js     ← Global state + all API calls (Zustand store).
    │
    └── components/
        ├── Dashboard.jsx         ← Main screen after login. Orchestrates everything.
        ├── Topbar.jsx            ← Top navigation bar.
        ├── Sidebar.jsx           ← Left sidebar with bank accounts list.
        ├── ExpenseTable.jsx      ← The big table of expenses + inline add entries.
        ├── SearchPanel.jsx       ← Collapsible filter/search bar.
        ├── Pagination.jsx        ← Page number controls below the table.
        ├── AddExpenseDrawer.jsx  ← Slide-in drawer to add a new expense.
        ├── CreateBankDialog.jsx  ← Modal to create a new bank account.
        ├── CreateTagDialog.jsx   ← Modal to create a new tag label.
        ├── ApplyTagsDialog.jsx   ← Modal to edit an entry's tags/description.
        ├── ChatAssistantDialog.jsx ← Chat window to talk to the AI.
        ├── TagSearchSelect.jsx   ← Reusable multi-select dropdown for tags.
        ├── Loader.jsx            ← Full-screen loading spinner.
        ├── AlertToast.jsx        ← Error/warning notification bar.
        └── Login.jsx / Register.jsx ← Auth screens.
```

---

## 4. How the app boots

This is the sequence of events from the moment you open the browser tab:

```
Browser loads index.html
  └── loads src/main.jsx
        ├── Calls initAxiosToken()
        │     ├── Reads "access_token" from localStorage
        │     ├── If found: decodes the JWT to get the username
        │     ├── Sets axios default Authorization header (so all future API calls are authenticated)
        │     └── Sets isLoggedIn = true and userName in the store
        │
        └── Renders <App />
              ├── useEffect: if isLoggedIn → calls getInitialData()
              │     ├── Fetches /banks/ and /user-preferences/ in parallel
              │     ├── Applies dark/light mode to document.body
              │     ├── Sorts banks by saved display order
              │     ├── Fetches first page of expenses for the first bank
              │     └── Fetches all tags
              │
              └── Renders one of:
                    ├── <Dashboard />  ← if logged in
                    ├── <Login />      ← if not logged in and showLoginPage = true
                    └── <Register />   ← if not logged in and showLoginPage = false
```

**Why localStorage?**  
The JWT token is saved in `localStorage` so the user stays logged in even after closing the browser tab. On next boot, `main.jsx` reads it back before React even renders.

---

## 5. Environment Variables

Create a `.env` file in the `tm-ui/` root:

```
VITE_TM_BACKEND_URL=http://127.0.0.1:5000
```

If this variable is not set, the app falls back to `https://api.stalk-my-money.in/`.

Vite requires all custom env variables to start with `VITE_` — otherwise they are invisible to the browser code (for security).

---

## 6. Running locally

```bash
cd tm-ui
npm install       # install all dependencies (only needed once)
npm run dev       # starts dev server at http://localhost:5173
```

---

## 7. Building for production

```bash
npm run build     # outputs to tm-ui/dist/
```

The `dist/` folder contains static files you can deploy to any web server (Nginx, Vercel, Netlify, S3, etc.).

---

## 8. Document Index

| File | What it covers |
|---|---|
| [README.md](./README.md) | This file — overview, stack, structure, boot sequence |
| [STORE.md](./STORE.md) | The Zustand store — all state fields and every API action explained |
| [COMPONENTS.md](./COMPONENTS.md) | Every component — what it does, its props, useState, useEffect |
| [STYLING.md](./STYLING.md) | How the CSS works — design tokens, dark mode, responsive breakpoints |
| [PATTERNS.md](./PATTERNS.md) | React patterns used throughout — optimistic updates, portals, drag-and-drop, touch events |
```

Now create the store documentation: