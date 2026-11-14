# Keyboard and amount fixes: SPEC

Branch: `FRONTEND-BUG-keyboard-delete-credit-bank-nav-focus`. Repo: `TraceMyMoneyUI` only (no API change).
Written AFTER the first code pass (2026-11-14); the user pointed out the spec and plan should have come first.

## What (the user's five points)
1. Moving between expenses or entries with N / P, then pressing `D`, deletes the highlighted item.
2. After choosing the Credit chip, the amount can never be negative, and the chip must not jump back to Debit.
3. The green navigation arrow must not overlap the red flag on days over the daily limit.
4. There should be a keyboard way to move between banks (accounts).
5. Pressing Enter on "Add Entry" in an existing expense puts the cursor in the new entry's Amount field.

6. (added 2026-11-14, written BEFORE the code) In every delete confirm popup (Cancel / Delete), the Left and Right arrow keys move the selection between the two buttons.

### Point 6 details
- Scope: the shared `ConfirmDialog.jsx` (all trash buttons, the account delete and the `D` shortcut go through `requestConfirm`). The tag manager's inline "Keep it / Delete tag" row is not a popup and is left alone (say so if you want it too).
- Selection = keyboard focus on the button (the focus ring is the visible selection). Delete stays focused when the popup opens (as today), so Enter still confirms and a second `D`-then-Enter flow is unchanged.
- Left goes to Cancel, Right goes to the Delete button; at either end the key does nothing (no wrap).
- Enter or Space press the focused button (native button behaviour). Esc still cancels.
- Arrow keys must not scroll the page or reach the shortcut hook while the popup is open.
- Done means: open the popup, press Left (Cancel focused), Right (Delete focused), Enter acts on the focused one; mouse use unchanged.

7. (2026-11-14, user said points 3 and 5 were still wrong after the first pass; written BEFORE the new code)
   - Point 3 again: my guess at the real cause is the green open-day accent bar (`.expense-row-accent`, 2px, `--acid`) drawn on top of the red limit flag (4px, inset shadow). Fix: on a limit-crossed day only the red flag shows; the arrow also stays clear of it. To confirm in the browser.
   - Point 5 again, my reading (this is a guess; tell me if wrong): N / P must stop on the "Add Entry" button of each open expense (after its last entry), and Enter on it adds a new entry card and puts the cursor in its Amount field. The arrow shows next to the button.
   - Details: a new highlight position `{ expId, eeId: "__add__" }`. D, T and the edit shortcut do nothing on it (hint only). Mouse click on "Add Entry" also focuses Amount (already built). Desktop and tablet only (phones have no shortcuts).
   - Done means: open a day, press N until the arrow is on "Add Entry", press Enter: a new card appears with the cursor in Amount; N / P continue past it; D on it never deletes anything; on a day over the limit no green bar sits on the red flag.

## Rules
- `D` always asks for confirmation (`requestConfirm`) before deleting. No silent delete.
- `D` follows the existing shortcut guards: not while typing, not with Ctrl/Cmd/Alt, not while a dialog is open, not on phones.
- The Debit / Credit chip alone decides the sign. The amount field holds a positive number only (typed or pasted).
- Phone, tablet and desktop layouts stay as they are, except the arrow offset on limit-crossed rows.
- Colors only from CSS variables.

## Out of scope
- New screens or dialogs (no design draft needed: bug fixes only).
- Backend changes.
- Changing which keys move between banks, unless the user asks (J / K already exist).

## Done means
- `D` on a highlighted day row and on a highlighted entry opens the confirm dialog; Confirm deletes, Cancel keeps it; the highlight lands on a surviving neighbour.
- In the drawer and in the inline cards: choose Credit, type an amount, the chip stays Credit; `-` cannot be typed or pasted.
- On a limit-crossed row the arrow and the red edge flag do not touch.
- J / K change the account and the sidebar highlight follows; a hint shows where.
- Enter (or click) on "Add Entry" focuses the new Amount field.
- `npm run build` passes. Hand-tested in a browser (NOT yet done).
