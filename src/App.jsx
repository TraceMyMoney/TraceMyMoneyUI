import React, { useEffect } from 'react'
import { useStore } from './store/useStore.js'
import Dashboard from './components/Dashboard.jsx'
import Login from './components/Login.jsx'
import Register from './components/Register.jsx'
import LandingPage from './components/LandingPage.jsx'
import Loader from './components/Loader.jsx'
import AlertToast from './components/AlertToast.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'

export default function App() {
  const {
    isLoggedIn,
    showLoginPage,
    showLanding,
    isDarkMode,
    getInitialData,
    setLoginPageStatus,
    setShowLanding,
  } = useStore()

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
      <ConfirmDialog />
      {isLoggedIn ? (
        <Dashboard />
      ) : showLanding ? (
        <LandingPage
          onGetStarted={() => {
            setLoginPageStatus(false)
            setShowLanding(false)
          }}
          onSignIn={() => {
            setLoginPageStatus(true)
            setShowLanding(false)
          }}
        />
      ) : showLoginPage ? (
        <Login />
      ) : (
        <Register />
      )}
    </>
  )
}
