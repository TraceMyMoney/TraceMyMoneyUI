import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, Info, Plug } from "lucide-react";
import { API_BASE_URL } from "../store/useStore.js";

const MCP_URL = `${API_BASE_URL}/mcp`;

// Small dashboard box: the connector address with a copy button, and an
// "i" button that explains how to add it in claude.ai.
export default function McpBox({ glory = false }) {
  const [copied, setCopied] = useState(false);
  const [help, setHelp] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!help) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setHelp(false);
    };
    const onKey = (e) => e.key === "Escape" && setHelp(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [help]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MCP_URL);
    } catch {
      /* clipboard blocked: nothing to do */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className={`mcp-box${glory ? " mcp-box--glory" : ""}`} ref={ref}>
      <Plug size={14} className="mcp-box-icon" />
      <span className="mcp-box-label">MCP</span>
      <code className="mcp-box-url">{MCP_URL}</code>
      <button type="button" className="mcp-box-btn" aria-label="Copy MCP address" onClick={copy}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <button
        type="button"
        className="mcp-box-btn"
        aria-label="How to set up MCP"
        aria-expanded={help}
        onClick={() => setHelp((v) => !v)}
      >
        <Info size={14} />
      </button>
      {help && (
        <div className="mcp-box-pop" role="dialog" aria-label="Set up MCP">
          <strong>Use StalkMyMoney from Claude</strong>
          <ol>
            <li>In claude.ai open Settings, then Connectors, then Add custom connector.</li>
            <li>Paste the address shown here and sign in when asked.</li>
            <li>Approve access. Then ask Claude about your money.</li>
          </ol>
          <span>You can disconnect any time from Profile, Connected apps.</span>
        </div>
      )}
    </div>
  );
}
