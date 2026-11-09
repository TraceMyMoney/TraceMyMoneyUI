import React, { useState } from 'react'
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useStore } from '../store/useStore.js'
import VantaBirds from './VantaBirds.jsx'
import { usePhoneScreen } from '../useWideScreen.js'

export default function Login() {
  const { loginUser, setLoginPageStatus, setShowLanding, needsEmailVerification, resendVerification } = useStore()
  const [resendEmail, setResendEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const phone = usePhoneScreen() // no autofocus on phones: it pops the keyboard before the screen is even seen
  const submit = () => { if (username && password) loginUser({ username, password }) }
  return (
    <div className="auth-shell">
      <div className="auth-grid-bg" />
      <div className="auth-glow" />
      <VantaBirds />
      <div className="auth-panel">
        <div className="auth-scanlines" />
        <div className="auth-top">
          <button type="button" className="auth-back" onClick={() => setShowLanding(true)}>
            <ArrowLeft size={14} /> Back
          </button>
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
              <input className="auth-input" placeholder="your_username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} autoFocus={!phone} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" />
            </div>
          </div>
          <div>
            <label className="auth-field-label">Password</label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">🔒</div>
              <input className="auth-input" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} autoComplete="current-password" enterKeyHint="go" />
              <button type="button" className="auth-toggle" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw(v => !v)}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
          </div>
          <div className="auth-forgot-row">
            <a className="auth-switch-link" href="/forgot-password">Forgot password?</a>
          </div>
          {needsEmailVerification && (
            <div className="auth-note">
              <div className="auth-note-title">Confirm your email first</div>
              <div className="auth-note-text">We sent you a link when you signed up. Lost it? Enter your email and we'll send a new one.</div>
              <div className="auth-input-wrap">
                <div className="auth-input-icon">✉</div>
                <input className="auth-input" type="email" placeholder="you@example.com" value={resendEmail} onChange={e => setResendEmail(e.target.value)} autoComplete="email" autoCapitalize="none" spellCheck={false} inputMode="email" />
              </div>
              <button type="button" className="auth-note-btn" disabled={!resendEmail} onClick={() => resendVerification(resendEmail)}>Resend confirmation email</button>
            </div>
          )}
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
