import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "../store/useStore.js";
import Topbar from "./Topbar.jsx";
import Sidebar from "./Sidebar.jsx";
import SearchPanel from "./SearchPanel.jsx";
import ExpenseTable from "./ExpenseTable.jsx";
import Pagination from "./Pagination.jsx";
import AddExpenseDrawer from "./AddExpenseDrawer.jsx";
import CreateBankDialog from "./CreateBankDialog.jsx";
import ManageTagsDialog from "./ManageTagsDialog.jsx";
import ApplyTagsDialog from "./ApplyTagsDialog.jsx";
import ChatAssistantDialog from "./ChatAssistantDialog.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import ExpenseInsights from "./ExpenseInsights.jsx";
import ProfilePage from "./ProfilePage.jsx";
import RefreshButton from "./RefreshButton.jsx";
import ExcludedTagsDialog from "./ExcludedTagsDialog.jsx";
import InsightsFilterBar from "./InsightsFilterBar.jsx";
import useWideScreen, { useTabletScreen, usePhoneScreen } from "../useWideScreen.js";
import MobileTopArea from "./MobileTopArea.jsx";
import ShortcutsDialog from "./ShortcutsDialog.jsx";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts.js";
import { flattenCursorItems, stepCursor } from "../utils/kbCursor.js";
import { keyHint } from "../utils/shortcuts.js";
import { Plus } from "lucide-react";

// A small key hint on a button (hidden on touch screens by CSS).
const Kbd = ({ id }) => <kbd className="kb-hint" aria-hidden="true">{keyHint(id)}</kbd>;

// Short corner message when a shortcut has nothing to act on. Skips an exact repeat.
function hint(msg) {
  const { alertMessages, pushAlert } = useStore.getState();
  if (alertMessages.some((m) => m?.msg === msg)) return;
  pushAlert(msg, "hint");
}

function isTypingInField(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export default function Dashboard() {
  const {
    setApplyEntryTagVisible,
    setApplyTagEntry,
    chatbotEnabled,
    setAdminDashboardOpen,
    isAdminDashboardOpen,
    profileOpen,
    analyticsOpen,
    setAnalyticsOpen,
    refreshAll,
    refreshIngest,
    notifyPendingIngest,
    isLoggedIn,
  } = useStore();
  const wide = useWideScreen();
  const tablet = useTabletScreen();
  const phone = usePhoneScreen();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [excludedOpen, setExcludedOpen] = useState(false);
  // Phones: the accounts / balance / search block can be tucked away from the
  // dropdown beside the logo. Remembered between visits.
  const [topOpen, setTopOpen] = useState(() => {
    try {
      return localStorage.getItem("smm_top_open") !== "0";
    } catch {
      return true;
    }
  });
  const toggleTop = () =>
    setTopOpen((v) => {
      try {
        localStorage.setItem("smm_top_open", v ? "0" : "1");
      } catch {
        /* storage blocked: still works for this visit */
      }
      return !v;
    });

  const handleEditEntry = (entry) => {
    setApplyTagEntry(entry);
    setApplyEntryTagVisible(true);
  };
  // Every time the dashboard loads: announce SMS-automation expenses waiting for review.
  const pendingNoticeDone = useRef(false);
  useEffect(() => {
    if (!isLoggedIn || pendingNoticeDone.current) return;
    pendingNoticeDone.current = true;
    notifyPendingIngest();
  }, [isLoggedIn]);

  // Pull in new expenses (e.g. added by the SMS webhook) when you come back to the tab.
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 20000) return;
      last = Date.now();
      const s = useStore.getState();
      if (s.isAdminDashboardOpen) return;
      if (s.profileOpen) s.refreshIngest();
      else s.refreshAll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [isLoggedIn]);

  // ── Keyboard shortcuts (tablet and desktop; the list lives in utils/shortcuts.js) ──
  const shortcutHandlers = {
    addExpense: () => setDrawerOpen(true),
    search: () => setSearchOpen(true),
    chat: () => chatbotEnabled && setChatOpen(true),
    newBank: () => useStore.getState().setCreateBankDialogVisible(true),
    manageTags: () => setTagDialogOpen(true),
    refresh: () => useStore.getState().refreshAll(),
    theme: () => {
      const st = useStore.getState();
      st.updateUserPreferences({ is_dark_mode: !st.isDarkMode });
    },
    sidebar: () => {
      if (window.innerWidth <= 860) setSidebarOpen((v) => !v);
      else hint("The sidebar is always visible on this screen");
    },
    help: () => {
      const st = useStore.getState();
      // Never stack the cheat-sheet on top of another dialog.
      if (!st.shortcutsOpen && document.querySelector(".dialog-overlay, .drawer-overlay, .chat-dialog-overlay, .insights-modal-backdrop")) return;
      st.setShortcutsOpen(!st.shortcutsOpen);
    },
    openLatest: () => {
      const st = useStore.getState();
      const latest = st.filteredExpensesList[0];
      if (!latest) return hint("No expenses to open yet. Press E to add one");
      document.activeElement?.blur?.();
      st.openExpense(latest.id);
      st.setKbCursor({ expId: latest.id, eeId: null });
    },
    next: () => moveCursor(1),
    prev: () => moveCursor(-1),
    toggleRow: () => {
      const st = useStore.getState();
      if (!st.kbCursor) return hint("Press N to highlight an expense first");
      // On an entry, Enter edits it; on a day row it expands or collapses the day.
      if (st.kbCursor.eeId) return editHighlightedEntry();
      st.toggleExpenseOpen(st.kbCursor.expId);
    },
    editEntry: () => editHighlightedEntry(),
    nextBank: () => moveBank(1),
    prevBank: () => moveBank(-1),
    prevPage: () => changePage(-1),
    nextPage: () => changePage(1),
    escape: () => {
      const st = useStore.getState();
      if (st.shortcutsOpen) return st.setShortcutsOpen(false) || true;
      // These dialogs have no Esc handling of their own.
      if (st.confirmState) return st.resolveConfirm(false) || true;
      if (st.isCreateBankDialogVisible) return st.setCreateBankDialogVisible(false) || true;
      if (st.isApplyEntryTagVisible) return st.setApplyEntryTagVisible(false) || true;
      if (drawerOpen) return setDrawerOpen(false) || true;
      if (searchOpen) return setSearchOpen(false) || true;
      // Another dialog (tags, chat, confirm...) closes itself on Esc.
      if (document.querySelector(".dialog-overlay, .chat-dialog-overlay, .insights-modal-backdrop")) return false;
      if (st.kbCursor) return st.setKbCursor(null) || true;
      return false;
    },
  };
  function editHighlightedEntry() {
    const st = useStore.getState();
    const c = st.kbCursor;
    const exp = c && st.filteredExpensesList.find((x) => x.id === c.expId);
    const entry = exp && c.eeId && (exp.expenses || []).find((e) => e.ee_id === c.eeId);
    if (!entry) return hint("Highlight an entry first: Enter to expand a day, then N");
    handleEditEntry({ ...entry, expenseId: exp.id });
  }
  function moveBank(dir) {
    const st = useStore.getState();
    const banks = st.banksList;
    if (banks.length < 2) return hint("You have only one account");
    const at = banks.findIndex((b) => b.bankId === st.currentSelectedBankId);
    const next = banks[(at + dir + banks.length) % banks.length];
    st.setKbCursor(null);
    st.fetchFilteredExpensesList(next);
  }
  function moveCursor(dir) {
    // A focused button would otherwise keep Enter for itself.
    document.activeElement?.blur?.();
    const st = useStore.getState();
    const items = flattenCursorItems(st.filteredExpensesList, st.openExpenseIds);
    if (!items.length) return hint("No expenses to move through");
    st.setKbCursor(stepCursor(items, st.kbCursor, dir));
  }
  function changePage(dir) {
    const st = useStore.getState();
    const ps = st.pageSize === "all" ? st.currentTotalExpenses : Number(st.pageSize);
    const totalPages = Math.max(1, Math.ceil(st.currentTotalExpenses / (ps || 1)));
    const target = st.pageNumber + dir;
    if (target < 1 || target > totalPages)
      return hint(dir < 0 ? "You are on the first page" : "You are on the last page");
    st.setPageNumber(target);
    st.fetchExpenses();
  }
  useKeyboardShortcuts(!phone && isLoggedIn && !isAdminDashboardOpen && !profileOpen, shortcutHandlers);

  // Desktop: analytics is on by default when the dashboard opens.
  useEffect(() => {
    if (wide) setAnalyticsOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Analytics: split view on desktop, popup on tablets, off on phones.
  const showSplit = analyticsOpen && wide;
  const showModal = analyticsOpen && tablet;
  useEffect(() => {
    if (!wide && !tablet && analyticsOpen) setAnalyticsOpen(false);
  }, [wide, tablet, analyticsOpen, setAnalyticsOpen]);
  useEffect(() => {
    if (!showModal) return;
    const esc = (e) => e.key === "Escape" && setAnalyticsOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [showModal, setAnalyticsOpen]);
  const openChat = useCallback(() => setChatOpen(true), []);
  const closeChat = useCallback(() => setChatOpen(false), []);

  useEffect(() => {
    if (!chatbotEnabled) return;
    let lastSpaceAt = 0;
    const DOUBLE_MS = 480;
    const onKeyDown = (e) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (document.querySelector(".chat-dialog-overlay")) return;
      if (isTypingInField(document.activeElement)) return;
      if (document.activeElement?.closest?.(".tag-search-dropdown-portal"))
        return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastSpaceAt < DOUBLE_MS) {
        lastSpaceAt = 0;
        setChatOpen(true);
      } else {
        lastSpaceAt = now;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chatbotEnabled]);

  return (
    <div className="app-shell">
      <Topbar
        onMenuClick={() => setSidebarOpen((v) => !v)}
        onOpenChat={openChat}
        onOpenAdmin={() => setAdminDashboardOpen(true)}
        onOpenExcludedTags={() => setExcludedOpen(true)}
        topOpen={topOpen}
        onToggleTop={toggleTop}
      />

      <div className="body-layout">
        {!phone && (
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            activeTagFilter={tagFilter}
            onTagFilter={setTagFilter}
            onOpenAdmin={() => setAdminDashboardOpen(true)}
          />
        )}

        <main className="main-content">
          {isAdminDashboardOpen ? (
            <AdminDashboard />
          ) : profileOpen ? (
            <ProfilePage />
          ) : (
            <>
              {phone ? (
                <>
                  <MobileTopArea
                    open={topOpen}
                    onOpenFilter={() => setSearchOpen((v) => !v)}
                    onOpenTag={() => setTagDialogOpen(true)}
                  />
                </>
              ) : (
                <>
                  {/* Command Bar */}
                  <div className="command-bar">
                    <div className="cmd-actions">
                      <button
                        type="button"
                        className="add-expense-btn"
                        onClick={() => setSearchOpen((v) => !v)}
                      >
                        <span>⌕</span>
                        <span className="btn-text">Search / filter</span>
                        <Kbd id="search" />
                      </button>
                      <button
                        onClick={() => setTagDialogOpen(true)}
                        className="add-expense-btn"
                      >
                        Tags
                        <Kbd id="manageTags" />
                      </button>
                      <button
                        className="add-expense-btn"
                        onClick={() => setDrawerOpen(true)}
                      >
                        <span>＋</span>
                        <span className="btn-text">Add Expense</span>
                        <Kbd id="addExpense" />
                      </button>
                      {/* Last in the DOM so the :nth-child button styling above is untouched;
                          CSS puts it first visually. */}
                      <RefreshButton className="cmd-refresh" label="Refresh expenses (R)" onClick={() => refreshAll()} />
                    </div>
                  </div>
                </>
              )}

              {/* Search Panel */}
              <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />

              {/* Workspace: expenses on the left; when Analytics is on, a filter
                  row on top and charts of the visible rows on the right. */}
              <div className={`workspace${showSplit ? " split" : ""}`}>
                {showSplit && <InsightsFilterBar />}
                <div className="workspace-body">
                  <div className="workspace-left">
                    <ExpenseTable onEditEntry={handleEditEntry} />
                  </div>
                  {showSplit && <ExpenseInsights />}
                </div>
              </div>

              {/* Pagination (full width, so it never sits under the chat hint) */}
              <Pagination />
            </>
          )}
        </main>
      </div>

      <ExcludedTagsDialog open={excludedOpen} onClose={() => setExcludedOpen(false)} />

      {showModal && (
        <div
          className="insights-modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setAnalyticsOpen(false)}
        >
          <div className="insights-modal" role="dialog" aria-label="Analytics">
            <InsightsFilterBar />
            <ExpenseInsights onClose={() => setAnalyticsOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile floating FAB — bottom right, only on mobile */}
      {!isAdminDashboardOpen && !profileOpen && (
      <button
        className="mobile-fab"
        onClick={() => setDrawerOpen(true)}
        aria-label="Add expense"
      >
        <Plus size={20} strokeWidth={2.6} aria-hidden="true" />
        <span>Add</span>
      </button>
      )}

      {/* Overlays */}
      <AddExpenseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <CreateBankDialog />
      <ManageTagsDialog
        open={tagDialogOpen}
        onClose={() => setTagDialogOpen(false)}
      />
      <ApplyTagsDialog />
      <ShortcutsDialog />
      {chatbotEnabled && (
        <>
          <ChatAssistantDialog open={chatOpen} onClose={closeChat} />
          {!isAdminDashboardOpen && (
            <h1 className="chat-shortcut-hint">Press Space twice to chat with me</h1>
          )}
        </>
      )}
    </div>
  );
}
