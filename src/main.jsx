import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initAxiosToken, useStore } from './store/useStore.js'

// Restore axios token on boot synchronously
const parsed = initAxiosToken()
if (parsed) {
  const store = useStore.getState()
  store.setUserName(parsed.user_name)
  store.setLoggedInStatus(true)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
