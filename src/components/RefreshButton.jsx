import React from "react";
import { RefreshCw } from "lucide-react";
import { useStore } from "../store/useStore.js";

/** Small round button that reloads data; the icon spins while it loads. */
export default function RefreshButton({ onClick, className = "", label = "Refresh" }) {
  const refreshing = useStore((s) => s.refreshing);
  return (
    <button
      type="button"
      className={`refresh-btn${refreshing ? " is-spinning" : ""} ${className}`}
      onClick={onClick}
      disabled={refreshing}
      aria-label={label}
      title={label}
    >
      <RefreshCw size={16} aria-hidden="true" />
    </button>
  );
}
