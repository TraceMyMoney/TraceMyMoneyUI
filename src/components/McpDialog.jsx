import React, { useEffect, useState } from "react";
import { Check, Copy, Plug, X } from "lucide-react";
import { API_BASE_URL } from "../store/useStore.js";

const MCP_URL = `${API_BASE_URL}/mcp`;

// Opened from the profile dropdown: the connector address with a copy
// button, and how to add it in claude.ai.
export default function McpDialog({ open, onClose }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

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
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-panel mcp-dialog"
        role="dialog"
        aria-label="Use StalkMyMoney from Claude"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header">
          <div className="dialog-icon">
            <Plug size={18} />
          </div>
          <div>
            <div className="dialog-title">Claude connector (MCP)</div>
            <div className="dialog-sub">Use StalkMyMoney from Claude</div>
          </div>
          <button type="button" className="mcp-box-btn mcp-dialog-close" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="mcp-dialog-body">
          <div className="mcp-dialog-url">
            <code>{MCP_URL}</code>
            <button type="button" className="mcp-box-btn" aria-label="Copy MCP address" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <ol>
            <li>In claude.ai open Settings, then Connectors, then Add custom connector.</li>
            <li>Paste the address above and sign in when asked.</li>
            <li>Approve access. Then ask Claude about your money.</li>
          </ol>
          <span>You can disconnect any time from Profile, Connected apps.</span>
        </div>
      </div>
    </div>
  );
}
