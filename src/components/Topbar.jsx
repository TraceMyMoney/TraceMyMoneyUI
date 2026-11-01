import React, { useEffect, useRef, useState } from "react";
import { useStore, fmtNum } from "../store/useStore.js";
import {
  Eye,
  EyeOff,
  MessageCircle,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  BarChart3,
} from "lucide-react";

export default function Topbar({ onMenuClick, onOpenChat, onOpenAdmin }) {
  const {
    userName,
    isDarkMode,
    privacyMode,
    chatbotEnabled,
    isAdmin,
    updateUserPreferences,
    logoutUser,
    setAnalyticsOpen,
  } = useStore();
  // Dark mode / privacy / admin / logout used to each be their own icon
  // button sitting in a row next to the user chip - cramped and, per
  // feedback, ugly. Consolidated into one dropdown off the chip itself;
  // mobile is untouched (those same controls already live in the
  // sidebar there, this only reorganizes the desktop row).
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onEscape = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  return (
    <header className="topbar">
      <div className="topbar-glow" />

      <button
        className="topbar-menu-btn"
        onClick={onMenuClick}
        aria-label="Menu"
      >
        ☰
      </button>

      <div className="my__flex">
        <div
          className="topbar-logo"
          onClick={() => window.location.reload()}
          style={{ marginLeft: 8, marginRight: 0 }}
        >
          <div className="topbar-logo-hex">₹</div>
          <div className="topbar-logo-text">
            Stalk<span>My</span>Money
          </div>
        </div>

        <div className="topbar-controls">
          {/* Chat — always visible including mobile, but only when an
              admin has turned the AI chatbot on app-wide. Stays its own
              button (a primary action, not a settings toggle). */}
          {chatbotEnabled && (
            <button
              type="button"
              className="icon-btn topbar-chat-btn"
              onClick={() => onOpenChat?.()}
              title="Chat assistant"
              aria-label="Open chat assistant"
            >
              <MessageCircle size={18} />
            </button>
          )}

          <div className="topbar-user-menu topbar-desktop-only" ref={menuRef}>
            <button
              type="button"
              className={`topbar-user-chip${menuOpen ? " is-open" : ""}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <div className="topbar-user-av">
                {(userName || "U").charAt(0).toUpperCase()}
              </div>
              <span className="topbar-user-name">{userName}</span>
              <ChevronDown size={14} className="topbar-user-chevron" />
            </button>

            {menuOpen && (
              <div className="topbar-user-dropdown" role="menu">
                <button
                  type="button"
                  className="topbar-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    updateUserPreferences({ is_dark_mode: !isDarkMode });
                    setMenuOpen(false);
                  }}
                >
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                  {isDarkMode ? "Light mode" : "Dark mode"}
                </button>
                <button
                  type="button"
                  className="topbar-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    updateUserPreferences({ privacy_mode_enabled: !privacyMode });
                    setMenuOpen(false);
                  }}
                >
                  {privacyMode ? <Eye size={16} /> : <EyeOff size={16} />}
                  {privacyMode ? "Show amounts" : "Hide amounts"}
                </button>
                <button
                  type="button"
                  className="topbar-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setAnalyticsOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  <BarChart3 size={16} />
                  Analytics
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="topbar-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      onOpenAdmin?.();
                      setMenuOpen(false);
                    }}
                  >
                    <ShieldCheck size={16} />
                    Admin dashboard
                  </button>
                )}
                <div className="topbar-dropdown-divider" />
                <button
                  type="button"
                  className="topbar-dropdown-item topbar-dropdown-item--danger"
                  role="menuitem"
                  onClick={logoutUser}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
