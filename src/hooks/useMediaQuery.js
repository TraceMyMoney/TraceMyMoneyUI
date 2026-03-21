import { useState, useEffect } from 'react'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = e => setMatches(e.matches)
    mq.addEventListener('change', handler)
    setMatches(mq.matches)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}

export const useIsMobile  = () => useMediaQuery('(max-width: 600px)')
export const useIsTablet  = () => useMediaQuery('(max-width: 860px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 861px)')
