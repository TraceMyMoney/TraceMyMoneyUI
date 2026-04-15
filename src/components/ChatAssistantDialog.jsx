import React, { useState, useEffect, useRef, Fragment } from "react";
import axios from "axios";
import { useStore } from "../store/useStore.js";

const pushChatAlert = (msg) => useStore.getState().pushAlert(msg);

const BASE_URL = (
  import.meta.env.VITE_TM_BACKEND_URL || "https://api.stalk-my-money.in/"
).replace(/\/?$/, "");
const CHAT_URL = `${BASE_URL}/user/chat`;

/** Only show buffering UI after this delay so fast replies do not flicker. */
const BUFFERING_SHOW_MS = 380;

function extractChatReply(data) {
  if (data == null) return "";
  if (typeof data === "string") return data;
  const v =
    data.answer ??
    data.reply ??
    data.response ??
    data.message ??
    (typeof data.data === "string"
      ? data.data
      : (data.data?.answer ?? data.data?.reply ?? data.data?.message));
  if (typeof v === "string") return v;
  if (v != null && typeof v === "object") return JSON.stringify(v);
  try {
    return JSON.stringify(data);
  } catch {
    return "No reply";
  }
}

/**
 * Renders a markdown-like text string into React elements.
 * Supports:
 *   - **bold** → <strong>
 *   - bullet lines starting with "- " → <ul><li> list
 *   - newlines → line breaks (or list grouping)
 */
function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let listItems = [];
  let keyCounter = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul
          key={`ul-${keyCounter++}`}
          style={{ margin: "4px 0 4px 16px", padding: 0 }}
        >
          {listItems}
        </ul>,
      );
      listItems = [];
    }
  };

  const parseBold = (str, baseKey) => {
    // First, normalize **text** markers and currency+amount patterns into a
    // single token stream using a combined regex.
    // Group 1: **bold**  |  Group 2: currency symbol + optional space + optional sign + number
    const tokenRegex =
      /\*\*(.+?)\*\*|([\u20B9$€£¥₩₺₴₦₨\u00A3\u00A5]+\s*[-\u2011\u2012\u2013\u2014+]?\s*[\d,]+(?:\.\d+)?)/g;
    const result = [];
    let last = 0;
    let match;
    let idx = 0;
    while ((match = tokenRegex.exec(str)) !== null) {
      if (match.index > last) {
        result.push(str.slice(last, match.index));
      }
      const content = match[1] ?? match[2];
      result.push(<strong key={`${baseKey}-b${idx++}`}>{content}</strong>);
      last = match.index + match[0].length;
    }
    if (last < str.length) {
      result.push(str.slice(last));
    }
    return result;
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const content = trimmed.slice(2);
      listItems.push(
        <li key={`li-${keyCounter++}`}>
          {parseBold(content, `li-${lineIdx}`)}
        </li>,
      );
    } else {
      flushList();
      if (line === "") {
        elements.push(<br key={`br-${keyCounter++}`} />);
      } else {
        elements.push(
          <span key={`line-${keyCounter++}`}>
            {parseBold(line, `line-${lineIdx}`)}
            {"\n"}
          </span>,
        );
      }
    }
  });

  flushList();
  return elements;
}

async function postChatQuestion(question) {
  const r = await axios.post(CHAT_URL, { question });
  return extractChatReply(r.data);
}

export default function ChatAssistantDialog({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [bufferingVisible, setBufferingVisible] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!sending) {
      setBufferingVisible(false);
      return;
    }
    const id = window.setTimeout(
      () => setBufferingVisible(true),
      BUFFERING_SHOW_MS,
    );
    return () => clearTimeout(id);
  }, [sending]);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
      setSending(false);
      return;
    }
    // Focus the input as soon as the dialog opens
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const name = useStore.getState().userName;
    const displayName = (name && String(name).trim()) || "there";
    setMessages([
      { role: "assistant", text: `Hello ${displayName}, how are you?` },
    ]);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages, sending, bufferingVisible]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sendUserMessage = async () => {
    const q = input.trim();
    if (!q || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setSending(true);
    try {
      const reply = await postChatQuestion(q);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Chat request failed";
      pushChatAlert(typeof msg === "string" ? msg : JSON.stringify(msg));
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Sorry, something went wrong. Try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="chat-dialog-overlay" onClick={onClose} role="presentation">
      <div
        className="chat-dialog-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="chat-dialog-title"
      >
        <div className="chat-dialog-header">
          <div className="chat-dialog-title-wrap">
            <div className="chat-dialog-icon">💬</div>
            <div>
              <div id="chat-dialog-title" className="chat-dialog-title">
                Chat
              </div>
              <div className="chat-dialog-sub">
                Ask anything about your money
              </div>
            </div>
          </div>
          <button
            type="button"
            className="dialog-close"
            onClick={onClose}
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        <div className="chat-dialog-messages" ref={listRef} aria-busy={sending}>
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble chat-bubble--${m.role}`}>
              {m.role === "assistant" ? renderMarkdown(m.text) : m.text}
            </div>
          ))}
          {sending &&
            bufferingVisible &&
            (messages.length === 0 ||
              messages[messages.length - 1].role === "user") && (
              <div
                className="chat-bubble chat-bubble--assistant chat-bubble--buffering"
                role="status"
              >
                <span className="chat-buffer-spinner" aria-hidden />
                <span className="chat-buffer-text">Getting reply…</span>
              </div>
            )}
        </div>

        <div className="chat-dialog-footer">
          <textarea
            ref={inputRef}
            className="chat-dialog-input"
            rows={2}
            placeholder="Type a message…"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendUserMessage();
              }
            }}
            disabled={sending}
          />
          <button
            type="button"
            className="chat-dialog-send"
            onClick={sendUserMessage}
            disabled={sending || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
