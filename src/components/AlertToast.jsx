import React from 'react'
import { useStore } from '../store/useStore.js'
export default function AlertToast() {
  const { showAlert, alertMessages, setShowAlert, setAlertMessages } = useStore()
  if (!showAlert || !alertMessages.length) return null
  const clear = () => { setShowAlert(false); setAlertMessages([]) }
  return (
    <div className="alert-container">
      {alertMessages.map((msg, i) => (
        <div key={i} className="alert-toast">
          <div className="alert-icon">⚠</div>
          <span className="alert-msg">{msg}</span>
          <button className="alert-close" onClick={clear}>×</button>
        </div>
      ))}
    </div>
  )
}
