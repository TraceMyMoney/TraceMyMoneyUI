import React from 'react'
import { useStore } from '../store/useStore.js'
export default function Loader() {
  const showLoader = useStore(s => s.showLoader)
  if (!showLoader) return null
  return (
    <div className="loader-overlay">
      <div className="loader-wrap">
        <div className="loader-orb">
          <div className="loader-ring-1" />
          <div className="loader-ring-2" />
          <div className="loader-core"><span className="loader-symbol">₹</span></div>
        </div>
        <span className="loader-label">Loading...</span>
      </div>
    </div>
  )
}
