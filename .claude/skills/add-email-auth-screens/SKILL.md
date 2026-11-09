---
name: add-email-auth-screens
description: Add email-confirmation, forgot-password and reset-password screens (and the "check your email" and unverified-login states) to the no-router React/Zustand app. Use when adding any page reached from an emailed link, or any logged-out flow.
---

# Email and auth screens in a no-router SPA

Reference: `src/components/EmailActions.jsx`, `src/App.jsx`, `src/components/Login.jsx`,
`src/components/Register.jsx`, the email actions in `src/store/useStore.js`.
Backend side: `TraceMyMoneyAPI/.claude/skills/add-background-email/SKILL.md`.

## Routing without a router
- `App.jsx` picks the screen by `window.location.pathname` (trailing slashes stripped):
  `/verify-email`, `/forgot-password`, `/reset-password` map to their page components. Render them
  BEFORE the other branches so a logged-in or logged-out user still sees them.
- Emailed links look like `<FRONTEND_BASE_URL>/verify-email?token=...`. Read the token from `URLSearchParams`.
- "Back to login" must set the in-memory view, not only the URL. `useGoLogin()` does
  `history.pushState({}, '', '/')`, sets the login view and nudges the store (`useStore.setState({})`).
  Without it "Sign in" lands on the marketing page.
- Static hosting (Surge) needs `cp dist/index.html dist/200.html` so deep links load (already in the workflow).

## Store actions (all API calls live here)
`registerUser` (sets `verifyNotice` instead of reloading), `loginUser` (sets `needsEmailVerification` when the
403 detail starts with "Email not verified"), `resendVerification(email)`, `verifyEmailToken(token)`,
`forgotPassword(email)`, `resetPassword(token, password)`.

## Rules that bit us
- **React StrictMode runs effects twice in dev.** Guard the verify call with a `useRef` flag or the
  single-use token is spent by the first call and the second shows an error.
- Match the unverified-login error by its prefix ("Email not verified"), not the full text.
- Forgot-password and resend always show the same neutral message ("If that email is registered, we've sent
  a message"), whether or not the account exists. Do not reveal which.
- After "Verified" or "Password updated", show one clear next action ("Sign in").
- Keep typed values when a request fails; show the server's message in plain language.
- `VITE_TM_BACKEND_URL` must not end with `/` (the store builds `${BASE_URL}/register`).
- Style with the existing `auth-*` classes (`auth-note`, `auth-status`, `auth-forgot-row`).

## Verify
Local API with the Mailgun variables empty logs each email and its link: copy the link into the browser.
Check: signup notice, resend, verify (and a second click), forgot, reset (second use fails), login blocked
until verified, and phone width.
