import React, { useEffect } from 'react'
import { useStore } from './store/useStore.js'
import Dashboard from './components/Dashboard.jsx'
import Login from './components/Login.jsx'
import Register from './components/Register.jsx'
import Loader from './components/Loader.jsx'
import AlertToast from './components/AlertToast.jsx'

export default function App() {
  const { isLoggedIn, showLoginPage, isDarkMode, getInitialData } = useStore()

  useEffect(() => {
    if (!isDarkMode) document.body.classList.add('light')
    else document.body.classList.remove('light')
  }, [isDarkMode])

  useEffect(() => {
    if (isLoggedIn) getInitialData()
  }, [isLoggedIn])

  return (
    <>
      <Loader />
      <AlertToast />
      {isLoggedIn
        ? <Dashboard />
        : showLoginPage ? <Login /> : <Register />
      }
    </>
  )
}
