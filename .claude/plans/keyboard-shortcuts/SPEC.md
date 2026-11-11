# Keyboard shortcuts — SPEC

Branch: `FRONTEND-FEATURE-keyboard-shortcuts`
Status: BUILT on the branch, needs a hand test in the browser. The user waived a new design draft (2026-11-11); the current UI Artifact was updated instead.

## What

Single-key shortcuts for the dashboard so a keyboard user can add, find, open and edit expenses without the mouse.
A `?` cheat-sheet lists them all. Tablet and desktop only.

## Shortcuts (open to edits)

| Key | Action |
|---|---|
| `E` | Create expense (open the Add Expense drawer) |
| `O` | Open the latest expense (highlight and expand the newest row) |
| `N` / `P` | Move the highlight to the next / previous shown expense. When a day is expanded, the highlight also steps through its entries |
| `Enter` | Expand / collapse the highlighted day; on a highlighted entry, edit it (`Space` is not used: a double Space already opens the chat) |
| `T` | Edit tags and description on the highlighted entry (ApplyTagsDialog) |
| `/` | Open the search panel and focus the search field |
| `C` | Open the chat assistant |
| `B` | Create a bank account |
| `G` then `T` | Open the tag manager (two-key combo, 1 second window) |
| `J` / `K` | Next / previous account (bank), wraps around |
| `[` / `]` | Previous / next page |
| `R` | Refresh expenses |
| `L` | Toggle light / dark mode |
| `S` | Toggle the sidebar |
| `Esc` | Close the topmost dialog, drawer or panel; if none is open, clear the highlight |
| `?` | Show / hide the cheat-sheet |

## Add Expense form (keys inside the drawer)

Amount is focused on open (not on phones). `Enter` in Amount goes to Description; `Enter` in Description or `Ctrl`/`Cmd`+`Enter` anywhere submits; `Esc` closes.

## Rules

1. Shortcuts are ignored while focus is in an `input`, `textarea`, `select` or `contenteditable` element.
2. Shortcuts are ignored when `Ctrl`, `Cmd` or `Alt` is held (browser shortcuts keep working). `Shift` is allowed only for `?`.
3. While a dialog or drawer is open, only `Esc` (and `?` on the cheat-sheet) works. No shortcut opens a second dialog on top.
4. Only when logged in and the dashboard is shown. Not on Landing, Login, Register, Profile, Admin or OAuth screens.
5. No shortcut deletes anything. Delete stays a deliberate click plus the existing confirm dialog.
6. Phones: shortcuts are inactive and key hints are hidden (gated on `usePhoneScreen`). Tablet and desktop get them.
7. If a shortcut has nothing to act on (for example `O` with no expenses, `T` with no highlighted entry), it does nothing and shows a short toast, not an error.
8. Key hints on buttons and the highlighted row use the existing CSS variables (`--acid` for focus/highlight). No hard-coded colors.
9. The highlighted row scrolls into view, is announced to screen readers (`aria-selected` / `aria-current`) and has a visible focus ring.
10. Animations are subtle and off for `prefers-reduced-motion`.
11. All logic lives in one hook (`useKeyboardShortcuts`) plus one cheat-sheet component. The shortcut list is defined once, in one data file, and both the handler and the cheat-sheet read it, so they cannot drift apart.
12. No Axios calls in components. Existing store actions only (see `useStore.js`).

## Out of scope

- Custom or user-remapped shortcuts.
- Shortcuts on phones or any on-screen keyboard bar.
- Shortcuts for delete, logout, profile, admin or analytics.
- Multi-row selection and bulk actions.
- Backend changes (none needed).

## Done means

- Every key in the table works on desktop and tablet, in dark and light mode, and does nothing on phone.
- Rules 1 to 10 are checked by hand in the browser (there is no test runner), including typing in the search box, with a dialog open, and with Ctrl/Cmd held.
- The cheat-sheet and row highlight match the approved Artifact draft exactly (see PLAN.md), with "Matches the approved draft: yes" reported.
- `npm run build` passes.
- Plan status updated, general lessons added to a skill, and the "Current UI design" Artifact updated for the new dialog.

## Decisions (defaults used, change on request)

1. Key list as in the table above.
2. Key hints are shown on the Search, Tags and Add Expense buttons; hidden on touch screens (`hover: none`).
3. `T` works only on a highlighted entry (not a day row); otherwise a hint toast explains what to do.
4. A mouse click on a row also moves the highlight, so N / P continue from there.
