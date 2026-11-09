import React, { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, MailCheck, CircleCheck, CircleAlert } from 'lucide-react'
import { useStore } from '../store/useStore.js'

/**
 * Screens that belong to the email flows, in the same look as Login/Register:
 *  - VerifyNotice        after signup: "check your email" (+ resend)
 *  - VerifyEmailPage     /verify-email?token=...   (link in the confirm email)
 *  - ForgotPasswordPage  /forgot-password
 *  - ResetPasswordPage   /reset-password?token=... (link in the reset email)
 * There is no router: App.jsx picks these by pathname.
 */

// Back to the sign-in form (not the landing page): drop the /verify-email-style
// path and switch the in-memory view; there is no router to do it for us.
function useGoLogin() {
  const { setShowLanding, setLoginPageStatus } = useStore()
  return () => {
    window.history.pushState({}, '', '/')
    setLoginPageStatus(true)
    setShowLanding(false)
    useStore.setState({}) // make App re-read the path even if both flags were already set
  }
}

function Shell({ children }) {
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
        </div>
        {children}
      </div>
    </div>
  )
}

function Status({ icon, title, text, children }) {
  return (
    <div className="auth-fields auth-status">
      <div className="auth-status-icon">{icon}</div>
      <div className="auth-heading auth-status-title">{title}</div>
      {text && <div className="auth-sub">{text}</div>}
      {children}
    </div>
  )
}

export function VerifyNotice() {
  const { verifyNotice, setVerifyNotice, setLoginPageStatus, resendVerification } = useStore()
  const email = verifyNotice?.email
  return (
    <Shell>
      <Status
        icon={<MailCheck size={34} />}
        title="Check your email."
        text={<>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account. It can take a minute to arrive; check spam too.</>}
      >
        <button type="button" className="auth-note-btn" onClick={() => resendVerification(email)}>Resend the email</button>
        <button
          className="auth-submit"
          onClick={() => { setVerifyNotice(null); setLoginPageStatus(true) }}
        >
          Back to Sign In <div className="auth-submit-arrow">→</div>
        </button>
      </Status>
    </Shell>
  )
}

export function VerifyEmailPage() {
  const { verifyEmailToken } = useStore()
  const goLogin = useGoLogin()
  const [state, setState] = useState('working') // working | ok | bad
  const ran = useRef(false) // React StrictMode runs effects twice in dev; the link works once
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const token = new URLSearchParams(window.location.search).get('token') || ''
    if (!token) { setState('bad'); return }
    verifyEmailToken(token).then(ok => setState(ok ? 'ok' : 'bad'))
  }, [])
  return (
    <Shell>
      {state === 'working' && <Status icon={<MailCheck size={34} />} title="Confirming…" />}
      {state === 'ok' && (
        <Status icon={<CircleCheck size={34} />} title="Email confirmed." text="Your account is active. You can sign in now.">
          <button className="auth-submit" onClick={goLogin}>Sign In <div className="auth-submit-arrow">→</div></button>
        </Status>
      )}
      {state === 'bad' && (
        <Status icon={<CircleAlert size={34} />} title="Link not valid." text="This confirmation link is invalid or has expired. Sign in and ask for a new one.">
          <button className="auth-submit" onClick={goLogin}>Go to Sign In <div className="auth-submit-arrow">→</div></button>
        </Status>
      )}
    </Shell>
  )
}

export function ForgotPasswordPage() {
  const { forgotPassword } = useStore()
  const goLogin = useGoLogin()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const submit = async () => { if (email && (await forgotPassword(email))) setSent(true) }
  if (sent) {
    return (
      <Shell>
        <Status
          icon={<MailCheck size={34} />}
          title="Check your email."
          text="If that email is registered, a reset link is on its way. It works for one hour."
        >
          <button className="auth-submit" onClick={goLogin}>Back to Sign In <div className="auth-submit-arrow">→</div></button>
        </Status>
      </Shell>
    )
  }
  return (
    <Shell>
      <div className="auth-top">
        <div className="auth-heading">Forgot<span className="auth-heading-accent">?</span></div>
        <div className="auth-sub">Enter your email and we'll send you a link to set a new password.</div>
      </div>
      <div className="auth-fields">
        <div>
          <label className="auth-field-label">Email</label>
          <div className="auth-input-wrap">
            <div className="auth-input-icon">✉</div>
            <input className="auth-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} autoComplete="email" autoCapitalize="none" spellCheck={false} inputMode="email" enterKeyHint="go" />
          </div>
        </div>
        <button className="auth-submit" disabled={!email} onClick={submit}>Send reset link <div className="auth-submit-arrow">→</div></button>
      </div>
      <div className="auth-bottom">
        <div className="auth-switch"><span className="auth-switch-link" onClick={goLogin}>← Back to Sign In</span></div>
      </div>
    </Shell>
  )
}

export function ResetPasswordPage() {
  const { resetPassword } = useStore()
  const goLogin = useGoLogin()
  const token = new URLSearchParams(window.location.search).get('token') || ''
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [done, setDone] = useState(false)
  const mismatch = confirm && pw !== confirm
  const ok = pw.length >= 8 && pw === confirm
  const submit = async () => { if (ok && (await resetPassword(token, pw))) setDone(true) }

  if (!token) {
    return (
      <Shell>
        <Status icon={<CircleAlert size={34} />} title="Link not valid." text="This reset link is incomplete. Ask for a new one.">
          <button className="auth-submit" onClick={() => window.location.assign('/forgot-password')}>Get a new link <div className="auth-submit-arrow">→</div></button>
        </Status>
      </Shell>
    )
  }
  if (done) {
    return (
      <Shell>
        <Status icon={<CircleCheck size={34} />} title="Password updated." text="You can sign in with your new password.">
          <button className="auth-submit" onClick={goLogin}>Sign In <div className="auth-submit-arrow">→</div></button>
        </Status>
      </Shell>
    )
  }
  return (
    <Shell>
      <div className="auth-top">
        <div className="auth-heading">New<span className="auth-heading-accent">Password.</span></div>
        <div className="auth-sub">Choose a password with at least 8 characters.</div>
      </div>
      <div className="auth-fields">
        <div>
          <label className="auth-field-label">New password</label>
          <div className="auth-input-wrap">
            <div className="auth-input-icon">🔒</div>
            <input className="auth-input" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" enterKeyHint="next" />
            <button type="button" className="auth-toggle" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw(v => !v)}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
          </div>
        </div>
        <div>
          <label className="auth-field-label">Confirm password</label>
          <div className={`auth-input-wrap${mismatch ? ' error' : ''}`}>
            <div className="auth-input-icon">✓</div>
            <input className="auth-input" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} autoComplete="new-password" enterKeyHint="go" />
          </div>
          {mismatch && <div className="auth-error-msg">Passwords don't match</div>}
        </div>
        <button className="auth-submit" disabled={!ok} onClick={submit}>Update password <div className="auth-submit-arrow">→</div></button>
      </div>
    </Shell>
  )
}
