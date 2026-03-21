import React from 'react'
import { useStore, fmtNum } from '../store/useStore.js'
import { Eye, EyeOff } from 'lucide-react'

export default function Topbar({ onMenuClick }) {
  const { userName, isDarkMode, privacyMode, currentTotalOfTopupExpenses, currentTotalOfExpenses, currentTotalExpenses, updateUserPreferences, logoutUser } = useStore()

  return (
    <header className="topbar">
      <div className="topbar-glow" />

      <button className="topbar-menu-btn icon-btn" onClick={onMenuClick} aria-label="Menu">☰</button>

      <div className="my__flex">
        <div className="topbar-logo" onClick={() => window.location.reload()} style={{ marginLeft: 8, marginRight: 0 }}>
          <div className="topbar-logo-hex">₹</div>
          <div className="topbar-logo-text">Trace<span>My</span>Money</div>
        </div>

        <div className="topbar-controls">
          <button className="icon-btn keep-mobile" onClick={() => updateUserPreferences({ is_dark_mode: !isDarkMode })} title={isDarkMode ? 'Light mode' : 'Dark mode'}>
            {isDarkMode ? '☀' : '◑'}
          </button>
          <button className="icon-btn keep-mobile" onClick={() => updateUserPreferences({ privacy_mode_enabled: !privacyMode })} title={privacyMode ? 'Show amounts' : 'Hide amounts'}>
            {privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <div className="topbar-user-chip">
            <div className="topbar-user-av">{(userName || 'U').charAt(0).toUpperCase()}</div>
            <span className="topbar-user-name">{userName}</span>
          </div>
          <button className="icon-btn danger keep-mobile" onClick={logoutUser} title="Logout">⏻</button>
        </div>
      </div>
    </header>
  )
}
