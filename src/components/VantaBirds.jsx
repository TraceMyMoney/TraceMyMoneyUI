import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import BIRDS from "vanta/dist/vanta.birds.min";
import { useStore } from "../store/useStore.js";

// Flock of birds behind the login / register screens (same effect as the
// landing page). Skipped for reduced-motion users and when WebGL is missing.
export default function VantaBirds() {
  const { isDarkMode } = useStore();
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    let effect;
    try {
      effect = BIRDS({
        el,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1,
        scaleMobile: 1,
        backgroundAlpha: 0,
        color1: isDarkMode ? 0xb8ff00 : 0x6b8f00,
        color2: isDarkMode ? 0x9b7fff : 0x7a5af5,
        colorMode: "variance",
        quantity: window.innerWidth < 600 ? 3 : 4,
        birdSize: 1,
        wingSpan: 26,
        speedLimit: 4,
        separation: 20,
        alignment: 20,
        cohesion: 20,
      });
    } catch {
      /* no WebGL: keep the plain background */
    }
    return () => effect?.destroy();
  }, [isDarkMode]);
  return <div className="auth-birds" ref={ref} aria-hidden="true" />;
}
