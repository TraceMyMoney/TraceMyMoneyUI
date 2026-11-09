---
name: add-oauth-approval-page
description: Build the "Authorize this app?" approval page and the "Connected apps" list for an OAuth connector (Claude/MCP) in the no-router React app, including Surge deep-link fallback. Use when adding an OAuth consent screen or a list of revocable connections.
---

# OAuth approval page and Connected apps

Reference: `src/components/OAuthAuthorize.jsx`, `src/components/ProfilePage.jsx` ("Connected apps"),
`claudeConnections` actions in `src/store/useStore.js`, `src/App.jsx`.
Backend side: `TraceMyMoneyAPI/.claude/skills/build-mcp-server/SKILL.md`.

## Flow
1. Claude opens `GET <api>/oauth/authorize?...`; the API validates and redirects the browser to
   `<frontend>/oauth/authorize?client_id=...&redirect_uri=...&state=...&code_challenge=...`.
2. `App.jsx` matches the path with `pathname.startsWith('/oauth/authorize')`. If the user is not logged in it
   shows Login/Register first, then the approval page (the query string must survive the login).
3. The page calls `GET /oauth/authorize/info` (shows the app name and where it will redirect), then
   `POST /oauth/authorize/decision` with approve or deny. The API answers `{redirect_url}` and the browser
   goes there (back to Claude). Do not put the JWT in a form field: use the normal session via axios.
4. Show what the app can do (a short permission list), which account is signed in, and two clear buttons.
   Show an invalid-request message if `info` fails.

## Connected apps (Profile)
- `fetchClaudeConnections` -> `GET /oauth/connections`; revoke -> `DELETE /oauth/connections/{id}` and remove
  the row from state at once.
- Show the connector address with a copy button (`CopyBox`) and how to add it in claude.ai
  (Settings, Connectors, Add custom connector, paste, sign in, approve). The same address box appears on the
  landing page and dashboard (`McpBox.jsx`).

## Deploy notes
- The page must exist in production BEFORE connecting from claude.ai: merge to `master` (Surge deploys only
  from `master`) or deploy by hand.
- Surge needs `dist/200.html` (a copy of `index.html`) or `/oauth/authorize` gives "page not found".
- The API needs `FRONTEND_BASE_URL` set in production, or the redirect goes to `http://localhost:5173`.
