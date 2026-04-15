# COMPONENTS.md — Every Component Documented

> This file documents every React component in `src/components/`.
> For each component you will find:
> - What it does in plain English
> - What props it accepts
> - Every `useState` variable explained
> - Every `useEffect` explained
> - How it connects to the store
> - Any special logic worth knowing

---

## Table of Contents

1. [App.jsx](#1-appjsx)
2. [main.jsx](#2-mainjsx)
3. [Login.jsx](#3-loginjsx)
4. [Register.jsx](#4-registerjsx)
5. [Dashboard.jsx](#5-dashboardjsx)
6. [Topbar.jsx](#6-topbarjsx)
7. [Sidebar.jsx](#7-sidebarjsx)
8. [ExpenseTable.jsx](#8-expensetablejsx)
9. [AddExpenseDrawer.jsx](#9-addexpensedrawerjsx)
10. [SearchPanel.jsx](#10-searchpaneljsx)
11. [Pagination.jsx](#11-paginationjsx)
12. [CreateBankDialog.jsx](#12-createbankdialogjsx)
13. [CreateTagDialog.jsx](#13-createtagdialogjsx)
14. [ApplyTagsDialog.jsx](#14-applytagsdialogjsx)
15. [ChatAssistantDialog.jsx](#15-chatassistantdialogjsx)
16. [TagSearchSelect.jsx](#16-tagsearchselectjsx)
17. [Loader.jsx](#17-loaderjsx)
18. [AlertToast.jsx](#18-alerttoastjsx)

---

## 1. App.jsx

**File:** `src/App.jsx`  
**Purpose:** The root component. It is the first thing React renders. It decides which screen to show — Dashboard, Login, or Register — based on login state.

### Props
None. This is the top-level component, nothing passes props into it.

### Store fields used
```
isLoggedIn      — true if user is authenticated
showLoginPage   — true = show Login, false = show Register
isDarkMode      — needed to sync the body CSS class on first load
getInitialData  — called once after login is confirmed
```

### useState
None. All state here comes from the store.

### useEffect #1 — Dark mode sync
```js
useEffect(() => {
  if (!isDarkMode) document.body.classList.add('light')
  else document.body.classList.remove('light')
}, [isDarkMode])
```
**When it runs:** Every time `isDarkMode` changes (including the very first render).  
**What it does:** Adds or removes the CSS class `"light"` on the `<body>` element. The CSS file uses `body.light` selectors to override all the dark-mode colour variables with light-mode values. This is the entire dark/light mode mechanism.

### useEffect #2 — Initial data load
```js
useEffect(() => {
  if (isLoggedIn) getInitialData()
}, [isLoggedIn])
```
**When it runs:** When `isLoggedIn` changes from `false` to `true`.  
**What it does:** Triggers the big initial data fetch (banks + preferences + expenses + tags). See `STORE.md → getInitialData()` for full details.

### Render logic
```
isLoggedIn = true  →  <Dashboard />
isLoggedIn = false and showLoginPage = true   →  <Login />
isLoggedIn = false and showLoginPage = false  →  <Register />
```

`<Loader />` and `<AlertToast />` are always rendered regardless of login state — they just show/hide themselves based on store flags.

---

## 2. main.jsx

**File:** `src/main.jsx`  
**Purpose:** The JavaScript entry point. Runs before React renders anything. Restores the login session from `localStorage`.

### What it does step by step
```
1. Calls initAxiosToken()
      → reads "access_token" from localStorage
      → if found: sets axios Authorization header + decodes JWT
      → returns { user_name: "parimal", ... } or null

2. If a token was found:
      → sets userName in the store
      → sets isLoggedIn = true in the store

3. Renders <App /> into the #root div in index.html
```

**Why this matters:** Without this step, refreshing the page would always log the user out. By reading localStorage before React renders, the user stays logged in across browser refreshes.

---

## 3. Login.jsx

**File:** `src/components/Login.jsx`  
**Purpose:** The sign-in form. Shown when the user is not logged in.

### Props
None.

### Store actions used
```
loginUser(data)       — POST /login, saves token, reloads page
setLoginPageStatus(v) — switches to Register screen when user clicks "Create one →"
```

### useState
```js
const [username, setUsername] = useState('')  // tracks the username input field
const [password, setPassword] = useState('')  // tracks the password input field
const [showPw, setShowPw]     = useState(false) // toggles password visibility (eye icon)
```

### useEffect
None.

### Special logic
- The Submit button is `disabled` when either field is empty — React re-evaluates this on every render.
- Pressing `Enter` in either input calls `submit()` — via `onKeyDown={e => e.key === 'Enter' && submit()}`.
- The `autoFocus` attribute on the username input means the cursor lands there automatically when the page loads.

---

## 4. Register.jsx

**File:** `src/components/Register.jsx`  
**Purpose:** The account creation form.

### Props
None.

### Store actions used
```
registerUser(data)    — POST /register
setLoginPageStatus(v) — switches back to Login screen
```

### useState
```js
const [form, setForm] = useState({
  username: '',
  email: '',
  password: '',
  confirm: ''   // the "confirm password" field
})
const [showPw, setShowPw] = useState(false) // toggles password visibility
```

### useEffect
None.

### Special logic
```js
const mismatch = form.confirm && form.password !== form.confirm
// → true when the user has typed something in "confirm" but it doesn't match "password"
// → shows a red "Passwords don't match" message

const ok = form.username && form.email && form.password && form.password === form.confirm
// → true only when ALL fields are filled AND passwords match
// → the Submit button is disabled unless ok = true
```

The `up` helper is a factory function that returns an `onChange` handler for each field:
```js
const up = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
// Usage: onChange={up('username')}
// This is a shorthand to avoid writing a separate handler for each input.
```

---

## 5. Dashboard.jsx

**File:** `src/components/Dashboard.jsx`  
**Purpose:** The main screen after login. It is the "container" that assembles all the other components. It owns the open/closed state of every dialog and panel.

### Props
None.

### Store actions used
```
setApplyEntryTagVisible(v)  — opens/closes the Edit Entry dialog
setApplyTagEntry(entry)     — sets which entry is being edited
```

### useState
```js
const [sidebarOpen, setSidebarOpen]   = useState(false)
// Mobile only — controls whether the sidebar drawer slides in from the left.
// On desktop the sidebar is always visible via CSS.

const [drawerOpen, setDrawerOpen]     = useState(false)
// Controls whether the Add Expense sliding drawer is open.

const [searchOpen, setSearchOpen]     = useState(false)
// Controls whether the search/filter panel is expanded below the command bar.

const [tagDialogOpen, setTagDialogOpen] = useState(false)
// Controls the Create Tag modal.

const [tagFilter, setTagFilter]       = useState(null)
// Currently active tag filter (not fully wired up in the visible UI, reserved for future).

const [chatOpen, setChatOpen]         = useState(false)
// Controls the Chat Assistant dialog.
```

### useEffect — Double-Space chat shortcut
```js
useEffect(() => {
  let lastSpaceAt = 0
  const DOUBLE_MS = 480

  const onKeyDown = (e) => {
    if (e.code !== "Space") return
    if (chat is already open) return
    if (user is typing in an input/textarea) return
    e.preventDefault()
    const now = Date.now()
    if (now - lastSpaceAt < DOUBLE_MS) {
      // Second space pressed within 480ms → open chat
      setChatOpen(true)
    } else {
      lastSpaceAt = now  // record first space time
    }
  }

  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}, [])
```
**What this does:** Lets the user press Space twice quickly (within 480ms) anywhere on the page to open the chat. The `isTypingInField()` check prevents it from triggering while the user is typing in an input, textarea, or select element.

### handleEditEntry
```js
const handleEditEntry = (entry) => {
  setApplyTagEntry(entry)         // store the entry being edited
  setApplyEntryTagVisible(true)   // open the dialog
}
```
This is passed as a prop to `ExpenseTable`. When the user clicks on an entry description, the table calls this function with the entry data, and the Edit Entry dialog opens pre-filled.

### Layout structure
```
<div class="app-shell">
  <Topbar />
  <div class="body-layout">
    <Sidebar />
    <main class="main-content">
      command bar (search button + Add Expense + Tag buttons)
      <SearchPanel />
      <ExpenseTable />
      <Pagination />
    </main>
  </div>
  <button class="mobile-fab" />   ← floating + button on mobile
  <AddExpenseDrawer />
  <CreateBankDialog />
  <CreateTagDialog />
  <ApplyTagsDialog />
  <ChatAssistantDialog />
</div>
```

---

## 6. Topbar.jsx

**File:** `src/components/Topbar.jsx`  
**Purpose:** The top navigation bar visible on all screens. Contains the logo, dark mode toggle, privacy toggle, user name, logout button, and chat button.

### Props
```
onMenuClick   — function called when the ☰ hamburger button is clicked (opens sidebar on mobile)
onOpenChat    — function called when the chat icon button is clicked
```

### Store fields used
```
userName              — displayed in the user chip (top-right)
isDarkMode            — determines which icon to show (☀ or ◑)
privacyMode           — determines which icon to show (Eye or EyeOff)
updateUserPreferences — called when dark mode or privacy mode buttons are clicked
logoutUser            — called when the ⏻ logout button is clicked
```

### useState / useEffect
None. This is a "stateless" component — it only reads from the store and fires actions.

### Responsive behaviour
The dark mode toggle, privacy toggle, and logout button all have the class `topbar-desktop-only`. The CSS hides these on mobile screens (≤860px). On mobile, these controls are available in the sidebar instead.

---

## 7. Sidebar.jsx

**File:** `src/components/Sidebar.jsx`  
**Purpose:** The left panel showing all bank/wallet accounts. Clicking a bank loads its expenses. Also contains dark mode, privacy, and logout controls on mobile. Supports drag-and-drop reordering of banks.

### Props
```
open          — boolean, whether the sidebar is slid open (mobile only)
onClose       — function to close the sidebar (mobile only)
activeTagFilter — reserved for future tag filtering from sidebar
onTagFilter   — reserved for future tag filtering from sidebar
```

### Store fields used
```
banksList               — array of bank objects to render
privacyMode             — for showing/hiding balances
isDarkMode              — for the dark/light mode toggle button
updateUserPreferences   — called by dark mode + privacy toggles
logoutUser              — logout button
fetchFilteredExpensesList — called when a bank is clicked
setCreateBankDialogVisible — called by the + New Account button
deleteBank              — called by the × button on each bank card
reorderBanks            — called after drag-and-drop to persist the new order
```

### useState
```js
const [activeIdx, setActiveIdx] = useState(0)
// Index (0, 1, 2...) of the currently selected bank card.
// The card at this index gets the "active" CSS class (highlighted).

const [dragOverIdx, setDragOverIdx] = useState(null)
// Index of the bank card that the user is currently hovering over during a drag.
// That card gets the "account-card--drag-over" CSS class (green glow border).

const [isDragging, setIsDragging] = useState(false)
// True while any card is being dragged.
// The card being dragged gets the "account-card--dragging" CSS class (faded + dashed border).
```

### useRef
```js
const dragSrcIdx = useRef(null)
// Stores the index of the card that started the drag.
// A ref (not state) because changing it should NOT trigger a re-render.

const ghostRef = useRef(null)
// On mobile touch drag, stores the floating clone element that follows the finger.
// Created in handleTouchStart, removed in resetDragState.

const listRef = useRef(null)
// Reference to the <div> wrapper around all bank cards.
// Used in cardIndexAtPoint() to find which card the finger is over.

const touchOffset = useRef({ x: 0, y: 0 })
// On mobile, stores how far from the card's top-left corner the finger first touched.
// Used to position the ghost correctly so it doesn't jump to center.

const didDragRef = useRef(false)
// Set to true the moment the finger actually moves during a touch.
// Prevents the onClick from firing after a touch-drag ends
// (browsers fire a click event after touchend even if the user dragged).
```

### useEffect — Non-passive touchmove listener
```js
useEffect(() => {
  const el = listRef.current
  const onTouchMove = (e) => {
    if (dragSrcIdx.current !== null) e.preventDefault()
  }
  el.addEventListener('touchmove', onTouchMove, { passive: false })
  return () => el.removeEventListener('touchmove', onTouchMove)
}, [])
```
**Why this exists:** React's synthetic `onTouchMove` handler cannot call `e.preventDefault()` because React registers all touch listeners as "passive" by default for performance. Passive listeners cannot prevent scrolling. This effect registers a native (non-React) listener with `{ passive: false }` directly on the DOM element so we CAN call `e.preventDefault()` to block the page from scrolling while the user is dragging a bank card.

### Drag handlers — Mouse (Desktop)
```
handleDragStart(e, i)   — records dragSrcIdx, sets isDragging = true, sets dataTransfer (for Firefox)
handleDragOver(e, i)    — e.preventDefault() (required for drop to fire), sets dragOverIdx = i
handleDragLeave(e, i)   — clears dragOverIdx when cursor leaves a card
handleDrop(e, dropIdx)  — computes new order, calls commitReorder()
handleDragEnd()         — clears all drag state
```

### Drag handlers — Touch (Mobile)
```
handleTouchStart(e, i)  — records src index, creates a floating ghost clone of the card
                          appended to document.body, styles it with position:fixed
handleTouchMove(e)      — moves the ghost to follow the finger, highlights card under finger
handleTouchEnd(e)       — finds drop target, calls commitReorder(), removes ghost
```

### commitReorder(srcIdx, dropIdx)
The shared logic for both mouse and touch. Takes the source and destination index, builds a new ordered array, calls `reorderBanks(newIds)`, and updates `activeIdx` to follow whichever card was active before the drag.

---

## 8. ExpenseTable.jsx

**File:** `src/components/ExpenseTable.jsx`  
**Purpose:** The main data table. Shows all expense records. Each row can be expanded to see individual entries. Also contains the inline add-entry form and the totals footer row.

This file has **three components** inside it:

---

### 8a. InlineAddEntries (internal)

**Purpose:** The inline form that appears at the bottom of an expanded expense row, letting the user add new entries to an existing expense without opening a full dialog.

### Props
```
expenseId   — string, the ID of the parent expense record
mini        — boolean, true on mobile (uses a different CSS class for smaller padding)
```

### useState
```js
const [entries, setEntries] = useState([])
// Array of entry objects: { amount: "", description: "", tags: [], type: "debit" }
// Starts empty. User clicks "+ Add Entry" to add rows.
// Each row renders one amount input, one description input, and a Debit/Credit toggle.
```

### Entry type logic
Each entry has a `type` field (`"debit"` or `"credit"`). On submit, the sign is applied:
```js
amount: e.type === "credit"
  ? -Math.abs(Number(e.amount))   // credit = negative = top-up
  : Math.abs(Number(e.amount))    // debit  = positive = expense
```

### Auto-switch toggle
When the user types a negative number in the amount field, the toggle automatically switches to Credit:
```js
if (k === "amount" && v !== "" && v !== "-") {
  updated.type = Number(v) < 0 ? "credit" : "debit"
}
```
The `v !== "-"` guard prevents switching while the user is mid-typing (just typed the minus sign, no digits yet).

---

### 8b. DesktopRow (internal)

**Purpose:** Renders a single expense record as a grid row for desktop screens. Clicking the row expands it to show entries.

### Props
```
exp         — the expense object from the API
open        — boolean, whether this row is expanded
onToggle    — function to toggle open/closed
onEditEntry — function to open the Edit Entry dialog for a specific entry
```

### useState
```js
const [hovEnt, setHovEnt] = useState(null)
// Stores the ee_id (entry ID) of whichever entry the mouse is hovering over.
// Used to show/hide the delete button on hover (opacity: 0 → 1).
// On mobile there is no hover, so the delete button is always visible.
```

---

### 8c. MobileCard (internal)

**Purpose:** Renders a single expense as a card for mobile screens. The CSS hides desktop rows and shows mobile cards on small screens (≤600px), and vice versa on large screens.

### Props
Same as DesktopRow.

### useState
None. The mobile card does not track hover state.

---

### 8d. ExpenseTable (main export)

### Props
```
onEditEntry — function passed down from Dashboard, called when user clicks an entry description
```

### Store fields used
```
filteredExpensesList  — the array of expenses to render
privacyMode           — passed down to child components for amount display
```

### useState
```js
const [openRows, setOpenRows] = useState(new Set())
// A JavaScript Set of expense IDs that are currently expanded.
// Set is used (not an array) because checking "is ID in the set?" is O(1) with a Set.
// When the user clicks a row, the ID is added or removed from the set.
```

### Computed totals (no useState needed)
```js
const pageTotalSpent = filteredExpensesList.reduce(
  (sum, exp) => sum + (exp.expense_total || 0), 0
)
const pageTotalTopup = filteredExpensesList.reduce(
  (sum, exp) => sum + Math.abs(exp.topup_expense_total || 0), 0
)
```
These are computed fresh on every render from `filteredExpensesList`. They automatically update when the page changes, a filter is applied, or a bank is selected. No extra API call or state needed.

### Totals footer
The totals row renders twice — once for desktop (`.expense-totals-row`, a grid that aligns with table columns) and once for mobile (`.expense-totals-mobile`, a simple flex card). CSS `display: none` shows/hides the right version per screen size.

---

## 9. AddExpenseDrawer.jsx

**File:** `src/components/AddExpenseDrawer.jsx`  
**Purpose:** A slide-in panel from the right where the user creates a new expense with one or more entries.

### Props
```
open      — boolean, whether the drawer is visible
onClose   — function to close the drawer
```

### Store fields used
```
currentSelectedBankId     — pre-selected bank for the new expense
banksList                 — to display the selected bank name
entryTags                 — passed to TagSearchSelect for each entry
setExpenseEntryCreationDate — sets the date string in the store before submitting
submitExpense             — POST /expenses/create
```

### useState
```js
const [date, setDate] = useState(new Date())
// The date for the expense, controlled by the DatePicker component.
// Defaults to today.

const [entries, setEntries] = useState([
  { amount: "", description: "", tags: [], type: "debit" }
])
// Array of entry rows. Starts with one empty row.
// Each entry has:
//   amount      — string (the raw input value, converted to Number on submit)
//   description — string
//   tags        — array of tag value strings (IDs)
//   type        — "debit" or "credit"
```

### useEffect — Reset on open
```js
useEffect(() => {
  if (open) {
    setDate(new Date())
    setEntries([{ amount: "", description: "", tags: [], type: "debit" }])
  }
}, [open])
```
**What it does:** Every time the drawer opens, the form is reset to a single blank entry with today's date. Without this, the form would remember the last submission's data.

### Entry management
```
addEntry()        — appends a new blank entry to the entries array
removeEntry(i)    — removes the entry at index i
updateEntry(i, k, v) — updates a single field k of the entry at index i
                       Also auto-switches the type to "credit"/"debit" when amount is typed
```

### submit()
```
1. Formats the date as "DD/MM/YYYY 00:00" and stores it
2. Maps entries to API shape, applying the sign from type:
     debit  →  +Math.abs(amount)
     credit →  -Math.abs(amount)
3. Passes through filterValidExpenses() to strip empty rows
4. Calls submitExpense() from the store
5. On success: clears entries, calls onClose()
```

---

## 10. SearchPanel.jsx

**File:** `src/components/SearchPanel.jsx`  
**Purpose:** A collapsible filter bar below the command bar. Lets the user filter expenses by tag, account, keyword, and/or date range. Also controls page size.

### Props
```
open — boolean, whether the panel is expanded (controlled by Dashboard)
```

### Store fields used
```
entryTags, bankItems                — options for the tag and account dropdowns
searchSelectedTags                  — currently active tag filters
searchSelectedBanks                 — currently active account filters
pageSize                            — currently selected page size
isAdvancedSearch                    — true when any filter is active
setSearchSelectedTags/Banks/etc.    — setters for each filter
setPageSize, setPageNumber          — page controls
setAdvancedSearch                   — marks that a filter is active
fetchExpenses                       — called to apply the search
```

### useState
```js
const [keyword, setKeyword] = useState("")
// Local state for the keyword input.
// Only pushed to the store (setSearchEntryKeyword) when the user clicks Search.
// This avoids firing a new API call on every keystroke.

const [dateRange, setDateRange] = useState([null, null])
// Local state for the date range picker.
// The picker returns [startDate, endDate].
// Only pushed to the store when the user clicks Search.
```

### search()
Called when the user clicks "Search →" or presses Enter in the keyword field:
```
1. setAdvancedSearch(true)      — marks that results are filtered
2. Pushes keyword to store
3. If date range is selected, pushes it to store
4. fetchExpenses()              — fires the API call
```

### reset()
Called when the user clicks "↺ Reset":
```
1. Clears all search state in the store
2. setAdvancedSearch(false)
3. Resets local keyword and dateRange state
4. setPageNumber(1)
5. fetchExpenses()   — re-fetches unfiltered results
```

---

## 11. Pagination.jsx

**File:** `src/components/Pagination.jsx`  
**Purpose:** Page number controls shown below the expense table.

### Props
None.

### Store fields used
```
currentTotalExpenses  — total number of expense records (for calculating page count)
pageNumber            — current page
pageSize              — records per page
setPageNumber         — updates the current page in the store
fetchExpenses         — fetches the new page's data
```

### useState / useEffect
None.

### Page range logic
```js
const getRange = () => {
  if (totalPages <= 7) return [1, 2, 3, ... totalPages]
  // Otherwise build a smart range with "..." ellipsis:
  // Always shows page 1 and last page.
  // Shows current page ± 1.
  // Shows "..." where pages are skipped.
  // Example for page 5 of 20: [1, "...", 4, 5, 6, "...", 20]
}
```

### go(p)
```js
const go = p => {
  setPageNumber(p)  // update page number in store
  fetchExpenses()   // fetch that page's data
}
```

Returns `null` (renders nothing) when `currentTotalExpenses` is 0.

---

## 12. CreateBankDialog.jsx

**File:** `src/components/CreateBankDialog.jsx`  
**Purpose:** Modal dialog to create a new bank or wallet account.

### Props
None. Visibility is controlled entirely by the store flag `isCreateBankDialogVisible`.

### Store fields used
```
isCreateBankDialogVisible   — controls open/closed
setCreateBankDialogVisible  — closes the dialog
createBank                  — POST /banks/create
```

### useState
```js
const [name, setName] = useState('')    // Account name input
const [bal, setBal]   = useState('')    // Initial balance input
```

### useEffect
None.

### Behaviour
- Account name is auto-converted to uppercase via `.toUpperCase()` on every keystroke.
- Submit button is disabled until both `name` and `bal` are non-empty.
- Clicking the overlay backdrop closes the dialog (`onClick={()=>setCreateBankDialogVisible(false)}`). The inner panel calls `e.stopPropagation()` to prevent the backdrop click from firing when the user clicks inside.

---

## 13. CreateTagDialog.jsx

**File:** `src/components/CreateTagDialog.jsx`  
**Purpose:** Modal dialog to create a new tag. Features live search-as-you-type to prevent creating duplicates.

### Props
```
open    — boolean
onClose — function
```

### Store fields used
```
entryTags     — all existing tags (for duplicate checking and suggestions)
createNewTag  — POST /entry-tags/create
```

### useState
```js
const [name, setName] = useState("")
// The tag name the user is typing. Reset every time the dialog opens.
```

### useEffect — Reset on open
```js
useEffect(() => {
  if (open) setName("")
}, [open])
```

### useEffect — Dropdown positioning
```js
useEffect(() => {
  if (!showDropdown || !inputWrapRef.current || !dropdownRef.current) return
  const rect = inputWrapRef.current.getBoundingClientRect()
  dropdownRef.current.style.top   = `${rect.bottom + 4}px`
  dropdownRef.current.style.left  = `${rect.left}px`
  dropdownRef.current.style.width = `${rect.width}px`
}, [showDropdown, suggestions])
```
**Why:** The suggestions dropdown is rendered with `position: fixed` outside the dialog's DOM (to avoid the dialog resizing). This effect reads the input's pixel position on screen and positions the dropdown directly below it.

### useMemo — exactMatch
```js
const exactMatch = useMemo(
  () => entryTags.find(t => t.title.toLowerCase() === lower),
  [entryTags, lower]
)
```
**What it does:** Checks if any existing tag exactly matches what the user has typed (case-insensitive). If yes, the Create button is disabled and an "Already exists" badge appears. `useMemo` means this computation only re-runs when `entryTags` or the input value changes, not on every render.

### useMemo — suggestions
```js
const suggestions = useMemo(
  () => trimmed ? entryTags.filter(t => t.title.toLowerCase().includes(lower)) : [],
  [entryTags, trimmed, lower]
)
```
**What it does:** Returns tags that partially match the current input. Shown in the floating dropdown below the input. Empty array when the input is blank (no dropdown shown).

### Why the dialog doesn't resize
The old design conditionally mounted/unmounted warning divs as the user typed, which changed the dialog's height. The new design uses:
- A fixed-height `create-tag-body` div (no `flex: 1`)
- A `create-tag-hint` div that is **always rendered** but just changes its text
- A `position: fixed` dropdown that is outside the dialog's layout entirely

---

## 14. ApplyTagsDialog.jsx

**File:** `src/components/ApplyTagsDialog.jsx`  
**Purpose:** Modal to edit an existing expense entry — update its description and/or tags.

### Props
None. Controlled entirely by store flags.

### Store fields used
```
isApplyEntryTagVisible    — controls open/closed
setApplyEntryTagVisible   — closes dialog
applyTagEntry             — the entry object being edited (set by ExpenseTable → Dashboard)
entryTags                 — all available tags for the multi-select
applyTagsToExpenseEntry   — PATCH /expenses/update-entry
```

### useState
```js
const [desc, setDesc] = useState('')
// Local copy of the entry's description. Pre-filled when dialog opens.

const [tags, setTags] = useState([])
// Local copy of the entry's selected tag IDs. Pre-filled when dialog opens.
```

### useEffect — Pre-fill on open
```js
useEffect(() => {
  if (isApplyEntryTagVisible && applyTagEntry) {
    setDesc(applyTagEntry.description || '')
    setTags(applyTagEntry.entry_tags || [])
  }
}, [isApplyEntryTagVisible, applyTagEntry])
```
**What it does:** Every time the dialog opens (or the target entry changes), copies the current description and tags from `applyTagEntry` into local state so the form starts pre-filled with the existing data.

---

## 15. ChatAssistantDialog.jsx

**File:** `src/components/ChatAssistantDialog.jsx`  
**Purpose:** A chat window where the user can ask questions about their finances and receive AI-generated responses. Supports markdown-like formatting in responses.

### Props
```
open    — boolean
onClose — function
```

### Store fields used
```
userName  — for the greeting message ("Hello Parimal, how are you?")
pushAlert — for API error notifications
```

### useState
```js
const [messages, setMessages] = useState([])
// Array of chat message objects: { role: "user" | "assistant", text: string }
// Starts empty, cleared when dialog closes.

const [input, setInput] = useState("")
// The current text in the textarea input.

const [sending, setSending] = useState(false)
// True while waiting for the API response. Disables the input and Send button.

const [bufferingVisible, setBufferingVisible] = useState(false)
// Controls whether the "Getting reply…" typing indicator is shown.
// Not shown immediately — see the useEffect below for why.
```

### useEffect #1 — Buffering delay
```js
useEffect(() => {
  if (!sending) { setBufferingVisible(false); return }
  const id = setTimeout(() => setBufferingVisible(true), 380)
  return () => clearTimeout(id)
}, [sending])
```
**Why 380ms?** If the API responds very quickly (under 380ms), the "Getting reply…" spinner never appears and the UX feels instant. Only for slow responses does it appear. This prevents a visual flicker for fast replies.

### useEffect #2 — Greeting on open, clear on close
```js
useEffect(() => {
  if (!open) {
    setMessages([]); setInput(""); setSending(false); return
  }
  const name = useStore.getState().userName
  setMessages([{ role: "assistant", text: `Hello ${name}, how are you?` }])
}, [open])
```
**What it does:** When the dialog opens, shows a greeting. When it closes, wipes all messages so the next open starts fresh.

### useEffect #3 — Auto scroll to bottom
```js
useEffect(() => {
  if (!open || !listRef.current) return
  listRef.current.scrollTop = listRef.current.scrollHeight
}, [open, messages, sending, bufferingVisible])
```
**What it does:** Scrolls the message list to the bottom after every new message (user or assistant) and after the buffering indicator appears/disappears. This mimics the behaviour of every chat app.

### useEffect #4 — Escape key to close
```js
useEffect(() => {
  if (!open) return
  const onKey = (e) => { if (e.key === 'Escape') onClose() }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [open, onClose])
```

### useEffect #5 — Auto-focus input on open
```js
useEffect(() => {
  if (!open) return
  const id = setTimeout(() => inputRef.current?.focus(), 50)
  return () => clearTimeout(id)
}, [open])
```
**Why 50ms delay?** The dialog's open animation takes ~250ms. Calling `.focus()` immediately sometimes fails on elements that are mid-animation. The small delay ensures the element is fully interactive before we try to focus it.

### renderMarkdown(text)
A function (not a component) that converts the assistant's response text into React elements.

**What it handles:**
```
**bold text**     → <strong>bold text</strong>
- list item       → <ul><li>list item</li></ul>
* list item       → same as above
₹ 500             → <strong>₹ 500</strong>  (currency + amount auto-bolded)
$1,234.56         → <strong>$1,234.56</strong>
Empty lines       → <br />
Regular lines     → <span>text</span>
```

**How currency bolding works:** A single regex scans the text for any currency symbol (`₹ $ € £ ¥` etc.) followed by an optional space, optional sign, digits, and optional decimals. Every match is wrapped in `<strong>`.

---

## 16. TagSearchSelect.jsx

**File:** `src/components/TagSearchSelect.jsx`  
**Purpose:** A reusable multi-select dropdown with search. Used in: Search Panel (filter by tag/account), Add Expense Drawer (entry tags), Inline Add Entries, and Apply Tags Dialog.

### Props
```
tags        — array of { title, value } objects (the options)
selected    — array of selected value strings
onChange    — function(newSelectedArray) called when selection changes
placeholder — input placeholder text (default: "Search tags…")
zIndex      — z-index of the dropdown portal (default: 502)
```

### Store fields used
None. This is a fully self-contained reusable component.

### useState
```js
const [query, setQuery] = useState("")
// The text the user is typing to filter options.

const [open, setOpen] = useState(false)
// Whether the dropdown list is visible.

const [menuPos, setMenuPos] = useState(null)
// { top, left, width, maxListHeight } — pixel coordinates of the dropdown.
// Set by syncMenuPosition() by reading the input's getBoundingClientRect().
```

### useRef
```js
const wrapRef = useRef(null)
// Reference to the outer wrapper div. Used to detect outside clicks and to
// get the input's screen position for dropdown placement.
```

### useMemo — filtered options
```js
const filtered = useMemo(() => {
  const q = query.trim().toLowerCase()
  if (!q) return tags
  return tags.filter(t => t.title.toLowerCase().includes(q))
}, [tags, query])
```
Only re-runs when `tags` or `query` changes. Returns all tags when search is empty.

### useLayoutEffect — Dropdown positioning
```js
useLayoutEffect(() => {
  if (!open || !wrapRef.current) return
  syncMenuPosition()
  window.addEventListener('resize', syncMenuPosition)
  window.visualViewport?.addEventListener('resize', syncMenuPosition)
  return () => { /* remove listeners */ }
}, [open, query, syncMenuPosition])
```
**useLayoutEffect vs useEffect:** `useLayoutEffect` runs synchronously after the DOM updates but before the browser paints. This is important here because we need to measure the input's position and set the dropdown position in the same frame — otherwise there would be a single frame where the dropdown appears in the wrong position.

**`window.visualViewport`** is needed for mobile. When the virtual keyboard opens on iOS/Android, it shrinks the visible area — the regular `window.resize` event does not always fire. `visualViewport.resize` does.

### useEffect — Close on outside click + scroll
```js
useEffect(() => {
  if (!open) return
  const onDoc = (e) => {
    // Close if click is outside the wrapper AND outside the dropdown portal
    if (!wrapRef.current?.contains(e.target) && 
        !e.target.closest('.tag-search-dropdown-portal')) {
      setOpen(false)
    }
  }
  const onScroll = () => {
    // Only close if the input has scrolled completely out of view
    // (avoids closing when iOS keyboard opens and slightly shifts the page)
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
      setOpen(false)
    } else {
      syncMenuPosition()  // reposition instead of closing
    }
  }
  document.addEventListener('pointerdown', onDoc)
  window.addEventListener('scroll', onScroll, true)
  return () => { /* cleanup */ }
}, [open, syncMenuPosition])
```

### Portal rendering
The dropdown list is rendered via `createPortal(dropdown, document.body)`. This means the dropdown's HTML is attached directly to `document.body`, NOT inside the component's normal DOM position.

**Why?** Without a portal, the dropdown would be clipped by any parent element with `overflow: hidden` (like dialog panels, scrollable containers). By portalling to `document.body`, it always renders on top of everything.

---

## 17. Loader.jsx

**File:** `src/components/Loader.jsx`  
**Purpose:** Full-screen loading overlay with an animated ₹ spinner. Shown during API calls.

### Props
None.

### Store fields used
```
showLoader — boolean, the only thing this component cares about
```

### useState / useEffect
None.

### Behaviour
Uses `useStore(s => s.showLoader)` — a selector pattern. This means the component only re-renders when `showLoader` changes, not when any other store field changes. This is the most performance-optimal way to read a single store value.

Returns `null` (renders nothing at all) when `showLoader` is false.

---

## 18. AlertToast.jsx

**File:** `src/components/AlertToast.jsx`  
**Purpose:** Displays error and warning messages as a toast notification at the top of the screen.

### Props
None.

### Store fields used
```
showAlert       — whether to show the container
alertMessages   — array of message strings to display
setShowAlert    — called to hide the toast
setAlertMessages — called to clear the messages
```

### useState / useEffect
None.

### Behaviour
- Returns `null` when `showAlert` is false or `alertMessages` is empty.
- The `clear()` function sets both `showAlert = false` and `alertMessages = []`.
- Multiple messages can be stacked (each API error pushes a new message via `pushAlert()`).
- The × close button clears ALL messages at once.

---

## Component Dependency Tree

```
App
├── Loader             (always rendered, shows/hides via store)
├── AlertToast         (always rendered, shows/hides via store)
├── Login              (shown when not logged in + showLoginPage=true)
├── Register           (shown when not logged in + showLoginPage=false)
└── Dashboard          (shown when logged in)
    ├── Topbar
    ├── Sidebar
    │   └── (bank cards with drag-and-drop)
    ├── SearchPanel
    │   └── TagSearchSelect  (×2 — tags and accounts)
    ├── ExpenseTable
    │   ├── DesktopRow
    │   │   └── InlineAddEntries
    │   │       └── TagSearchSelect
    │   └── MobileCard
    │       └── InlineAddEntries
    │           └── TagSearchSelect
    ├── Pagination
    ├── AddExpenseDrawer
    │   └── TagSearchSelect  (per entry)
    ├── CreateBankDialog
    ├── CreateTagDialog
    ├── ApplyTagsDialog
    │   └── TagSearchSelect
    └── ChatAssistantDialog
```
```

Now create the remaining two files in parallel: