import React, { useState } from "react";
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
  } = useStore();
  const [activeIdx, setActiveIdx] = useState(0);

  const selectBank = (bank, i) => {
    setActiveIdx(i);
    fetchFilteredExpensesList(bank);
    onClose?.();
  };
  const delBank = (e, id) => {
    e.stopPropagation();
    if (confirm("Delete this account?")) deleteBank(id);
  };

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

          {banksList.map((bank, i) => {
            const active = activeIdx === i;
            const color = COLORS[i % COLORS.length];
            return (
              <div
                key={bank.bankId}
                className={`account-card${active ? " active" : ""}`}
                onClick={() => selectBank(bank, i)}
              >
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
        <br />
        <div className="sidebar-footer">
          SMM v2.0 · {new Date().toLocaleDateString("en-IN")}
        </div>
      </aside>
    </>
  );
}
