# TraceMyMoney UI (StalkMyMoney web app)

Terminal-style finance tracker front end built with **React 18, Zustand, Axios and Vite**.
Production: `https://app.stalk-my-money.in`. It talks to the API in the sibling repo
[`TraceMyMoneyAPI`](https://github.com/TraceMyMoney/TraceMyMoneyAPI).

## Run it locally

You need Node.js 18+ and a running API (see the API repo's README).

```bash
cd TraceMyMoneyUI
npm install
npm run dev          # http://localhost:5173
```

**Which API does it call?** `VITE_TM_BACKEND_URL` decides. If it is not set, `npm run dev` uses
`http://<the page's own hostname>:5000` and a production build uses `https://api.stalk-my-money.in`.
So either start the API on port 5000 (`uv run uvicorn main:app --reload --port 5000`) or point the app
at the port you use by creating `.env.local`:

```env
VITE_TM_BACKEND_URL=http://localhost:8000
```

Important: **no trailing slash.** The store builds URLs like `${VITE_TM_BACKEND_URL}/register`, so a
trailing slash gives `//register` and a 404. Production builds read `.env.prod`.

## Build

```bash
npm run build:prod   # production build into dist/
npm run preview      # serve the build locally
```

## Deploy

The front end is deployed to Surge from the `master` branch by `.github/workflows/deploy_on_surge.yaml`
(it copies `index.html` to `200.html` so deep links like `/oauth/authorize` work on the static host).

## What is in the app

- Landing page with the Vanta birds background, login, register, and the email flows
  (confirm email, forgot password, reset password).
- Dashboard: accounts, expense table, tags, search, analytics, AI chat assistant, profile, admin page.
- Bank SMS ingest setup, and the Claude connector (approval page and "Connected apps").
- The MCP address box (landing page and dashboard) shows the connector URL and how to set it up.

## Structure

```
src/
├── main.jsx                 Entry: restores the JWT on boot
├── App.jsx                  Root: chooses the screen (no router; a few paths matched by pathname)
├── index.css                Global styles and CSS variables
├── store/useStore.js        Zustand store: ALL server state and API calls
└── components/              Screens and dialogs (Landing, Login, Register, Dashboard,
                             ExpenseTable, Sidebar, ChatAssistantDialog, ProfilePage,
                             EmailActions, OAuthAuthorize, McpBox, VantaBirds, ...)
```

Components never call Axios directly; they call store actions.

## Design system

Colours and fonts are CSS variables in `src/index.css`:
`--acid` #B8FF00 (accent), `--red` #FF3B5C (debits and errors), `--green` #00F0A0 (credits),
`--purple` #9B7FFF (tags). Fonts: Barlow Condensed (headings), DM Mono (numbers), Barlow (body).
Dark mode is the default; light mode uses the `body.light` class.
