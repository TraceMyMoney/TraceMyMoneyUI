import React, { useEffect, useRef } from "react";
import { useStore } from "../store/useStore.js";

export default function ConfirmDialog() {
  const { confirmState, resolveConfirm } = useStore();
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const open = !!confirmState;

  // Left / Right move the selection (focus) between Cancel and the Delete button.
  // On the document, so it still works if focus was knocked off a button by a click.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      e.stopPropagation();
      (e.key === "ArrowLeft" ? cancelRef : confirmRef).current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!confirmState) return null;

  return (
    <div className="dialog-overlay" onClick={() => resolveConfirm(false)}>
      <div
        className="dialog-panel"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="dialog-header">
          <div className="dialog-icon danger">⚠</div>
          <div>
            <div id="confirm-dialog-title" className="dialog-title">
              Are you sure?
            </div>
            <div className="dialog-sub">{confirmState.message}</div>
          </div>
        </div>
        <div className="dialog-footer">
          <button ref={cancelRef} className="d-btn-cancel" onClick={() => resolveConfirm(false)}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            className="d-btn-danger"
            onClick={() => resolveConfirm(true)}
            autoFocus
          >
            {confirmState.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
