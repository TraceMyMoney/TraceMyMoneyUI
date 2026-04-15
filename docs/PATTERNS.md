# React & JavaScript Patterns — PATTERNS.md

This document explains the key coding patterns used throughout the TrackMoney frontend codebase. It is written for someone who understands basic JavaScript but has little or no React experience. Each section explains not just *what* a pattern does, but *why* it exists and what problem it solves.

---

## Table of Contents

1. [Optimistic Updates](#1-optimistic-updates)
2. [Conditional Rendering](#2-conditional-rendering)
3. [Portal Rendering](#3-portal-rendering)
4. [useRef vs useState](#4-useref-vs-usestate)
5. [useMemo](#5-usememo)
6. [useLayoutEffect vs useEffect](#6-uselayouteffect-vs-useeffect)
7. [Non-passive Event Listeners](#7-non-passive-event-listeners)
8. [Drag and Drop — Mouse and Touch](#8-drag-and-drop--mouse-and-touch)
9. [Store Actions Returning Booleans](#9-store-actions-returning-booleans)
10. [Silent Fetches](#10-silent-fetches)

---

## 1. Optimistic Updates

### The problem

When a user clicks a toggle — say, the dark mode switch — the toggle needs to call an API to save the preference. API calls take time: typically 200–500 milliseconds even on a good connection. If the UI waits for the server to confirm before updating, the toggle appears frozen. The user clicks it, nothing happens, then half a second later it snaps into the new state. That feels broken.

### The solution: update first, confirm later

An **optimistic update** means you update the UI *immediately* as if the API call already succeeded, fire the actual API call in the background, and then — only if the API fails — revert the UI back to its previous state.

The user sees the toggle respond instantly. If the network is healthy (which it almost always is), they never notice the API call at all. If it fails, the UI quietly reverts and shows an error alert.

### The `updateUserPreferences` example

This function lives in `src/store/useStore.js` and handles the dark mode toggle, the privacy mode toggle, and the page size selector — all three use the same pattern:

```js
async updateUserPreferences(payload) {
    // Step 1: Save the PREVIOUS values so we can revert if needed
    const prev = {};

    if ("is_dark_mode" in payload) {
        prev.isDarkMode = get().isDarkMode;          // remember old value

        set({ isDarkMode: payload.is_dark_mode });   // update state NOW

        // Also update the DOM class immediately (dark/light CSS switch)
        if (payload.is_dark_mode) document.body.classList.remove("light");
        else                       document.body.classList.add("light");
    }

    if ("privacy_mode_enabled" in payload) {
        prev.privacyMode = get().privacyMode;
        set({ privacyMode: payload.privacy_mode_enabled });
    }

    if ("page_size" in payload) {
        prev.pageSize = get().pageSize;
        set({ pageSize: payload.page_size });
    }

    // Step 2: Fire the API call in the background — no loader, no blocking
    try {
        await axios.patch(`${BASE_URL}/user-preferences/update`, payload);
        // Success: the optimistic values we already set were correct. Done.
    } catch (err) {
        // Step 3: API failed — revert everything we changed
        if ("is_dark_mode" in payload) {
            set({ isDarkMode: prev.isDarkMode });
            if (prev.isDarkMode) document.body.classList.remove("light");
            else                  document.body.classList.add("light");
        }
        if ("privacy_mode_enabled" in payload)
            set({ privacyMode: prev.privacyMode });
        if ("page_size" in payload)
            set({ pageSize: prev.pageSize });

        get().pushAlert(handleError(err));  // show the error to the user
    }
},
```

In pseudocode, the pattern is always:

```
prev = get current value from state
set new value in state          ← UI updates INSTANTLY
await the API call
if the API call throws an error:
    set(prev)                   ← silently revert to old value
    show error alert
```

### Another example: `reorderBanks`

When the user drags and drops a bank card to a new position in the sidebar, `reorderBanks` is called immediately with the new order:

```js
async reorderBanks(orderedIds) {
    // Optimistically reorder the list in state right now
    const { banksList } = get();
    const reordered = orderedIds
        .map((id) => banksList.find((b) => b.bankId === id))
        .filter(Boolean);
    const bankItems = reordered.map((e) => ({ title: e.bankName, value: e.bankId }));

    set({ banksList: reordered, bankItems, banksDisplayOrder: orderedIds });

    // Then persist to the server
    try {
        await axios.patch(`${BASE_URL}/user-preferences/update`, {
            banks_display_order: orderedIds,
        });
    } catch (err) {
        get().pushAlert(handleError(err));
        // On failure: re-fetch from server to restore true order
        get().fetchBanks();
    }
},
```

The bank card visually snaps to its new position the moment the user releases the drag — no waiting. If the API call fails, `fetchBanks()` re-fetches the true order from the server. The revert here is "re-fetch" rather than "restore a saved previous value" — both are valid approaches.

### Why not just use a loading spinner?

You could show a spinner on the toggle while waiting for the API. But this creates a bad experience: the toggle is unresponsive for 200–500ms. For a setting change, that feels like the app is sluggish. Optimistic updates are the industry standard for low-risk, instantly-reversible UI state.

---

## 2. Conditional Rendering

### What it means

In React, a component is a function that returns UI (JSX). If a component returns `null`, React renders absolutely nothing — no DOM element, no whitespace, nothing. This is how you show or hide components without using CSS.

### The three main patterns used in this codebase

**Pattern A — Early return `null`**

Used in dialogs that should not exist in the DOM when closed:

```jsx
// From CreateTagDialog.jsx
export default function CreateTagDialog({ open, onClose }) {
    // ... state setup ...

    if (!open) return null;   // ← renders nothing when closed

    return (
        <div className="dialog-overlay">
            ...
        </div>
    );
}
```

When `open` is `false`, the entire dialog (all its DOM nodes, event listeners, and child components) simply does not exist. When `open` becomes `true`, React creates the DOM for it fresh.

This is different from the CSS approach of `display: none` — with `return null`, the dialog component is not mounted at all. That means it has no lingering state, no event listeners to clean up, and wastes no memory. When it mounts again, it starts fresh.

**Pattern B — Short-circuit with `&&`**

For elements that should appear conditionally inside a larger component:

```jsx
// From AddExpenseDrawer.jsx
{selectedBank && (
    <div className="d-bank-display">
        <div className="d-bank-dot" />
        <span className="d-bank-name">{selectedBank.bankName}</span>
    </div>
)}
```

If `selectedBank` is `null` or `undefined` (falsy), the `&&` short-circuits and nothing renders. If `selectedBank` has a value (truthy), the JSX after `&&` renders.

**Pattern C — Ternary for empty states**

Used in `ExpenseTable.jsx` to swap between the empty state and the actual table:

```jsx
if (!filteredExpensesList.length)
    return (
        <div className="table-area">
            <div className="table-empty">
                <div className="table-empty-rupee">₹</div>
                <div className="table-empty-title">No records found</div>
                <div className="table-empty-sub">
                    Add your first expense using the button above
                </div>
            </div>
        </div>
    );

return (
    <div className="table-area">
        {/* actual table content */}
    </div>
);
```

The component returns one of two completely different UIs depending on whether there is data. No CSS toggling, no `hidden` attributes — just different return values from the function.

**Pattern D — The `Loader` component**

The `Loader` component in `src/components/Loader.jsx` reads one piece of state from the store and either renders the full-screen spinner or returns `null`:

```jsx
export default function Loader() {
    const showLoader = useStore(s => s.showLoader);
    if (!showLoader) return null;
    return (
        <div className="loader-overlay">
            ...
        </div>
    );
}
```

`Loader` is always present in the component tree (it is rendered at the top level in `App.jsx` and never unmounted), but it renders nothing 99% of the time. The moment `showLoader` becomes `true` anywhere in the store, the overlay appears instantly.

---

## 3. Portal Rendering

### The problem with normal rendering

Normally, a React component renders its HTML *inside* its parent in the DOM. For most things, that is fine. But dropdowns have a specific problem: they need to appear *on top of* everything else on the screen.

Consider the tag search dropdown inside the "Add Expense" drawer:

```
<div class="drawer">           ← has overflow: hidden
    <div class="drawer-body">
        <TagSearchSelect>
            <div class="tag-search-dropdown">  ← needs to escape!
```

The `.drawer-body` has `overflow: auto` (to allow scrolling inside the drawer). Any absolutely-positioned child of an `overflow: auto` element is **clipped** to that element's boundaries. If the tag dropdown were rendered normally inside the drawer, it would be cut off at the drawer's edges.

### What `createPortal` does

`createPortal(element, document.body)` takes a React element and renders its actual HTML somewhere completely different in the DOM — typically at the bottom of `<body>`, outside of all containers:

```jsx
// From TagSearchSelect.jsx
import { createPortal } from "react-dom";

{open && menuPos && createPortal(
    <div
        className="tag-search-dropdown-portal"
        style={{
            position: "fixed",
            top:   menuPos.top,
            left:  menuPos.left,
            width: menuPos.width,
            zIndex: 502,
        }}
    >
        <div className="tag-search-list">
            {/* list of tag options */}
        </div>
    </div>,
    document.body   // ← rendered HERE in the DOM, not inside the component
)}
```

In the DOM, the rendered HTML looks like this:

```html
<body>
    <div id="root">
        ...drawer...TagSearchSelect input...    ← the input anchor
    </div>
    <div class="tag-search-dropdown-portal"     ← the dropdown is here!
         style="position:fixed; top:320px; left:100px; ...">
        ...options...
    </div>
</body>
```

The dropdown is a sibling of `#root` at the very top of the DOM hierarchy. It is not inside any `overflow: hidden` or `overflow: auto` container, so nothing clips it. It sits freely on top of everything using `position: fixed` and a high `z-index`.

### Why `position: fixed` instead of `position: absolute`?

`position: fixed` positions the element relative to the **viewport** (the visible screen area), not relative to any parent element. Once the dropdown's top/left coordinates are calculated from `getBoundingClientRect()`, those pixel values directly correspond to screen positions — which is exactly what you need for an element that has been teleported to `<body>`.

### Where portals are used

- **`TagSearchSelect`** — the multi-tag search dropdown in the Add Expense drawer and the Search Panel
- **`CreateTagDialog`** — the suggestion dropdown that appears below the tag name input (positioned via `useEffect` + `getBoundingClientRect()`)

---

## 4. useRef vs useState

### The fundamental difference

Both `useRef` and `useState` let a component "remember" a value across re-renders. The critical difference:

- **`useState`** — when you call the setter (`setState`), React **re-renders the component**. The new value shows up in the UI.
- **`useRef`** — when you mutate `.current`, **nothing re-renders**. The value is stored silently. No UI update.

You should use `useState` for anything the user needs to *see change* on screen, and `useRef` for anything that only needs to be *tracked internally* without affecting what is displayed.

### The drag-and-drop example in `Sidebar.jsx`

The sidebar's bank card drag-and-drop system illustrates this perfectly. Here is how the state and refs are divided:

```jsx
// --- useState: changes that MUST re-render the UI ---
const [dragOverIdx, setDragOverIdx] = useState(null);
// Needed in render: the card at this index gets the visual "drag over"
// highlight class (account-card--drag-over). When this changes,
// React must re-render to add/remove that CSS class.

const [isDragging, setIsDragging] = useState(false);
// Needed in render: when true, the dragged card gets the "account-card--dragging"
// CSS class (opacity reduced, border changes). Must re-render to apply this.


// --- useRef: values tracked internally, NO re-render needed ---
const dragSrcIdx = useRef(null);
// The index of the card being dragged. Only needed to compute the
// drop result when the drag ends. The user never sees this number
// displayed anywhere — there's no reason to re-render when it changes.

const ghostRef = useRef(null);
// A reference to the floating clone element appended to document.body.
// We move it by mutating its .style directly — React is not involved
// at all. Re-rendering would be wasteful and possibly janky.

const touchOffset = useRef({ x: 0, y: 0 });
// How far the finger is from the card's top-left corner.
// Used for ghost positioning math. Never displayed, never needs a render.

const didDragRef = useRef(false);
// A flag set to true when a touch drag actually moves (vs. a tap).
// Read immediately in the onClick handler. Never shown in the UI.
```

A concrete way to think about it: if removing the variable from the JSX `return` statement would break nothing visually, it belongs in `useRef`. If the UI would look wrong or incomplete without it, it belongs in `useState`.

### The `listRef` example

```jsx
const listRef = useRef(null);

// In JSX:
<div ref={listRef}>
    {banksList.map(...)}
</div>
```

Attaching a `ref` to a DOM element lets you access that element directly (like `document.getElementById`) without querying the DOM by class or ID. The `cardIndexAtPoint` helper function uses `listRef.current.querySelectorAll(".account-card")` to find all the card elements and loop through their positions — imperative DOM work that does not belong in React state.

---

## 5. useMemo

### What it does

`useMemo` caches the result of an expensive computation and only recomputes it when specific values change. It takes two arguments: a function to run, and a list of dependencies. If the dependencies have not changed since the last render, React skips the function entirely and returns the cached result.

```jsx
const result = useMemo(() => {
    // expensive computation here
    return someValue;
}, [dep1, dep2]);  // only recompute when dep1 or dep2 changes
```

### The `exactMatch` example in `CreateTagDialog.jsx`

```jsx
const exactMatch = useMemo(
    () => entryTags.find((t) => t.title.toLowerCase() === lower),
    [entryTags, lower],
);
```

This scans the full list of tags to find one whose name exactly matches what the user has typed. `entryTags` could have hundreds of entries, and `lower` is the current input value (lowercased and trimmed).

**Without `useMemo`:** Every time the component re-renders (which in a form happens constantly — on every keystroke, on every state change), `.find()` would scan the entire `entryTags` array from scratch. In a large codebase with many tags, this is unnecessary repeated work.

**With `useMemo`:** The `.find()` only runs when either `entryTags` (the list of all tags) or `lower` (the current search term) actually changes. Typing a character changes `lower`, so it does recompute — but that is correct and necessary. Unrelated state changes (like a different dialog opening elsewhere) do not trigger the recomputation.

### The `suggestions` list in the same file

```jsx
const suggestions = useMemo(() => {
    if (!trimmed) return [];
    return entryTags.filter((t) => t.title.toLowerCase().includes(lower));
}, [entryTags, trimmed, lower]);
```

Same idea: filtering a potentially long array is wrapped in `useMemo` so it only runs when the input value or the tag list changes, not on every unrelated render.

### The `selectedMeta` example in `TagSearchSelect.jsx`

```jsx
const selectedMeta = useMemo(
    () => selected.map((v) => tags.find((t) => t.value === v)).filter(Boolean),
    [selected, tags],
);
```

This takes the list of selected tag IDs and looks up their full metadata (title, etc.) to display the chips above the input. Again, `.find()` inside `.map()` is an O(n²) operation. Wrapping it in `useMemo` means it only runs when the selection or the available tags actually change.

### When NOT to use useMemo

`useMemo` adds a small overhead of its own (checking dependencies on every render). For trivial computations like adding two numbers or reading a property, the overhead of `useMemo` would be more expensive than just running the computation. Use it when:

1. The computation involves looping over arrays (filter, find, map, reduce)
2. The result is used in rendering and the component re-renders frequently
3. The dependencies change less often than the component re-renders

---

## 6. useLayoutEffect vs useEffect

### The execution timing difference

Both hooks let you run code after a component renders. The difference is *exactly when*:

- **`useEffect`** — runs *after* the browser has painted the screen. The user sees the new UI, then your code runs.
- **`useLayoutEffect`** — runs *after* React has updated the DOM, but *before* the browser paints. Your code runs, then the user sees the result.

For most purposes, `useEffect` is correct. But there is one important case where it is not.

### The dropdown positioning problem

In `TagSearchSelect.jsx`, when the dropdown opens it needs to be positioned directly below the search input. The position is calculated by reading the input's current position with `getBoundingClientRect()`:

```jsx
useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;

    // Calculate where the dropdown should appear
    syncMenuPosition();

    // Also reposition if the window resizes (e.g. keyboard appears on mobile)
    window.addEventListener("resize", syncMenuPosition);
    const vv = window.visualViewport;
    if (vv) vv.addEventListener("resize", syncMenuPosition);

    return () => {
        window.removeEventListener("resize", syncMenuPosition);
        if (vv) vv.removeEventListener("resize", syncMenuPosition);
    };
}, [open, query, syncMenuPosition]);
```

`syncMenuPosition` calls `wrapRef.current.getBoundingClientRect()` and sets the portal's position via `setMenuPos(...)`.

**Why not `useEffect` here?**

With `useEffect`, the sequence would be:

1. User focuses the input → `open` becomes `true`
2. React re-renders — the dropdown portal appears in the DOM, but with no position yet (`menuPos` is still `null` from the previous render)
3. Browser **paints** — the user sees the dropdown at position (0, 0) or wherever it defaults to
4. `useEffect` runs → calculates position → `setMenuPos(...)` → another render
5. Browser paints again — dropdown jumps to the correct position

The user would see the dropdown flash to the wrong position for one frame before snapping to the correct one. On fast screens this is a visible flicker.

**With `useLayoutEffect`:**

1. User focuses input → `open` becomes `true`
2. React re-renders
3. `useLayoutEffect` runs *before paint* → position is calculated → `setMenuPos(...)` → another synchronous re-render
4. Browser paints once, with the dropdown already in the correct position

The user never sees an intermediate wrong position.

### The `CreateTagDialog` comparison

`CreateTagDialog.jsx` uses a regular `useEffect` for its dropdown positioning because the dropdown is rendered directly in the dialog DOM (not in a portal), and is always initially hidden until `showDropdown` becomes true. In this case, the timing is less critical — there is no "flash to wrong position" because the element appears and is immediately measured in the same effect cycle. When the timing requirement is looser, the simpler `useEffect` is preferred.

---

## 7. Non-passive Event Listeners

### Background: passive listeners

Modern browsers introduced **passive event listeners** as a performance optimization. When you add a `touchmove` listener to a page element, the browser must wait to find out whether your listener will call `e.preventDefault()` (which would prevent scrolling) before it can actually scroll the page. This creates a delay on every touch move — noticeable on slower devices.

To solve this, browsers made touch listeners **passive by default**: they assume you will NOT call `e.preventDefault()`, and start scrolling immediately without waiting. React follows this default and registers all its synthetic touch event handlers as passive.

### The problem this creates

The sidebar needs to prevent the page from scrolling while the user is drag-and-dropping a bank card. To block scrolling during a drag, you must call `e.preventDefault()` on the `touchmove` event.

But if the listener is passive, calling `e.preventDefault()` is **silently ignored** by the browser. The page scrolls anyway, and the drag feels broken.

### The solution: a native listener with `{ passive: false }`

In `Sidebar.jsx`, a `useEffect` registers a native (non-React) event listener directly on the DOM element, explicitly opting out of passive mode:

```jsx
useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onTouchMove = (e) => {
        // Only block scrolling when a drag is actually in progress
        if (dragSrcIdx.current !== null) {
            e.preventDefault();   // works because listener is NOT passive
        }
    };

    // The third argument { passive: false } is the key
    el.addEventListener("touchmove", onTouchMove, { passive: false });

    // Clean up when the component unmounts
    return () => el.removeEventListener("touchmove", onTouchMove);
}, []);
```

This listener is added directly via the native browser API (`addEventListener`), bypassing React's synthetic event system entirely. With `{ passive: false }`, the browser waits for the callback to finish before deciding whether to scroll — so `e.preventDefault()` actually works.

### Why the empty dependency array `[]`?

The `useEffect` has `[]` as its dependency array, which means it runs once when the component mounts and the cleanup runs once when it unmounts. This is correct because `listRef.current` points to the same DOM element for the entire lifetime of the sidebar — the element never changes, so we only need to attach the listener once.

### Important: `dragSrcIdx.current` inside the listener

Notice that the listener reads `dragSrcIdx.current` (a ref, not state). This works because refs always hold the most up-to-date value — even inside a closure that was created once at mount time. If this were a state variable, the closure would capture the initial value of `null` and never update. Refs are the correct tool for values that need to be read inside long-lived closures like native event listeners.

---

## 8. Drag and Drop — Mouse and Touch

The bank card reordering in the sidebar supports both desktop mouse dragging and mobile touch dragging. They are implemented separately because the browser APIs for the two are completely different.

### Mouse drag: HTML5 native drag events

Desktop drag uses the browser's built-in HTML5 Drag and Drop API. Each bank card has these attributes set:

```jsx
<div
    draggable={true}
    onDragStart={(e) => handleDragStart(e, i)}
    onDragOver={(e) => handleDragOver(e, i)}
    onDragLeave={(e) => handleDragLeave(e, i)}
    onDrop={(e) => handleDrop(e, i)}
    onDragEnd={handleDragEnd}
>
```

- `onDragStart` — fires when the user starts dragging. Records the source index in `dragSrcIdx.current` and sets `isDragging: true`.
- `onDragOver` — fires repeatedly as the dragged item passes over a potential drop target. Calls `e.preventDefault()` (required to allow dropping) and updates `dragOverIdx` to highlight the target.
- `onDragLeave` — fires when the dragged item leaves a potential target. Clears the `dragOverIdx` highlight.
- `onDrop` — fires when the user releases the drag over a target. Calls `commitReorder(src, dropIdx)` to apply the new order.
- `onDragEnd` — fires when the drag is finished (whether or not it ended on a valid target). Cleans up all drag state.

The browser handles the visual drag representation automatically (a ghost image of the card follows the cursor).

### Touch drag: custom implementation

Mobile browsers do not fire drag events for touch input. Instead, the touch drag system is built entirely from scratch using three touch events:

**`onTouchStart`** — user puts finger down on a card:

```jsx
const handleTouchStart = (e, i) => {
    const touch = e.touches[0];
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();

    // Record where inside the card the finger landed
    // (so the ghost doesn't snap to the card's top-left corner)
    touchOffset.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
    };

    dragSrcIdx.current = i;
    didDragRef.current = false;
    setIsDragging(true);

    // Create a visible clone of the card that follows the finger
    const clone = card.cloneNode(true);
    clone.style.cssText = `
        position: fixed;
        z-index: 9999;
        pointer-events: none;
        width: ${rect.width}px;
        opacity: 0.88;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        left: ${rect.left}px;
        top:  ${rect.top}px;
        ...
    `;
    document.body.appendChild(clone);
    ghostRef.current = clone;
};
```

The clone element (called a "ghost") is appended directly to `document.body` with `position: fixed`. This means it is painted on top of everything and follows the screen position exactly. `pointer-events: none` ensures the ghost does not interfere with touch detection on the cards beneath it.

**`onTouchMove`** — finger moves across the screen:

```jsx
const handleTouchMove = (e) => {
    if (dragSrcIdx.current === null) return;
    didDragRef.current = true;   // ← flag that a real drag happened

    const touch = e.touches[0];

    // Move the ghost to follow the finger (offset-corrected)
    if (ghostRef.current) {
        ghostRef.current.style.left = `${touch.clientX - touchOffset.current.x}px`;
        ghostRef.current.style.top  = `${touch.clientY - touchOffset.current.y}px`;
    }

    // Find which card is under the finger and highlight it
    const idx = cardIndexAtPoint(touch.clientX, touch.clientY);
    setDragOverIdx(idx !== null && idx !== dragSrcIdx.current ? idx : null);
};
```

`cardIndexAtPoint` loops through all `.account-card` elements, calls `getBoundingClientRect()` on each, and returns the index of whichever card contains the finger's current position:

```jsx
const cardIndexAtPoint = (cx, cy) => {
    if (!listRef.current) return null;
    const cards = listRef.current.querySelectorAll(".account-card");
    for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect();
        if (cy >= r.top && cy <= r.bottom) return i;
    }
    return null;
};
```

**`onTouchEnd`** — finger lifts:

```jsx
const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const src  = dragSrcIdx.current;
    const drop = cardIndexAtPoint(touch.clientX, touch.clientY);

    resetDragState();   // remove ghost, clear all drag state

    if (didDragRef.current && drop !== null) {
        commitReorder(src, drop);
    }
};
```

### The `didDragRef` pattern — suppressing false clicks

This is a subtle but important detail. When a touch gesture ends, mobile browsers fire a synthetic `click` event about 300ms later. This is legacy browser behavior intended to support websites not designed for touch.

The problem: after the user finishes drag-and-drop reordering, the browser fires a `click` on whichever card the finger lifted from. Without countermeasures, this would call `selectBank()` and switch the active account — an unwanted side effect of a drag.

`didDragRef` solves this:

```jsx
// In handleTouchMove: set to true as soon as the finger moves
didDragRef.current = true;

// In selectBank (the onClick handler):
const selectBank = (bank, i) => {
    // If a drag just happened, ignore this click
    if (didDragRef.current) {
        didDragRef.current = false;   // reset for next interaction
        return;
    }
    // Otherwise, it was a real tap — select the bank
    setActiveIdx(i);
    fetchFilteredExpensesList(bank);
    onClose?.();
};
```

A tap (finger down + finger up without moving) never sets `didDragRef.current = true`, so `selectBank` runs normally. A drag (finger moves during `touchmove`) sets it to `true`, so the subsequent synthetic click is discarded.

---

## 9. Store Actions Returning Booleans

### The pattern

Several store actions in `src/store/useStore.js` explicitly `return true` on success and `return false` (or return nothing, which is `undefined` — also falsy) on failure:

```js
async submitExpense(data) {
    set({ showLoader: true });
    try {
        data.created_at = get().expenseEntryCreationDate;
        const r = await axios.post(`${BASE_URL}/expenses/create`, data);
        if (r.status === 201) {
            await Promise.all([
                get().fetchExpenses({ silent: true }),
                get().fetchBanks(),
            ]);
            return true;    // ← success signal
        }
        return false;
    } catch (err) {
        get().pushAlert(handleError(err));
        return false;       // ← failure signal
    } finally {
        set({ showLoader: false });
    }
},
```

The same pattern appears in `submitExpenseEntry`.

### Why: the component needs to know what happened

The calling component (`AddExpenseDrawer.jsx` or `InlineAddEntries` inside `ExpenseTable.jsx`) needs to take a different action depending on whether the submission succeeded:

- **On success:** close the drawer / clear the inline form
- **On failure:** stay open so the user can try again (the store already showed an error alert)

```jsx
// From AddExpenseDrawer.jsx
const submit = async () => {
    // ... validation ...
    const ok = await submitExpense({
        bank_id: currentSelectedBankId,
        expenses: valid,
    });
    if (ok) {
        setEntries([{ amount: "", description: "", tags: [], type: "debit" }]);
        onClose?.();    // only close the drawer if it worked
    }
    // If not ok, the store already showed an error toast. Drawer stays open.
};
```

```jsx
// From InlineAddEntries in ExpenseTable.jsx
const submit = async () => {
    // ... validation ...
    const ok = await submitExpenseEntry(expenseId, valid);
    if (ok) setEntries([]);   // clear the inline form only on success
};
```

### Why not use exceptions or callbacks?

The boolean return is the simplest possible signal. Using exceptions would require `try/catch` blocks in every calling component. Using callbacks would require passing a success function into the store action. The boolean keeps the store action self-contained (it handles its own errors internally and shows alerts) while still giving the component exactly the one bit of information it needs: did it work or not?

### What the component does NOT need to know

The component does not need to know:

- What the API response body looked like
- What HTTP status code was returned
- What error message was generated (the store handles the alert)
- Whether the data has been re-fetched yet (the store handles that too with `fetchExpenses({ silent: true })`)

The boolean encapsulates all of that complexity behind a simple yes/no answer.

---

## 10. Silent Fetches

### The problem with normal fetches

After any mutation — creating an expense, adding an entry, deleting a row — the data on screen needs to refresh to show the updated state. The obvious way to refresh is to call `fetchExpenses()`, which sets `showLoader: true`, makes the API request, updates the state, and sets `showLoader: false`.

But this creates a terrible experience:

1. User clicks "Submit" → full-screen loading spinner appears
2. Data refreshes
3. Spinner disappears

The user just watched the entire screen go blank and reload because of a submit action they deliberately triggered. It is jarring and slow-feeling, even if the actual fetch takes only 200ms.

### The `silent: true` option

`fetchExpenses` accepts an `options` object with a `silent` flag:

```js
async fetchExpenses(options = {}) {
    const silent = options.silent === true;
    if (!silent) set({ showLoader: true });   // ← skipped when silent

    try {
        // ... build params, make API call ...
        const r = await axios.get(`${BASE_URL}/expenses/`, { ... });
        const { expenses, topup, nonTopup, total } = get()._parseExpenses(r.data || []);

        set({
            filteredExpensesList: expenses,
            currentTotalOfTopupExpenses: topup,
            currentTotalOfExpenses: nonTopup,
            currentTotalExpenses: total,
        });
    } catch (err) {
        get().pushAlert(handleError(err));
    } finally {
        if (!silent) set({ showLoader: false });   // ← skipped when silent
    }
},
```

When `silent: true` is passed, neither `showLoader: true` nor `showLoader: false` is ever called. The full-screen loader never appears. The data just quietly updates in the state, and React re-renders the table with the new data in the background.

### Where it is used

Every mutation action that needs a data refresh after success uses the silent variant:

```js
// From submitExpense in useStore.js
if (r.status === 201) {
    await Promise.all([
        get().fetchExpenses({ silent: true }),   // refresh table silently
        get().fetchBanks(),                      // refresh balances
    ]);
    return true;
}
```

```js
// Same pattern in submitExpenseEntry, deleteExpense, deleteExpenseEntry
if (r.status === ...) {
    await Promise.all([
        get().fetchExpenses({ silent: true }),
        get().fetchBanks(),
    ]);
}
```

`fetchBanks()` does not have a silent mode because bank balance updates are fast (the data is small) and the full-screen loader is already showing from the mutation action itself — so there is no extra flash.

### The user experience difference

**Without `silent`:** Add expense → full screen goes dark and shows spinner → screen comes back with new data.

**With `silent`:** Add expense → drawer closes → table quietly updates with new row appearing (with the `fadeUp` animation).

The silent approach makes the app feel like a native application rather than a website that reloads after every action.

---

*End of PATTERNS.md*