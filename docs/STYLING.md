# CSS Architecture — STYLING.md

This document explains every structural and visual decision baked into `src/index.css` — the single stylesheet that controls the entire look and feel of TrackMoney. It is written for someone who has never worked on a frontend project before.

---

## Table of Contents

1. [How CSS Variables (Design Tokens) Work](#1-how-css-variables-design-tokens-work)
2. [Dark Mode vs Light Mode](#2-dark-mode-vs-light-mode)
3. [Responsive Breakpoints](#3-responsive-breakpoints)
4. [Layout Architecture](#4-layout-architecture)
5. [Table Grid System](#5-table-grid-system)
6. [Key Component Class Naming Patterns](#6-key-component-class-naming-patterns)
7. [Animations](#7-animations)

---

## 1. How CSS Variables (Design Tokens) Work

### What is a CSS variable?

A CSS variable (also called a **custom property** or **design token**) is a named value you define once and reuse everywhere. Instead of scattering the hex code `#b8ff00` across hundreds of rules, you give it a memorable name, and then any rule anywhere in the stylesheet can refer to that name.

```
/* Define it once at the top */
:root {
    --acid: #b8ff00;
}

/* Use it anywhere */
.some-button {
    background: var(--acid);
}

.some-title {
    color: var(--acid);
}
```

The `:root` selector means "the very top of the document" — effectively the `<html>` element. Variables defined there are **global**: every element on the page can read them.

When you later want to change the brand color from lime green to something else, you change it in **one place** (the `:root` block), and every button, title, badge, and border that uses `var(--acid)` updates automatically.

---

### All variables defined in this project

The complete set of variables is defined in the `:root` block at the very top of `src/index.css` (lines 12–53).

#### Colors

| Variable | Raw value | What it is used for |
|---|---|---|
| `--acid` | `#b8ff00` | The primary brand color — a vivid lime green. Used for active states, highlights, the logo accent, button fills, and any element that needs to shout "this is selected / important." |
| `--acid-dim` | `rgba(184, 255, 0, 0.07)` | A barely-visible tint of acid green. Used for hover backgrounds, subtle row highlights, and the scrollbar thumb track. At 7% opacity it reads as "gently highlighted" without being distracting. |
| `--acid-mid` | `rgba(184, 255, 0, 0.18)` | A medium-strength acid tint. Used for borders on focused inputs, active filter chips, and the topbar glow line. More visible than `--acid-dim` but still translucent. |
| `--acid-glow` | `rgba(184, 255, 0, 0.35)` | A stronger acid tint, used primarily in `box-shadow` declarations to produce the neon glow effect on the floating action button (FAB) and other prominent elements. |
| `--red` | `#ff3b5c` | Danger / debit color. Used for spent amounts, delete button hovers, and error states. |
| `--red-dim` | `rgba(255, 59, 92, 0.1)` | Subtle red background tint. Used for the hover background of danger icon buttons so the button surface reacts without being alarming. |
| `--green` | `#00f0a0` | Credit / top-up color. Used for amounts that represent money coming **in** (top-ups, credits). A bright teal-green distinct from the acid lime. |
| `--green-dim` | `rgba(0, 240, 160, 0.1)` | Subtle green background tint. Same role as `--red-dim` but for positive/success states. |
| `--amber` | `#ffb300` | Warning / neutral highlight color. Available for badges and status indicators that sit between success and danger. |
| `--blue` | `#4daaff` | Informational color. Used in the auth screen (register button), chat icon tints, and any UI element that should feel "safe / informational" rather than branded. |
| `--purple` | `#9b7fff` | Secondary accent. Used in the "Create Tag" dialog header icon and the purple variant of dialog buttons. Provides visual variety without competing with the main acid brand color. |
| `--purple-dim` | `rgba(155, 127, 255, 0.12)` | Subtle purple tint, used for the background of purple-themed dialog icons and active states. |

#### Backgrounds and Surfaces

The app has a deliberate layering system: the darkest surface sits behind everything, and progressively lighter surfaces sit on top of it, creating visual depth without shadows.

| Variable | Raw value | What it represents |
|---|---|---|
| `--ink` | `#080b11` | The absolute darkest background — almost pure black with a very faint blue tint. This is the base layer: the page background itself, and the main content area behind the expense rows. |
| `--ink-2` | `#0c1019` | The second layer. Used for the topbar, the sidebar, and the sticky table header — surfaces that sit "on top of" the raw page. |
| `--ink-3` | `#101522` | The third layer. Used for open/expanded expense rows, dialog panels, and input backgrounds inside dialogs. |
| `--ink-4` | `#151d2e` | The fourth layer. Used for the table header inside dialogs, and for `<input>` backgrounds inside forms — representing the deepest interactive element in the stack. |
| `--ink-5` | `#1b2438` | The fifth layer. The lightest dark surface, used sparingly for extremely elevated elements or hover states on `--ink-4` backgrounds. |

Think of these like a stack of semi-transparent sheets of dark glass. Each sheet is slightly lighter, so the one on top always "reads" as closer to you.

#### Text

| Variable | Raw value | What it is |
|---|---|---|
| `--text` | `#e4e8f4` | Primary text color — a soft off-white with a very slight blue tint. Used for all main readable text (bank names, amounts, descriptions). |
| `--muted` | `rgba(228, 232, 244, 0.45)` | Secondary text — the same base color but at 45% opacity. Used for labels, user names in the topbar, and any text that is supporting rather than primary. |
| `--faint` | `rgba(228, 232, 244, 0.22)` | Tertiary text — 22% opacity. Used for column headers, section labels, placeholder-level text that should recede into the background. |
| `--ghost` | `rgba(228, 232, 244, 0.10)` | Nearly invisible text — 10% opacity. Used for large decorative characters (like the oversized `₹` symbol in the empty-state display) that provide texture without demanding attention. |

#### Borders

All border colors are transparent-white overlays, so they automatically work on any dark background without looking out of place.

| Variable | Raw value | What it is |
|---|---|---|
| `--line` | `rgba(255, 255, 255, 0.055)` | The default hairline separator. Used for nearly all `border` declarations in the app — between rows, around cards, under the topbar. Extremely subtle. |
| `--line-mid` | `rgba(255, 255, 255, 0.10)` | A slightly more visible separator. Used for the totals footer row at the bottom of the table and focused input borders. |
| `--line-str` | `rgba(255, 255, 255, 0.16)` | The strongest border — used when an element really needs to be distinct from its background, such as dialogs rendered on top of overlays. |

#### Typography

| Variable | Value | What it is used for |
|---|---|---|
| `--f-head` | `"Barlow Condensed", sans-serif` | The heading / label font. A condensed, uppercase-friendly typeface loaded from Google Fonts. Used for section labels, column headers, the logo, topbar ticker labels, button text, and all small-caps uppercase labels throughout the app. Its narrow letterforms pack a lot of text into a small space. |
| `--f-body` | `"Barlow", sans-serif` | The body font. The regular (non-condensed) version of Barlow. Used for expense descriptions, entry text, chat messages, and any prose-style content that needs comfortable reading width. |
| `--f-mono` | `"DM Mono", monospace` | The monospace font. All numbers — amounts, balances, date inputs, the datepicker — use this font so that digits always have the same width. This prevents columns of numbers from "dancing" as values change. |

#### Border Radius

| Variable | Value | What it is |
|---|---|---|
| `--r-sm` | `4px` | Small radius. Used on inputs, small buttons, and icon buttons. Enough to soften the corners without looking "rounded." |
| `--r-md` | `6px` | Medium radius. Used on dialogs, drawer panels, dropdown menus, and tag chips. The most common radius in the app. |
| `--r-lg` | `10px` | Large radius. Used on the mobile chat dialog and other elements where a friendlier, more app-like feel is wanted. |

#### Layout Constants

| Variable | Value | What it is |
|---|---|---|
| `--topbar-h` | `56px` | The fixed height of the top navigation bar. Defined here so the topbar and every element below it can reference the same value. Shrinks to `52px` on mobile via a media query override. |
| `--sidebar-w` | `256px` | The fixed width of the left sidebar. Referenced in the sidebar CSS rule itself and grows to `280px` on large desktop screens via a media query override. |

> **Note:** There is also a `--bottomnav-h: 60px` variable defined in `:root`, reserved for a potential bottom navigation bar on mobile (currently used only to position the floating action button above the bottom safe area).

---

## 2. Dark Mode vs Light Mode

### Dark mode is the default

When the page first loads, no special class is added to anything. The `:root` variables defined above are the dark theme. The entire app — every background, every text color, every border — reads from those variables by default.

### How light mode is activated

Light mode is activated by adding the CSS class `light` to the `<body>` element:

```html
<body class="light">
```

In `src/index.css`, there is a `body.light { ... }` block that **overrides every single design token**:

```css
body.light {
    --acid:      #5a9600;        /* darker olive green (readable on white) */
    --acid-dim:  rgba(90, 150, 0, 0.07);
    --acid-mid:  rgba(90, 150, 0, 0.18);
    --acid-glow: rgba(90, 150, 0, 0.25);
    --red:       #d92b4a;
    --red-dim:   rgba(217, 43, 74, 0.08);
    --green:     #008060;
    --green-dim: rgba(0, 128, 96, 0.08);
    --ink:       #f4f6fc;        /* near-white base */
    --ink-2:     #eceef8;
    --ink-3:     #e4e8f4;
    --ink-4:     #d8dcf0;
    --ink-5:     #cdd3ec;
    --line:      rgba(0, 0, 0, 0.07);
    --line-mid:  rgba(0, 0, 0, 0.12);
    --line-str:  rgba(0, 0, 0, 0.18);
    --text:      #1a1f35;        /* near-black text */
    --muted:     rgba(26, 31, 53, 0.5);
    --faint:     rgba(26, 31, 53, 0.3);
    --ghost:     rgba(26, 31, 53, 0.1);
}
```

Notice what changed:
- `--ink` flips from near-black `#080b11` to near-white `#f4f6fc`. The layering system reverses: now each `--ink-N` surface is slightly **darker** than the previous, maintaining depth on a light background.
- `--text` flips from light `#e4e8f4` to dark `#1a1f35`.
- `--line` switches from white-alpha to black-alpha, because white borders are invisible on a white background.
- `--acid` shifts from lime `#b8ff00` to a darker olive `#5a9600`. The raw lime is unreadable on a white surface (insufficient contrast), so the light-mode version is a much darker green that still reads as "the brand color" but is legible.

### Why no component needs to know about dark/light mode

This is the key architectural benefit. **Zero component code checks whether dark mode is on.** Every component just uses `var(--ink)`, `var(--text)`, `var(--acid)`, etc. When the `light` class is added to `<body>`, the browser automatically re-resolves every `var()` call using the new values from `body.light { ... }`, and the entire app repaints instantly.

The toggle itself lives in `src/store/useStore.js`:

```js
// When toggling to light mode:
document.body.classList.add("light");

// When toggling back to dark:
document.body.classList.remove("light");
```

That single DOM class change is all that is needed. No props drilling, no React context, no component re-renders caused by the theme — just CSS variables doing their job.

---

## 3. Responsive Breakpoints

A **breakpoint** is a screen width at which the layout changes to better suit the available space. CSS media queries let you write rules that only apply when the screen is above or below a certain width.

This project has four breakpoints, defined at the bottom of `src/index.css`:

---

### Large desktop — `min-width: 1400px`

```css
@media (min-width: 1400px) { ... }
```

**When it applies:** Screens wider than 1400px (large monitors, ultra-wide displays).

**What changes:**
- `--sidebar-w` grows from `256px` to `280px` — the extra space on a large monitor means the sidebar can breathe a little.
- The summary strip numbers grow (`.summary-value` font size increases).
- The expense table columns get more generous widths: the grid shifts from `72px 1fr 110px 100px 100px 100px 44px` to `80px 1fr 130px 110px 110px 110px 52px` — each column is slightly wider to fill the available real estate.

---

### Tablet landscape — `max-width: 1100px`

```css
@media (max-width: 1100px) { ... }
```

**When it applies:** Screens up to 1100px wide (small laptop, tablet in landscape orientation).

**What changes:**
- The table grid simplifies. The "preview tags" column is hidden entirely (`display: none` on `.exp-preview-col`) — those decorative tag previews visible at the far right of the details area are a luxury that doesn't fit at this width.
- The remaining columns rebalance to `68px 1fr 90px 90px 44px`.
- The inline-add-entries form and entry rows get extra left padding to stay visually aligned with the rows above.

At this width, the sidebar is still always visible (no drawer yet).

---

### Tablet portrait — `max-width: 860px`

```css
@media (max-width: 860px) { ... }
```

**When it applies:** Screens up to 860px wide (tablet in portrait mode, large phone landscape).

**What changes:**

**Sidebar becomes a slide-in drawer:**
```css
.sidebar {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    transform: translateX(-100%);  /* hidden off-screen to the left */
}
.sidebar.open {
    transform: translateX(0);      /* slides in when .open is added */
    animation: slideInLeft 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
```
The sidebar is no longer part of the normal document flow. It lives off-screen to the left, and a dark backdrop overlay (`.sidebar-backdrop`) appears behind it when it opens. The hamburger menu button (`.topbar-menu-btn`) becomes visible to give the user a way to open the sidebar.

**Topbar simplifications:**
- The ticker strip (account balance summaries in the topbar) is hidden — not enough room.
- The user's name next to the avatar disappears; only the avatar circle remains.
- The logo text shrinks slightly.

**Command bar compacted:**
- Keyboard shortcut hints (`.cmd-key`) are hidden.
- Filter chip text labels disappear; only the colored dot remains.
- The "Add Expense" button text disappears; only the `＋` icon remains.

**Table columns further simplified:** The "remaining balance" column is hidden, reducing to `64px 1fr 100px 40px`.

**Summary strip:** Reorganizes from a 4-column horizontal strip to a **2×2 grid** so each cell has enough width to display its number.

---

### Mobile — `max-width: 600px`

```css
@media (max-width: 600px) { ... }
```

**When it applies:** Screens up to 600px wide (smartphones in portrait).

This is the most dramatic transformation. The desktop table is completely replaced by mobile cards:

**Table hidden, cards shown:**
```css
.table-area .table-head { display: none; }   /* no column headers */
.expense-row             { display: none; }  /* no desktop rows */
.expense-card            { display: block; } /* mobile cards appear */
.entries-panel           { display: none; }  /* no desktop entry panels */
```

Each expense is now rendered as a self-contained card (`ExpenseTable.jsx` renders both `<DesktopRow>` and `<MobileCard>` for every expense — CSS decides which one is visible).

**"Add Expense" button hidden, FAB shown:**
The command-bar button (`display: none`) is replaced by a round floating action button (`.mobile-fab`) that appears fixed at the bottom-right corner of the screen. This is the standard mobile UX pattern for a primary action.

**Drawer goes full-screen:** On a phone, a side-drawer that is 480px wide would be wider than the screen. The drawer switches to `width: 100vw` (full screen width) and removes its left border.

**Topbar stripped down:** Desktop-only controls hidden entirely. The user chip (avatar + name) disappears — the sidebar mobile controls (dark mode, privacy, logout) are accessible from the sidebar drawer instead.

**Safe-area insets:** iOS notch/home-indicator-aware spacing is applied to drawers and dialogs using `env(safe-area-inset-*)` so content is never obscured by hardware features.

---

### Tiny mobile — `max-width: 380px`

```css
@media (max-width: 380px) { ... }
```

**When it applies:** Very small phones (older iPhones, small Android devices).

Minor adjustments only: the logo shrinks slightly, summary values use a smaller font size, and the auth screen heading shrinks so it still fits on one line.

---

## 4. Layout Architecture

The app's layout is built from a small set of flexbox containers that nest inside each other. Understanding these five classes explains how everything fits together.

### The full chain

```
<body>
  └── #root
        └── .app-shell          ← full-screen vertical stack
              ├── .topbar        ← fixed-height top bar
              └── .body-layout   ← everything below the topbar
                    ├── .sidebar      ← fixed-width left panel
                    └── .main-content ← takes all remaining width
                          ├── .command-bar    ← search + action buttons
                          ├── .search-panel   ← collapsible filter form
                          ├── .table-area     ← the scrollable expense list
                          └── .pagination     ← page controls
```

---

### `.app-shell`

```css
.app-shell {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    overflow: hidden;
}
```

`100dvh` means "100% of the **dynamic** viewport height." On mobile browsers the regular `100vh` is unreliable because it doesn't account for the browser's own UI chrome (address bar, bottom bar) appearing and disappearing. `dvh` updates dynamically.

`flex-direction: column` stacks children vertically: topbar on top, everything else below. `overflow: hidden` prevents the shell itself from scrolling — scrolling only happens inside `.table-area`.

---

### `.body-layout`

```css
.body-layout {
    flex: 1;
    display: flex;
    overflow: hidden;
}
```

`flex: 1` tells this element to take all remaining vertical space after the topbar has claimed its `56px`. `display: flex` with no `flex-direction` defaults to `row`, so the sidebar and main content sit side by side horizontally.

---

### `.sidebar`

```css
.sidebar {
    width: var(--sidebar-w);   /* 256px */
    flex-shrink: 0;
    background: var(--ink-2);
    border-right: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 150;
}
```

`flex-shrink: 0` is critical: it tells the flexbox engine that the sidebar must **never** shrink below its declared `256px`, even if space is tight. Without this, flexbox might squish it to fit everything in.

`overflow-y: auto` enables vertical scrolling inside the sidebar if the bank list is very long.

`transition: transform 0.28s` is the engine behind the mobile slide-in animation. Even on desktop where the transform never fires, the transition property sits there ready for when the breakpoint switches.

---

### `.main-content`

```css
.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--ink);
    min-width: 0;
}
```

`flex: 1` means "take all horizontal space the sidebar didn't claim." `min-width: 0` is a flexbox quirk: without it, a flex child defaults to `min-width: auto`, which can cause overflow. Setting it to `0` lets the element shrink past its content size when needed.

`overflow: hidden` prevents the main column itself from scrolling — only the child `.table-area` scrolls.

---

### `.table-area`

```css
.table-area {
    flex: 1;
    overflow-y: auto;
}
```

This is the only element in the entire layout that actually scrolls vertically. Everything above it (command bar, search panel) sticks to the top. Everything below it (pagination) sticks to the bottom. `flex: 1` means it expands to fill whatever vertical space is left.

---

## 5. Table Grid System

The expense table uses CSS Grid with an identical column definition on three elements:

```css
.table-head,
.expense-row,
.expense-totals-row {
    display: grid;
    grid-template-columns: 72px 1fr 110px 100px 100px 100px 44px;
}
```

By giving all three elements the **exact same** `grid-template-columns`, their columns snap into perfect alignment regardless of content. There is no table element, no `colspan`, no JavaScript measurement — just the same grid template repeated.

### What each column represents

| Column | Width | Content |
|---|---|---|
| `72px` | Fixed | **Date** — the large day number and 3-letter month abbreviation (e.g., "12 / Jan"). Fixed width because dates never need to grow. |
| `1fr` | Flexible | **Details** — the bank name and day-of-week. Takes all remaining horizontal space. This is the only column that stretches. |
| `110px` | Fixed | **Preview tags** — small tag chips previewing this expense's entries. Hidden on tablet/mobile via `display: none` on `.exp-preview-col`. |
| `100px` | Fixed | **Top-up** — the credit/top-up amount (money coming in, shown in green). |
| `100px` | Fixed | **Spent** — the total debit amount (money going out, shown in red). |
| `100px` | Fixed | **Remaining** — the running account balance after this expense. Hidden on tablet portrait and below. |
| `44px` | Fixed | **Actions** — the expand chevron and delete button. Narrow because it only needs to fit icon-sized controls. |

At the `1400px` breakpoint this grid grows to `80px 1fr 130px 110px 110px 110px 52px`, and at `1100px` / `860px` it collapses to fewer columns as described in the breakpoints section.

The `.expense-totals-row` at the bottom of the table uses the same grid but only populates the "Top-up" and "Spent" cells, leaving the rest empty — which is fine because CSS Grid does not require every cell to be filled.

---

## 6. Key Component Class Naming Patterns

The CSS classes follow a loose **BEM-inspired prefix convention** that groups related classes by feature area. Each prefix tells you at a glance which part of the app a class belongs to.

### `.d-*` — Dialog and Drawer form elements

These classes are shared between the "Add Expense" drawer and all modal dialogs.

| Class | What it styles |
|---|---|
| `.d-label` | The tiny uppercase label above a form field (e.g., "DATE", "ENTRIES") |
| `.d-input` | A generic `<input>` or `<select>` element inside a dialog |
| `.d-input-wrap` | A wrapper `<div>` around an input that adds the icon on the left and focus border glow |
| `.d-input-wrap:focus-within` | When anything inside the wrap is focused, the entire wrap's border turns acid-green |
| `.d-input-field` | The actual `<input>` inside a `.d-input-wrap` (no border of its own — the wrap handles it) |
| `.d-input-icon` | The icon displayed to the left of the input inside a wrap |
| `.d-entry-card` | A bordered card wrapping a single expense entry row in the add-expense form |
| `.d-entry-row` | The horizontal flex row inside an entry card (amount + description + delete) |
| `.d-entry-input` | Individual input fields inside an entry card |
| `.d-entry-del` | The × delete button at the right of an entry row |
| `.d-add-entry-btn` | The "＋ Add Another Entry" dashed-border button at the bottom of the entry list |
| `.d-tag-pill` | A tag chip displayed inside a dialog form |
| `.d-btn` | Base class for dialog action buttons |
| `.d-btn-ghost` | A transparent "Cancel" style button |
| `.d-btn-primary` | A filled "Submit" style button using the acid green |
| `.d-btn-cancel` | Cancel button with a more explicit border style (used in dialog footers) |
| `.d-btn-create` | Create/confirm button with acid fill (used in the Create Tag dialog) |
| `.d-btn-purple` | A purple variant of the create button (used in the Create Bank dialog) |
| `.d-bank-display` | The read-only display of the currently selected bank inside the add-expense drawer |
| `.d-bank-dot` | The colored dot indicator before the bank name |
| `.d-bank-name` | The bank name text inside the read-only display |

---

### `.exp-*` — Expense table elements

These classes style the main expense table rows and their cells.

| Class | What it styles |
|---|---|
| `.exp-date-day` | The large bold day number (e.g., "12") in the date column |
| `.exp-date-mon` | The month abbreviation (e.g., "Jan") below the day number |
| `.exp-meta-bank` | The bank name line inside the details column |
| `.exp-meta-dot` | The small colored dot before the bank name |
| `.exp-meta-day` | The day-of-week text (e.g., "Monday") below the bank name |
| `.exp-previews` | The container of preview tag chips in the preview column |
| `.exp-preview-tag` | An individual preview tag chip |
| `.exp-preview-col` | Applied to the preview column cell — hidden on tablet/mobile |
| `.exp-amt` | Container for an amount cell (top-up, spent, or remaining) |
| `.exp-amt-main` | The main amount number inside an amount cell |
| `.exp-amt-sub` | A secondary smaller number below the main amount |
| `.exp-chev-wrap` | The wrapper for the expand chevron and delete button at the row end |
| `.exp-chev` | The expand/collapse chevron arrow |
| `.exp-del-btn` | The delete button on an expense row (only visible on hover) |

---

### `.entry-*` — Expense entry row elements (inside an open expense)

These style the sub-rows revealed when an expense is expanded.

| Class | What it styles |
|---|---|
| `.entry-row` | A single expense entry line (description + amount + delete) |
| `.entry-desc-wrap` | The clickable wrapper around the description (clicking opens the tag editor) |
| `.entry-desc` | The description text itself |
| `.entry-tag-list` | The horizontal list of tags on an entry row |
| `.entry-tag` | An individual tag chip on an entry row |
| `.entry-amt-val` | The amount value on an entry row |
| `.entry-del-btn` | The delete button on an entry row |
| `.entries-panel` | The panel that appears below an expanded expense row (desktop only) |
| `.entries-table-head` | The column label row inside the entries panel |

---

### `.sidebar-*` — Sidebar elements

| Class | What it styles |
|---|---|
| `.sidebar-section` | A vertical section inside the sidebar with consistent padding |
| `.sidebar-section-label` | The uppercase label above a section (e.g., "ACCOUNTS") with an acid underline |
| `.sidebar-mobile-controls` | The row of dark-mode / privacy / logout buttons shown inside the sidebar on mobile |
| `.sidebar-ctrl-btn` | An individual control button in the mobile controls row |
| `.sidebar-backdrop` | The dark overlay behind the sidebar when it is open as a drawer |
| `.sidebar-footer` | The small version number / date text at the bottom of the sidebar |

---

### `.auth-*` — Login and Register screen elements

| Class | What it styles |
|---|---|
| `.auth-shell` | The full-screen container for the auth screens |
| `.auth-grid-bg` | The subtle grid-line background pattern on the auth screen |
| `.auth-glow` | The radial acid-green glow in the center of the auth background |
| `.auth-panel` | The centered card that contains the form |
| `.auth-scanlines` | A subtle scanline texture overlay on the auth panel (retro aesthetic) |
| `.auth-heading` | The large title text ("Sign In" / "Create Account") |
| `.auth-heading-accent` | A word inside the heading rendered in acid green |
| `.auth-input-wrap` | Wrapper around an auth input with icon and focus border |
| `.auth-input` | The actual input field inside an auth form |
| `.auth-submit` | The full-width submit button |
| `.auth-submit-arrow` | The `→` arrow decoration inside the submit button |
| `.auth-switch-link` | The "Don't have an account? Register" link at the bottom |

---

### `.chat-*` — Chat dialog elements

| Class | What it styles |
|---|---|
| `.chat-dialog-overlay` | The fullscreen dimmed backdrop behind the chat window |
| `.chat-dialog-panel` | The chat window panel itself |
| `.chat-dialog-messages` | The scrollable message history area |
| `.chat-bubble` | A single chat message bubble |
| `.chat-bubble--user` | A bubble sent by the user (right-aligned, acid tint) |
| `.chat-bubble--assistant` | A bubble from the AI assistant (left-aligned, ink-3 background) |
| `.chat-bubble--buffering` | A bubble showing the "typing..." animation while the AI responds |
| `.chat-buffer-spinner` | The spinning animation ring inside the buffering bubble |
| `.chat-dialog-input` | The message input textarea |
| `.chat-dialog-send` | The "Send" button |
| `.chat-shortcut-hint` | The "Press Space twice to chat" hint shown on desktop |

---

### `.tag-*` — Tag-related elements

| Class | What it styles |
|---|---|
| `.tag-cloud` | A wrapping container for a group of tag chips |
| `.tag-chip` | A small pill-shaped tag chip (sidebar tag filter area) |
| `.tag-search-select` | The entire tag multi-select component (input + chips + dropdown) |
| `.tag-search-chip` | A selected tag chip shown above the search input |
| `.tag-search-chip-remove` | The × button to remove a selected tag chip |
| `.tag-search-input` | The text input for searching/filtering tags |
| `.tag-search-dropdown-portal` | The portal-rendered dropdown list of matching tags |
| `.tag-search-option` | A single tag option in the dropdown |
| `.tag-search-check` | The ✓ checkmark shown on a selected option in the dropdown |
| `.tag-select-pill` | A pill-style tag selector used in some filter areas |
| `.tag-input-badge` | The "New ✦" or "Already exists" badge that appears inside the Create Tag input |
| `.tag-exists-notice` | The warning block shown when a tag name already exists |

---

## 7. Animations

All animations are defined as `@keyframes` blocks near the bottom of `src/index.css` (around line 3213). They are applied via `animation:` declarations elsewhere in the file.

### `fadeUp`

```css
@keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
}
```

**Used by:** `.expense-group` and `.expense-card` — every expense row and mobile card that appears in the list.

**What it does:** New items slide upward by 12px while fading in. This prevents the list from feeling like content is just "popping" into existence. It gives the illusion that data arrives from below and settles into position.

**Duration:** `0.3s ease` — fast enough to not delay the user, slow enough to be perceptible.

---

### `fadeIn`

```css
@keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
}
```

**Used by:** `.drawer-overlay`, `.sidebar-backdrop` — the dark overlay backgrounds that appear behind drawers and the mobile sidebar.

**What it does:** A simple opacity fade. Overlays shouldn't slide (they cover the full screen), so a plain fade is the correct treatment.

---

### `slideInRight`

```css
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
}
```

**Used by:** `.drawer` — the "Add Expense" side panel.

**What it does:** The drawer slides in from the right edge of the screen, matching the natural right-to-left reading of the side panel's position. It also fades in simultaneously, which softens the entry.

**Duration:** `0.28s cubic-bezier(0.34, 1, 0.64, 1)` — the cubic-bezier curve creates a slight overshoot ("spring") so the panel feels physical rather than mechanical.

---

### `slideInLeft`

```css
@keyframes slideInLeft {
    from { transform: translateX(-100%); }
    to   { transform: translateX(0); }
}
```

**Used by:** `.sidebar.open` on mobile/tablet — the sidebar drawer sliding in from the left.

**What it does:** The sidebar enters from the left (matching its position on screen). No opacity fade here — the sidebar was already rendered; it just needed to be slid into view.

**Duration:** `0.28s cubic-bezier(0.4, 0, 0.2, 1)` — the standard Material Design easing curve for elements entering from off-screen.

---

### `slideDown`

```css
@keyframes slideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
}
```

**Used by:** Dropdowns and menus that appear below a trigger element.

**What it does:** The dropdown slides downward (from slightly above its final position) while fading in, reinforcing the idea that the menu is opening downward from the trigger.

---

### `spin` and `spinReverse`

```css
@keyframes spin        { to { transform: rotate(360deg);  } }
@keyframes spinReverse { to { transform: rotate(-360deg); } }
```

**Used by:** The loader animation (`.loader-ring-1`, `.loader-ring-2`) and the chat buffering spinner (`.chat-buffer-spinner`).

**What they do:** `spin` rotates an element clockwise continuously; `spinReverse` rotates it counterclockwise. The loader uses both simultaneously on two concentric rings, creating a visually interesting interlocking spinner effect.

**Accessibility note:** The stylesheet respects the operating system's "reduce motion" preference:

```css
@media (prefers-reduced-motion: reduce) {
    .chat-buffer-spinner {
        animation: none;
        /* falls back to static indicator */
    }
}
```

Users who have enabled "Reduce Motion" in their OS accessibility settings will not see the spinning animation in the chat buffer indicator.

---

*End of STYLING.md*