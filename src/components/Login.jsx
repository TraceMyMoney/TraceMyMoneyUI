import React, { useState } from 'react'
import { useStore } from '../store/useStore.js'

export default function Login() {
  const { loginUser, setLoginPageStatus } = useStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const submit = () => { if (username && password) loginUser({ username, password }) }
  return (
    <div className="auth-shell">
      <div className="auth-grid-bg" />
      <div className="auth-glow" />
      <div className="auth-panel">
        <div className="auth-scanlines" />
        <div className="auth-top">
          <div className="auth-logo-row">
            <div className="auth-logo-hex">₹</div>
            <div className="auth-logo-name">Stalk<span>My</span>Money</div>
          </div>
          <div className="auth-heading">Sign<span className="auth-heading-accent">In.</span></div>
          <div className="auth-sub">Track every rupee. Know where it all goes.</div>
        </div>
        <div className="auth-fields">
          <div>
            <label className="auth-field-label">Username</label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">@</div>
              <input className="auth-input" placeholder="your_username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
            </div>
          </div>
          <div>
            <label className="auth-field-label">Password</label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">🔒</div>
              <input className="auth-input" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
              <button className="auth-toggle" onClick={() => setShowPw(v => !v)}>{showPw ? '🙈' : '👁'}</button>
            </div>
          </div>
          <button className="auth-submit" disabled={!username || !password} onClick={submit}>
            Sign In <div className="auth-submit-arrow">→</div>
          </button>
        </div>
        <div className="auth-bottom">
          <div className="auth-switch">No account?{' '}<span className="auth-switch-link" onClick={() => setLoginPageStatus(false)}>Create one →</span></div>
        </div>
      </div>
    </div>
  )
}
