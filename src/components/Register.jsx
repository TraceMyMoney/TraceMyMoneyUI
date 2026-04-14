import React, { useState } from 'react'
import { useStore } from '../store/useStore.js'
export default function Register() {
  const { registerUser, setLoginPageStatus } = useStore()
  const [form, setForm] = useState({ username:'', email:'', password:'', confirm:'' })
  const [showPw, setShowPw] = useState(false)
  const up = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const mismatch = form.confirm && form.password !== form.confirm
  const ok = form.username && form.email && form.password && form.password === form.confirm
  const submit = () => { if (ok) registerUser({ username: form.username, email: form.email, password: form.password }) }
  return (
    <div className="auth-shell">
      <div className="auth-grid-bg" />
      <div className="auth-glow" style={{ background: 'radial-gradient(circle, rgba(77,170,255,0.05) 0%, transparent 70%)' }} />
      <div className="auth-panel" style={{ borderColor: 'rgba(77,170,255,0.15)' }}>
        <div className="auth-scanlines" />
        <div className="auth-top">
          <div className="auth-logo-row">
            <div className="auth-logo-hex" style={{ background: 'var(--blue)' }}>₹</div>
            <div className="auth-logo-name">Stalk<span>My</span>Money</div>
          </div>
          <div className="auth-heading" style={{ color: 'var(--blue)' }}>Get Started.</div>
          <div className="auth-sub">Create your account and start tracking every rupee.</div>
        </div>
        <div className="auth-fields">
          {[
            { k:'username', icon:'@', ph:'choose_username', label:'Username', type:'text' },
            { k:'email', icon:'✉', ph:'you@example.com', label:'Email', type:'email' },
          ].map(f => (
            <div key={f.k}>
              <label className="auth-field-label">{f.label}</label>
              <div className="auth-input-wrap">
                <div className="auth-input-icon">{f.icon}</div>
                <input className="auth-input" type={f.type} placeholder={f.ph} value={form[f.k]} onChange={up(f.k)} />
              </div>
            </div>
          ))}
          <div>
            <label className="auth-field-label">Password</label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">🔒</div>
              <input className="auth-input" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={up('password')} />
              <button className="auth-toggle" onClick={() => setShowPw(v => !v)}>{showPw ? '🙈' : '👁'}</button>
            </div>
          </div>
          <div>
            <label className="auth-field-label">Confirm Password</label>
            <div className={`auth-input-wrap${mismatch ? ' error' : ''}`}>
              <div className="auth-input-icon">✓</div>
              <input className="auth-input" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.confirm} onChange={up('confirm')} onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
            {mismatch && <div className="auth-error-msg">Passwords don't match</div>}
          </div>
          <button className="auth-submit blue" disabled={!ok} onClick={submit}>
            Create Account <div className="auth-submit-arrow">→</div>
          </button>
        </div>
        <div className="auth-bottom">
          <div className="auth-switch">Already have an account?{' '}<span className="auth-switch-link" onClick={() => setLoginPageStatus(true)}>Sign in →</span></div>
        </div>
      </div>
    </div>
  )
}
