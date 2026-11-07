import React from "react";
import { useStore } from "../store/useStore.js";

export default function ConfirmDialog() {
  const { confirmState, resolveConfirm } = useStore();
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
          <button className="d-btn-cancel" onClick={() => resolveConfirm(false)}>
            Cancel
          </button>
          <button
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
