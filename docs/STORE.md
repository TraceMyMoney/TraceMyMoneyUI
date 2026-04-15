# STORE.md — Global State & API Actions

> File: `src/store/useStore.js`
>
> This is the single most important file in the frontend.
> It holds **all shared data** (state) and **all backend API calls** (actions).
> Every component reads from here and writes to here.
> Nothing is stored locally inside a component unless it is purely UI-only (like "is this dropdown open?").

---

## Table of Contents

1. [What is Zustand?](#1-what-is-zustand)
2. [How to read from the store](#2-how-to-read-from-the-store)
3. [Helper functions (top of file)](#3-helper-functions-top-of-file)
4. [All State Fields](#4-all-state-fields)
5. [All Setter Actions](#5-all-setter-actions)
6. [All API Actions](#6-all-api-actions)
7. [Data flow example — end to end](#7-data-flow-example--end-to-end)

---

## 1. What is Zustand?

Zustand is a **global state manager** — think of it as a JavaScript object that:

- Lives outside of any component
- Any component anywhere in the app can read values from it
- Any component can call functions inside it to change values
- When a value changes, **every component that uses that value automatically re-renders**

The alternative would be "prop drilling" — passing data down through 5 levels of components. Zustand eliminates that completely.

The store is created once:

```js
export const useStore = create((set, get) => ({
  // state fields and actions go here
}))
```

- `set(...)` — updates state. React will re-render all components that read the updated field.
- `get()` — reads the current state from inside an action (needed because `set` is async-safe).

---

## 2. How to read from the store

Inside any component, you destructure what you need:

```js
const { banksList, privacyMode, fetchExpenses } = useStore()
```

Only destructure what you need. The component will only re-render when those specific fields change.

To read state **outside** a component (e.g. in an event handler or a non-React file):

```js
useStore.getState().pushAlert("Something went wrong")
```

---

## 3. Helper functions (top of file)

These are plain JavaScript functions defined before the store. They are not React hooks.

### `parseJwt(token)`
- Takes a JWT string (the login token)
- Decodes the middle part (payload) from base64
- Returns a plain object with fields like `{ user_name: "parimal" }`
- Used in `main.jsx` to extract the username from the stored token on app boot

### `handleError(err)`
- Takes an Axios error object
- Checks if the status is 401 (Unauthorized) → clears the token and tells the user to log in again
- Otherwise extracts a human-readable error message from the response
- Returns a string like "Bank not found" or "Session expired. Please login again."
- Every API action's `catch` block calls this

### `formatMyDates(date)`
- Takes a JavaScript `Date` object
- Returns a string in `DD/MM/YYYY` format (e.g. `"13/04/2025"`)
- Used when sending dates to the backend

### `filterValidExpenses(list)`
- Takes a raw array of expense entry objects
- Filters out any entry where `amount` or `description` is empty/zero
- For entries with a negative amount, it forces `expense_entry_type: "ADD"` (this is the backend's signal for a credit/top-up)
- Returns a clean array ready to send to the API

### `fmtNum(value, privacy)`
- Formats a number using Indian number formatting (e.g. `7139` → `"7,139"`)
- If `privacy` is `true`, returns `"••••"` instead (privacy mode)
- Used everywhere amounts are displayed

### `initAxiosToken()`
- Runs once on app boot (called from `main.jsx`)
- Reads `access_token` from `localStorage`
- If found, sets it as the default `Authorization` header for all Axios requests
- Returns the decoded JWT payload (or null if no token)

---

## 4. All State Fields

These are the data fields stored globally. Think of them as the app's "memory".

### Auth & UI

| Field | Type | Default | What it means |
|---|---|---|---|
| `userName` | string \| null | `null` | The logged-in user's display name |
| `isLoggedIn` | boolean | `false` | Whether the user is authenticated |
| `showLoginPage` | boolean | `true` | Controls Login vs Register screen |
| `isDarkMode` | boolean | `true` | Dark mode enabled |
| `privacyMode` | boolean | `false` | When true, all money amounts show as `••••` |
| `showLoader` | boolean | `false` | When true, the full-screen spinner appears |
| `showAlert` | boolean | `false` | When true, the error toast is visible |
| `alertMessages` | string[] | `[]` | List of error messages to show in the toast |

### Banks / Accounts

| Field | Type | Default | What it means |
|---|---|---|---|
| `banksList` | array | `[]` | Full list of bank objects `{ bankName, remainingBalance, bankId }` |
| `bankItems` | array | `[]` | Simplified list for dropdowns `{ title, value }` — same banks, different shape |
| `banksDisplayOrder` | string[] | `[]` | Ordered list of bank IDs from user preferences. Used to sort `banksList` after every fetch. |
| `currentSelectedBankId` | string \| null | `null` | The bank whose expenses are currently shown in the table |

### Expenses

| Field | Type | Default | What it means |
|---|---|---|---|
| `filteredExpensesList` | array | `[]` | The expenses shown in the current table page |
| `currentTotalExpenses` | number | `0` | Total expense record count (used for pagination math) |
| `currentTotalOfExpenses` | number | `0` | Sum of all debit amounts across all pages (backend-computed) |
| `currentTotalOfTopupExpenses` | number | `0` | Sum of all credit/top-up amounts across all pages (backend-computed) |
| `expenseEntryCreationDate` | string | today | The date string sent with new expense submissions `"DD/MM/YYYY HH:MM"` |

### Tags

| Field | Type | Default | What it means |
|---|---|---|---|
| `entryTags` | array | `[]` | All available tags `{ title, value }`, sorted alphabetically |
| `isApplyEntryTagVisible` | boolean | `false` | Controls whether the Edit Entry dialog is open |
| `applyTagEntry` | object \| null | `null` | The entry object currently being edited in the dialog |
| `selectedTags` | array | `[]` | Tags currently selected in the Edit Entry dialog |

### Search & Pagination

| Field | Type | Default | What it means |
|---|---|---|---|
| `pageNumber` | number | `1` | Current page number |
| `pageSize` | number \| "all" | `5` | How many expenses to show per page |
| `searchSelectedTags` | string[] | `[]` | Tag IDs chosen in the search panel filter |
| `searchSelectedBanks` | string[] | `[]` | Bank IDs chosen in the search panel filter |
| `searchEntryKeyword` | string | `""` | Free-text keyword for description search |
| `searchSelectedDaterange` | array \| null | `null` | `[startDate, endDate]` from the date picker |
| `searchOperator` | string | `"and"` | Whether to match ALL filters (`"and"`) or ANY (`"or"`) |
| `isAdvancedSearch` | boolean | `false` | Whether a search filter is currently active |

### Dialogs

| Field | Type | Default | What it means |
|---|---|---|---|
| `isCreateBankDialogVisible` | boolean | `false` | Controls the New Account dialog |

---

## 5. All Setter Actions

These are simple one-line functions that just call `set({...})` to update a single field.
They exist so components don't directly manipulate state — they call a named function instead.

```
setUserName(v)               → userName
setLoggedInStatus(v)         → isLoggedIn
setLoginPageStatus(v)        → showLoginPage  (true = Login, false = Register)
setShowAlert(v)              → showAlert
setAlertMessages(v)          → alertMessages
setShowLoader(v)             → showLoader
setCreateBankDialogVisible(v)→ isCreateBankDialogVisible
setApplyEntryTagVisible(v)   → isApplyEntryTagVisible
setApplyTagEntry(v)          → applyTagEntry
setSelectedTags(v)           → selectedTags
setPageNumber(v)             → pageNumber
setPageSize(v)               → pageSize
setSearchSelectedTags(v)     → searchSelectedTags
setSearchSelectedBanks(v)    → searchSelectedBanks
setSearchEntryKeyword(v)     → searchEntryKeyword
setSearchSelectedDaterange(v)→ searchSelectedDaterange
setSearchOperator(v)         → searchOperator
setAdvancedSearch(v)         → isAdvancedSearch
setExpenseEntryCreationDate(v)→ expenseEntryCreationDate
setIsDarkMode(v)             → isDarkMode
setPrivacyMode(v)            → privacyMode
```

### `pushAlert(msg)`
Special setter — appends a new message to `alertMessages` and sets `showAlert = true`.
Used everywhere an API call fails:
```js
get().pushAlert("Something went wrong")
```

### `_parseExpenses(data)`
Internal helper — not called by components.
Extracts `expenses`, `topup_total`, `non_topup_total`, `total_expenses` from the API response object and returns them in a consistent shape.

---

## 6. All API Actions

These are `async` functions that make HTTP calls using Axios.
Every one of them follows the same pattern:

```
1. Show loader (set showLoader: true)         ← user sees spinner
2. Make the API call (await axios.get/post/patch/delete)
3. Update state with the response data
4. Hide loader (set showLoader: false)        ← spinner gone
5. On error → call pushAlert(handleError(err))
```

---

### `getInitialData()`

**When called:** Once on app boot, triggered by `App.jsx` when `isLoggedIn` becomes true.

**What it does:**
1. Makes two API calls **in parallel** (at the same time, not one after the other):
   - `GET /banks/` — all the user's bank accounts
   - `GET /user-preferences/` — dark mode, privacy mode, page size, bank display order
2. Applies dark/light mode to `document.body` immediately
3. Sorts the banks array using `banks_display_order` from preferences
4. Sets `banksList`, `bankItems`, `banksDisplayOrder`, `pageSize`, `isDarkMode`, `privacyMode`
5. Then fetches the first page of expenses for the first bank
6. Also fetches all tags

**Why parallel?** Using `Promise.all([...])` cuts load time in half. Both requests fly out simultaneously instead of waiting for the first to finish before starting the second.

---

### `fetchBanks()`

**When called:** After creating or deleting a bank (to refresh the list with updated balances).

**What it does:**
- `GET /banks/`
- Re-applies `banksDisplayOrder` from current state to keep the user's custom sort order intact
- Updates `banksList` and `bankItems`

**Important:** This does NOT touch `currentSelectedBankId` — the currently selected bank stays selected.

---

### `fetchFilteredExpensesList(bank)`

**When called:** When the user clicks a bank in the sidebar.

**What it does:**
- Updates `currentSelectedBankId` to the clicked bank
- `GET /expenses/?bank_id=...&per_page=...&page_number=...`
- Updates the expense table data

---

### `fetchExpenses(options)`

**When called:** After adding/editing/deleting an expense, changing page, or running a search.

**Options:**
- `{ silent: true }` — skips the loader spinner (used for background refreshes after mutations)

**What it does:**
- Builds a query object based on current search/filter state
- If `isAdvancedSearch` is true, includes tags, banks, keyword, date range
- Otherwise just filters by `currentSelectedBankId`
- `GET /expenses/?data=...` (the whole query is JSON-stringified into a single param)
- Updates `filteredExpensesList` and all totals

---

### `submitExpense(data)`

**When called:** When the user submits the Add Expense drawer.

**Payload shape:**
```json
{
  "bank_id": "abc123",
  "expenses": [
    { "amount": 500, "description": "Rent", "entry_tags": [] }
  ]
}
```

**What it does:**
- `POST /expenses/create`
- On success (201): silently refreshes expenses AND banks in parallel (balances change)
- Returns `true` so the drawer knows to close itself

---

### `submitExpenseEntry(expenseId, list)`

**When called:** When the user adds new entries to an existing expense row (the inline add form).

**What it does:**
- `PATCH /expenses/add-entry?id=<expenseId>` with `{ entries: [...] }`
- On success (201): silently refreshes expenses and banks
- Returns `true` so the inline form knows to clear itself

---

### `deleteExpense(id)`

**When called:** When the user clicks the trash icon on an expense row and confirms.

**What it does:**
- `DELETE /expenses/delete?id=<id>`
- On success (204): silently refreshes expenses and banks

---

### `deleteExpenseEntry(expenseId, eeId)`

**When called:** When the user clicks the trash icon on a single entry inside an expanded expense row.

**What it does:**
- `DELETE /expenses/delete-entry?id=<expenseId>&ee_id=<eeId>`
- On success (204): silently refreshes expenses and banks

---

### `applyTagsToExpenseEntry(data)`

**When called:** When the user saves changes in the Edit Entry dialog (ApplyTagsDialog).

**Payload shape:**
```json
{
  "entry_id": "abc",
  "expense_id": "xyz",
  "entry_tags": ["tag1", "tag2"],
  "updated_description": "New description"
}
```

**What it does:**
- `PATCH /expenses/update-entry`
- Updates `selectedTags` from the response
- Closes the dialog
- Silently refreshes expenses

---

### `createNewTag(name)`

**When called:** When the user submits the Create Tag dialog.

**What it does:**
- `POST /entry-tags/create` with `{ name }`
- On success (201): does a full `window.location.reload()` to re-fetch all tags fresh

---

### `createBank(data)`

**When called:** When the user submits the New Account dialog.

**What it does:**
- `POST /banks/create` with `{ name, initial_balance, current_balance, total_disbursed_till_now: 0 }`
- On success (200): full page reload

---

### `deleteBank(bankId)`

**When called:** When the user clicks the × button on a bank card and confirms.

**What it does:**
- `DELETE /banks/delete?bank_id=<bankId>`
- On success (204): full page reload

---

### `loginUser(data)`

**When called:** Login form submission.

**What it does:**
- `POST /login` with `{ username, password }`
- On success: saves the token to `localStorage`, sets it on Axios headers, reloads the page
- The reload triggers `main.jsx` to pick up the token and set `isLoggedIn = true`

---

### `registerUser(data)`

**When called:** Register form submission.

**What it does:**
- `POST /register` with `{ username, email, password }`
- On success (200): full page reload (user is not auto-logged-in; they go to the login screen)

---

### `logoutUser()`

**When called:** Logout button click.

**What it does:**
- Removes `access_token` from `localStorage`
- Deletes the `Authorization` header from Axios
- Full page reload — app boots fresh, sees no token, shows Login screen

---

### `updateUserPreferences(payload)`

**When called:** Dark mode toggle, privacy mode toggle, page size change.

**How it works (Optimistic Update):**

This action uses a pattern called **optimistic update** — the UI changes immediately without waiting for the server.

```
Step 1: Save the current value in a `prev` variable (for rollback)
Step 2: Apply the new value to state RIGHT NOW → UI updates instantly
Step 3: Fire PATCH /user-preferences/update to the backend
Step 4: If the backend returns an error:
         → Restore the old value from `prev`
         → Show an error toast
```

This means dark mode / privacy mode toggles feel instant with zero latency.

**Supported payload keys:**
```json
{ "is_dark_mode": true }
{ "privacy_mode_enabled": false }
{ "page_size": 10 }
```

---

### `reorderBanks(orderedIds)`

**When called:** After the user drag-and-drops a bank card to a new position in the sidebar.

**Parameter:** `orderedIds` — array of bank ID strings in the new order.

**How it works (Optimistic Update):**

```
Step 1: Re-sort banksList and bankItems in state immediately → sidebar reorders instantly
Step 2: Also update banksDisplayOrder in state (so fetchBanks() respects the new order)
Step 3: Fire PATCH /user-preferences/update with { banks_display_order: orderedIds }
Step 4: If error → show alert and call fetchBanks() to revert to server state
```

---

## 7. Data flow example — end to end

Here is what happens when the user **adds a new expense** from start to finish:

```
User opens Add Expense drawer
  → drawerOpen = true  (local state in Dashboard.jsx)

User fills in: Amount=500, Description="Groceries", Type=Debit
  → entries state in AddExpenseDrawer.jsx updates on each keystroke

User clicks Submit
  → submit() runs in AddExpenseDrawer.jsx
  → setExpenseEntryCreationDate("13/04/2025 00:00")  ← store setter
  → filterValidExpenses() cleans the entries array
  → submitExpense({ bank_id: "abc", expenses: [...] }) ← store action

Inside submitExpense():
  → set({ showLoader: true })          ← Loader.jsx sees this, shows spinner
  → POST /expenses/create
  → on 201 success:
      → fetchExpenses({ silent: true }) ← updates the table quietly
      → fetchBanks()                    ← updates bank balance in sidebar
      → returns true

Back in AddExpenseDrawer.jsx:
  → ok = true
  → clears entries state
  → calls onClose() → drawerOpen = false → drawer slides away

Meanwhile:
  → fetchExpenses finishes → filteredExpensesList updates → ExpenseTable re-renders
  → fetchBanks finishes → banksList updates → Sidebar re-renders with new balance
  → set({ showLoader: false }) → spinner disappears
```

This is the complete cycle. Every user action follows this same pattern.
```

Now create the components documentation: