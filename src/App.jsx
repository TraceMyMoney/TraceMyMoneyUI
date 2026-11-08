import React, { useEffect } from 'react'
import { useStore } from './store/useStore.js'
import Dashboard from './components/Dashboard.jsx'
import Login from './components/Login.jsx'
import Register from './components/Register.jsx'
import LandingPage from './components/LandingPage.jsx'
import Loader from './components/Loader.jsx'
import AlertToast from './components/AlertToast.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import OAuthAuthorize from './components/OAuthAuthorize.jsx'

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

  // Claude's connector sends the browser to /oauth/authorize. There is no
  // router, so recognise the path: sign in first if needed (the URL stays put),
  // then show the approval page.
  const isOAuthAuthorize = window.location.pathname.startsWith('/oauth/authorize')

  return (
    <>
      <Loader />
      <AlertToast />
      <ConfirmDialog />
      {isOAuthAuthorize ? (
        isLoggedIn ? <OAuthAuthorize /> : showLoginPage ? <Login /> : <Register />
      ) : isLoggedIn ? (
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
