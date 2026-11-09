import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "../store/useStore.js";
import Topbar from "./Topbar.jsx";
import Sidebar from "./Sidebar.jsx";
import SearchPanel from "./SearchPanel.jsx";
import ExpenseTable from "./ExpenseTable.jsx";
import Pagination from "./Pagination.jsx";
import AddExpenseDrawer from "./AddExpenseDrawer.jsx";
import CreateBankDialog from "./CreateBankDialog.jsx";
import CreateTagDialog from "./CreateTagDialog.jsx";
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
import { Plus } from "lucide-react";
import McpBox from "./McpBox.jsx";

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
                  <div className="mcp-box-row">
                    <McpBox />
                  </div>
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
                    <McpBox />
                    <div className="cmd-actions">
                      <button
                        type="button"
                        className="add-expense-btn"
                        onClick={() => setSearchOpen((v) => !v)}
                      >
                        <span>⌕</span>
                        <span className="btn-text">Search / filter</span>
                      </button>
                      <button
                        onClick={() => setTagDialogOpen(true)}
                        className="add-expense-btn"
                      >
                        + Tag
                      </button>
                      <button
                        className="add-expense-btn"
                        onClick={() => setDrawerOpen(true)}
                      >
                        <span>＋</span>
                        <span className="btn-text">Add Expense</span>
                      </button>
                      {/* Last in the DOM so the :nth-child button styling above is untouched;
                          CSS puts it first visually. */}
                      <RefreshButton className="cmd-refresh" label="Refresh expenses" onClick={() => refreshAll()} />
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
      <CreateTagDialog
        open={tagDialogOpen}
        onClose={() => setTagDialogOpen(false)}
      />
      <ApplyTagsDialog />
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
