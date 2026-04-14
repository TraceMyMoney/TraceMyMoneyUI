import React, { useState, useRef, useEffect } from "react";
import { useStore, fmtNum } from "../store/useStore.js";
import { Eye, EyeOff } from "lucide-react";

const COLORS = [
  "var(--acid)",
  "var(--blue)",
  "var(--amber)",
  "var(--purple)",
  "var(--green)",
];

export default function Sidebar({
  open,
  onClose,
  activeTagFilter,
  onTagFilter,
}) {
  const {
    banksList,
    privacyMode,
    isDarkMode,
    currentTotalOfTopupExpenses,
    currentTotalOfExpenses,
    currentTotalExpenses,
    fetchFilteredExpensesList,
    setCreateBankDialogVisible,
    deleteBank,
    updateUserPreferences,
    logoutUser,
    reorderBanks,
  } = useStore();

  const [activeIdx, setActiveIdx] = useState(0);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── refs (don't need to trigger re-renders) ───────────────────────────────
  const dragSrcIdx = useRef(null); // index of the card being dragged
  const ghostRef = useRef(null); // floating clone that follows the finger
  const listRef = useRef(null); // wrapper <div> around all .account-card nodes
  const touchOffset = useRef({ x: 0, y: 0 }); // finger position inside the card
  const didDragRef = useRef(false); // true when a touch-drag actually moved; suppresses onClick

  // ── plain helpers ─────────────────────────────────────────────────────────

  const selectBank = (bank, i) => {
    // Suppress click that fires right after a touch-drag ends
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setActiveIdx(i);
    fetchFilteredExpensesList(bank);
    onClose?.();
  };

  const delBank = (e, id) => {
    e.stopPropagation();
    if (confirm("Delete this account?")) deleteBank(id);
  };

  /** Return the card index whose bounding rect contains the point (cx, cy). */
  const cardIndexAtPoint = (cx, cy) => {
    if (!listRef.current) return null;
    const cards = listRef.current.querySelectorAll(".account-card");
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      if (cy >= r.top && cy <= r.bottom) return i;
    }
    return null;
  };

  /** Apply the reorder to the store and keep activeIdx consistent. */
  const commitReorder = (srcIdx, dropIdx) => {
    if (srcIdx === null || srcIdx === dropIdx) return;
    const newOrder = [...banksList];
    const [moved] = newOrder.splice(srcIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    reorderBanks(newOrder.map((b) => b.bankId));
    setActiveIdx((prev) => {
      if (prev === srcIdx) return dropIdx;
      if (srcIdx < dropIdx) {
        if (prev > srcIdx && prev <= dropIdx) return prev - 1;
      } else {
        if (prev >= dropIdx && prev < srcIdx) return prev + 1;
      }
      return prev;
    });
  };

  const removeGhost = () => {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
  };

  const resetDragState = () => {
    removeGhost();
    setDragOverIdx(null);
    setIsDragging(false);
    dragSrcIdx.current = null;
  };

  // ── mouse / desktop drag handlers ─────────────────────────────────────────

  const handleDragStart = (e, i) => {
    dragSrcIdx.current = i;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(i));
  };

  const handleDragOver = (e, i) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(i);
  };

  const handleDragLeave = (_e, i) => {
    if (dragOverIdx === i) setDragOverIdx(null);
  };

  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    const src = dragSrcIdx.current;
    setDragOverIdx(null);
    commitReorder(src, dropIdx);
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  // ── touch / mobile drag handlers ──────────────────────────────────────────

  const handleTouchStart = (e, i) => {
    const touch = e.touches[0];
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();

    touchOffset.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };

    dragSrcIdx.current = i;
    didDragRef.current = false;
    setIsDragging(true);

    // Create a floating ghost clone that follows the finger
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
      top: ${rect.top}px;
      margin: 0;
      transition: none;
      background: var(--ink-3);
      border: 1px solid var(--acid);
    `;
    document.body.appendChild(clone);
    ghostRef.current = clone;
  };

  const handleTouchMove = (e) => {
    if (dragSrcIdx.current === null) return;
    // Mark that a real drag happened so the subsequent onClick is ignored
    didDragRef.current = true;

    const touch = e.touches[0];

    // Reposition ghost
    if (ghostRef.current) {
      ghostRef.current.style.left = `${touch.clientX - touchOffset.current.x}px`;
      ghostRef.current.style.top = `${touch.clientY - touchOffset.current.y}px`;
    }

    // Highlight the card currently under the finger
    const idx = cardIndexAtPoint(touch.clientX, touch.clientY);
    setDragOverIdx(idx !== null && idx !== dragSrcIdx.current ? idx : null);
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const src = dragSrcIdx.current;
    const drop = cardIndexAtPoint(touch.clientX, touch.clientY);

    resetDragState();

    if (didDragRef.current && drop !== null) {
      commitReorder(src, drop);
    }
  };

  // Register touchmove as { passive: false } on the list container so we can
  // call e.preventDefault() to block the page from scrolling while dragging.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onTouchMove = (e) => {
      if (dragSrcIdx.current !== null) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop for mobile/tablet */}
      <div
        className={`sidebar-backdrop${open ? " open" : ""}`}
        onClick={onClose}
      />

      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="sidebar-section">
          <div style={{ height: 16 }} />
          <div className="sidebar-section-label">Accounts</div>

          {/* listRef wrapper lets cardIndexAtPoint query .account-card children */}
          <div ref={listRef}>
            {banksList.map((bank, i) => {
              const active = activeIdx === i;
              const color = COLORS[i % COLORS.length];
              const isDragOver = dragOverIdx === i && dragSrcIdx.current !== i;
              const isBeingDragged = isDragging && dragSrcIdx.current === i;

              return (
                <div
                  key={bank.bankId}
                  className={[
                    "account-card",
                    active ? "active" : "",
                    isDragOver ? "account-card--drag-over" : "",
                    isBeingDragged ? "account-card--dragging" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  // mouse drag
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragLeave={(e) => handleDragLeave(e, i)}
                  onDrop={(e) => handleDrop(e, i)}
                  onDragEnd={handleDragEnd}
                  // touch drag
                  onTouchStart={(e) => handleTouchStart(e, i)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  // click (suppressed after a touch-drag)
                  onClick={() => selectBank(bank, i)}
                >
                  <span className="drag-handle">⠿</span>
                  {active && <div className="account-card-indicator" />}
                  <div
                    className="account-initial"
                    style={
                      active
                        ? {
                            background: `${color}15`,
                            borderColor: `${color}35`,
                            color,
                          }
                        : {}
                    }
                  >
                    {bank.bankName.charAt(0)}
                  </div>
                  <div className="account-info">
                    <div className="account-name">{bank.bankName}</div>
                    <div className="account-bal">
                      ₹{fmtNum(bank.remainingBalance, privacyMode)}
                    </div>
                  </div>
                  <button
                    className="account-del-btn"
                    onClick={(e) => delBank(e, bank.bankId)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <button
            className="add-account-btn"
            onClick={() => {
              setCreateBankDialogVisible(true);
              onClose?.();
            }}
          >
            ＋ New Account
          </button>
        </div>

        {/* Mobile-only controls row — shown only when sidebar is a drawer */}
        <div className="sidebar-mobile-controls">
          <button
            className="sidebar-ctrl-btn"
            onClick={() => updateUserPreferences({ is_dark_mode: !isDarkMode })}
            title={isDarkMode ? "Light mode" : "Dark mode"}
          >
            {isDarkMode ? "☀" : "◑"}
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <button
            className="sidebar-ctrl-btn"
            onClick={() =>
              updateUserPreferences({ privacy_mode_enabled: !privacyMode })
            }
            title={privacyMode ? "Show amounts" : "Hide amounts"}
          >
            {privacyMode ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{privacyMode ? "Show Amounts" : "Hide Amounts"}</span>
          </button>
          <button
            className="sidebar-ctrl-btn sidebar-ctrl-btn--danger"
            onClick={logoutUser}
            title="Logout"
          >
            ⏻<span>Logout</span>
          </button>
        </div>
        <div style={{ marginTop: 10 }} />
        <div className="sidebar-footer">
          SMM v2.0 · {new Date().toLocaleDateString("en-IN")}
        </div>
      </aside>
    </>
  );
}
