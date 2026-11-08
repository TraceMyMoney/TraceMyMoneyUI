import React from 'react'
import { useStore } from '../store/useStore.js'
export default function AlertToast() {
  const { showAlert, alertMessages, setShowAlert, setAlertMessages, setProfileOpen } = useStore()
  if (!showAlert || !alertMessages.length) return null
  const clear = () => { setShowAlert(false); setAlertMessages([]) }
  return (
    <div className="alert-container">
      {alertMessages.map((item, i) => {
        const msg = typeof item === 'string' ? item : item.msg
        const type = typeof item === 'string' ? 'error' : (item.type || 'error')
        const action = typeof item === 'string' ? null : item.action
        return (
          <div key={i} className={`alert-toast alert-toast--${type}`}>
            <div className="alert-icon">{type === 'success' ? '✓' : type === 'info' ? 'i' : '⚠'}</div>
            <span className="alert-msg">{msg}</span>
            {action && (
              <button
                className="alert-action"
                onClick={() => {
                  if (action.to === 'profile') setProfileOpen(true)
                  clear()
                }}
              >
                {action.label}
              </button>
            )}
            <button className="alert-close" onClick={clear}>×</button>
          </div>
        )
      })}
    </div>
  )
}
