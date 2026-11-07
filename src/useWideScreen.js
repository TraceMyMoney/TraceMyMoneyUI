import { useEffect, useState } from "react";

// Split view (list + charts side by side) needs this much room.
export const WIDE_QUERY = "(min-width: 1281px)";
// Tablets (iPad etc.) get the charts in a popup instead.
export const TABLET_QUERY = "(min-width: 768px) and (max-width: 1280px)";

export function useMedia(query) {
  const get = () => typeof window !== "undefined" && window.matchMedia(query).matches;
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

// Phones. Everything phone-specific (extra components, restyled cards) is
// gated on this so tablet and desktop render exactly as before.
export const PHONE_QUERY = "(max-width: 600px)";
export const usePhoneScreen = () => useMedia(PHONE_QUERY);

export const useTabletScreen = () => useMedia(TABLET_QUERY);
export default function useWideScreen() {
  return useMedia(WIDE_QUERY);
}
