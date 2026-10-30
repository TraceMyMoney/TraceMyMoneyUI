import React from "react";
import { useStore, fmtNum } from "../store/useStore.js";
import { Eye, EyeOff, MessageCircle, ShieldCheck, LogOut } from "lucide-react";

export default function Topbar({ onMenuClick, onOpenChat, onOpenAdmin }) {
  const {
    userName,
    isDarkMode,
    privacyMode,
    chatbotEnabled,
    isAdmin,
    updateUserPreferences,
    logoutUser,
  } = useStore();

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
              admin has turned the AI chatbot on app-wide. */}
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

          {/* Dark mode — hidden on mobile, lives in sidebar */}
          <button
            className="icon-btn topbar-desktop-only"
            onClick={() => updateUserPreferences({ is_dark_mode: !isDarkMode })}
            title={isDarkMode ? "Light mode" : "Dark mode"}
          >
            {isDarkMode ? "☀" : "◑"}
          </button>

          {/* Privacy — hidden on mobile, lives in sidebar */}
          <button
            className="icon-btn topbar-desktop-only"
            onClick={() =>
              updateUserPreferences({ privacy_mode_enabled: !privacyMode })
            }
            title={privacyMode ? "Show amounts" : "Hide amounts"}
          >
            {privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>

          {/* Admin dashboard — admin-only, lists every user and lets the
              admin grant/revoke their AI chatbot access individually.
              Hidden on mobile, lives in sidebar, same as the rest. */}
          {isAdmin && (
            <button
              className="icon-btn topbar-desktop-only"
              onClick={() => onOpenAdmin?.()}
              title="Admin dashboard"
            >
              <ShieldCheck size={18} />
            </button>
          )}

          {/* User chip — hidden on small mobile */}
          <div className="topbar-user-chip">
            <div className="topbar-user-av">
              {(userName || "U").charAt(0).toUpperCase()}
            </div>
            <span className="topbar-user-name">{userName}</span>
          </div>

          {/* Logout — hidden on mobile, lives in sidebar */}
          <button
            className="icon-btn danger topbar-desktop-only"
            onClick={logoutUser}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
