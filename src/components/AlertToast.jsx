import React from 'react'
import { useStore } from '../store/useStore.js'
export default function AlertToast() {
  const { showAlert, alertMessages, setShowAlert, setAlertMessages, setProfileOpen } = useStore()
  if (!showAlert || !alertMessages.length) return null
  const clear = () => { setShowAlert(false); setAlertMessages([]) }
  const dismiss = (item) => {
    const rest = alertMessages.filter((m) => m !== item)
    setAlertMessages(rest)
    if (!rest.length) setShowAlert(false)
  }
  const typeOf = (item) => (typeof item === 'string' ? 'error' : (item.type || 'error'))
  // "Info" notices (e.g. expenses waiting for review) are shown in the middle of
  // the page so they cannot be missed; errors and confirmations stay in the corner.
  const notices = alertMessages.filter((m) => typeOf(m) === 'info')
  const toasts = alertMessages.filter((m) => typeOf(m) !== 'info')
  return (
    <>
      {notices.length > 0 && (
        <div className="alert-center" role="alertdialog" aria-live="assertive" onClick={() => notices.forEach(dismiss)}>
          {notices.map((item, i) => (
            <div key={i} className="alert-center-card" onClick={(e) => e.stopPropagation()}>
              <div className="alert-center-icon">i</div>
              <p className="alert-center-msg">{item.msg}</p>
              <div className="alert-center-actions">
                {item.action && (
                  <button
                    className="alert-action alert-action--big"
                    onClick={() => {
                      if (item.action.to === 'profile') setProfileOpen(true)
                      dismiss(item)
                    }}
                  >
                    {item.action.label}
                  </button>
                )}
                <button className="alert-later" onClick={() => dismiss(item)}>Later</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {toasts.length > 0 && (
        <div className="alert-container">
          {toasts.map((item, i) => {
            const msg = typeof item === 'string' ? item : item.msg
            const type = typeOf(item)
            return (
              <div key={i} className={`alert-toast alert-toast--${type}`}>
                <div className="alert-icon">{type === 'success' ? '✓' : type === 'hint' ? 'i' : '⚠'}</div>
                <span className="alert-msg">{msg}</span>
                <button className="alert-close" onClick={clear}>×</button>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
