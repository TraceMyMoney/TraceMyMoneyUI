import React, { useState, useEffect, useRef, Fragment } from "react";
import axios from "axios";
import { Send, Copy, Check, X, AlertTriangle, Mic, Download, Square } from "lucide-react";
import { useStore } from "../store/useStore.js";

// Web Speech API - only Chrome/Edge/Safari ship this, and only under the
// vendor-prefixed name, so neither exists in Firefox at all. Resolved once
// at module load; the mic button below hides itself entirely when both are
// undefined rather than rendering something that can never work.
const SpeechRecognitionCtor =
  (typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)) ||
  null;

const pushChatAlert = (msg) => useStore.getState().pushAlert(msg);

// Same dynamic dev-mode fallback as useStore.js - see there for rationale.
const BASE_URL = (
  import.meta.env.VITE_TM_BACKEND_URL ||
  (import.meta.env.DEV
    ? `http://${window.location.hostname}:5000`
    : "https://api.stalk-my-money.in/")
).replace(/\/?$/, "");
const CHAT_URL = `${BASE_URL}/user/chat`;

/** Only show buffering UI after this delay so fast replies do not flicker. */
const BUFFERING_SHOW_MS = 380;

let messageIdCounter = 0;
const nextMessageId = () => `m${++messageIdCounter}`;

const formatMessageTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** The backend's own error/guardrail-refusal replies all start this way
 * (see ChatService._run/_validate_and_prepare) - used to style them as a
 * distinct "this didn't work" state rather than a normal answer. */
const isErrorReply = (text) => /^sorry[,.]/i.test((text || "").trim());

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

/** Both resolve to {answer, pendingConfirmation, risk, download} - the
 * agent backend may pause a write action (add/delete expense, create
 * tag) for the user's explicit approval instead of answering
 * immediately; see app/services/agent/ on the backend. `risk` is Jev's
 * (TypeSafe AI) advisory read on how unusual/risky a pending proposal
 * looks - null whenever that's unconfigured or unsure, never required.
 * `download` is set only when this turn called export_expenses - a
 * base64-encoded file (see ChatDownload in app/schemas/chat.py) small
 * enough to travel inline in this same response rather than needing a
 * separate download endpoint. */
async function postChatQuestion(threadId, question, signal) {
  const r = await axios.post(CHAT_URL, { thread_id: threadId, question }, { signal });
  return {
    answer: extractChatReply(r.data),
    pendingConfirmation: !!r.data?.pending_confirmation,
    risk: r.data?.risk ?? null,
    download: r.data?.download ?? null,
  };
}

async function postChatConfirm(threadId, approve, signal) {
  const r = await axios.post(CHAT_URL, { thread_id: threadId, confirm: approve }, { signal });
  return {
    answer: extractChatReply(r.data),
    pendingConfirmation: !!r.data?.pending_confirmation,
    risk: r.data?.risk ?? null,
    download: r.data?.download ?? null,
  };
}

/** True for the error axios throws when a request is aborted via
 * AbortController (see stopGenerating below) - distinct from a real
 * network/server failure, so the catch blocks can skip showing an error
 * bubble for a cancellation the user asked for themselves. */
const isAbortError = (err) =>
  axios.isCancel(err) || err?.code === "ERR_CANCELED" || err?.name === "CanceledError";

/** Decodes a base64 ChatDownload payload and triggers a normal browser
 * file-save - no server round-trip, the bytes are already here. */
function triggerDownload({ filename, mime_type, content_b64 }) {
  try {
    const byteChars = atob(content_b64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime_type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    pushChatAlert("Couldn't prepare that file for download.");
  }
}

const isMobileViewport = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 860px)").matches;

// Explicit, self-owned {left, top, width, height} in px - computed once per
// open, then only ever changed by drag/resize math below. Deliberately NOT
// relying on the overlay's flex-centering for position: a flex-centered box
// recenters itself whenever its width/height changes, which was silently
// moving the *opposite* edge during a resize (shrink from the west edge and
// the east edge drifted too, since the browser kept re-centering the box).
// A fully explicit rect sidesteps that entirely.
const computeDefaultRect = () => {
  if (isMobileViewport()) {
    // A modest centered floating window, not an edge-to-edge takeover -
    // dragging/resizing are disabled below this breakpoint (see
    // isMobileViewport() checks), but it still shouldn't swallow the
    // whole screen by default.
    const width = Math.min(window.innerWidth - 32, 360);
    const height = Math.min(window.innerHeight * 0.6, 520);
    return {
      left: (window.innerWidth - width) / 2,
      top: (window.innerHeight - height) / 2,
      width,
      height,
    };
  }
  const width = Math.min(640, window.innerWidth * 0.95);
  const height = Math.min(720, window.innerHeight * 0.95);
  return {
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
    width,
    height,
  };
};

export default function ChatAssistantDialog({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [bufferingVisible, setBufferingVisible] = useState(false);
  // True while a confirmed action's DB write has replied but the
  // dashboard (banks/expenses/tags) is still being re-pulled in the
  // background - shows a small "Updating dashboard…" indicator so it's
  // clear the UI hasn't caught up yet, without blocking the chat input.
  const [syncingDashboard, setSyncingDashboard] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [rect, setRect] = useState(computeDefaultRect);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const dragStateRef = useRef(null);
  const resizeStateRef = useRef(null);
  const recognitionRef = useRef(null);
  // The input text at the moment listening started - live speech is
  // appended after this, not after whatever `input` is at render time
  // (interim results fire many times per second and each one replaces the
  // previous interim chunk, so appending onto a stale `input` closure would
  // duplicate text instead of just updating the tail).
  const baseTextRef = useRef("");
  // Identifies this conversation to the backend agent (which keeps its own
  // per-thread memory, including any action awaiting confirmation) - a
  // fresh one each time the dialog is opened, so reopening starts a clean
  // conversation rather than resuming wherever a previous one left off.
  const threadIdRef = useRef(null);
  // The in-flight chat request's AbortController, if any - set right
  // before each postChatQuestion/postChatConfirm call, cleared once it
  // settles. stopGenerating() below aborts whatever's currently in it.
  const abortControllerRef = useRef(null);

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
    useStore.getState().fetchPublicFeatureFlags();
    return () => clearTimeout(id);
  }, [open]);

  // null (not yet fetched, or fetch failed) defaults to "on" - today's
  // existing behavior, so a flag outage never silently removes the button.
  const voiceInputEnabled = useStore((s) => s.featureFlags?.voice_input_enabled !== false);

  // On mobile, always (re)apply the full-screen sheet rect on open - rather
  // than keep whatever `rect` was last computed/left at. Dragging/resizing
  // are disabled on mobile anyway, so there's no user customization to
  // preserve there, and without this, a `rect` computed once at mount
  // against a desktop-sized viewport (or left over from a desktop session)
  // would keep being used after switching to a narrow viewport - rendering
  // the dialog off-screen/mis-sized, which looked like it "wasn't opening"
  // rather than just being positioned for the wrong viewport. Desktop rects
  // are left untouched here, so dragged/resized position still persists
  // across close/reopen there.
  useEffect(() => {
    if (open && isMobileViewport()) setRect(computeDefaultRect());
  }, [open]);

  // Auto-grow the textarea to fit its content, capped at roughly half the
  // *current* dialog height (not a small fixed px value - that just meant
  // hitting the cap sooner and going back to hiding earlier lines behind
  // an internal scrollbar, the original complaint). Recomputed against
  // `rect.height` too, so resizing the whole dialog raises/lowers the cap
  // along with it. Runs after every change, with the DOM already having
  // committed the new value, so scrollHeight reflects it correctly.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const maxHeight = Math.max(80, rect.height * 0.5);
    el.style.maxHeight = `${maxHeight}px`;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [input, rect.height]);

  useEffect(() => {
    if (!open) return;

    threadIdRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `t${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const name = useStore.getState().userName;
    const displayName = (name && String(name).trim()) || "there";
    setMessages([
      {
        id: nextMessageId(),
        role: "assistant",
        text: `Hello ${displayName}, how are you?`,
        ts: Date.now(),
      },
    ]);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages, sending, bufferingVisible, syncingDashboard]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onDragMove = (e) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    // The whole panel must stay fully inside the viewport on every edge -
    // if any part of it (starting with the header, the only grabbable
    // part) lands off-page, there's nothing left on-screen to grab it
    // back with (it can end up behind the browser's own tab bar, etc.).
    const left = Math.min(
      Math.max(drag.baseLeft + (e.clientX - drag.startX), 0),
      window.innerWidth - drag.width,
    );
    const top = Math.min(
      Math.max(drag.baseTop + (e.clientY - drag.startY), 0),
      window.innerHeight - drag.height,
    );
    // Mutate the DOM directly instead of setRect() here - calling setRect
    // on every single pointermove re-renders the whole dialog (every chat
    // bubble, every markdown re-parse) dozens of times a second, which is
    // what actually made dragging feel slow. The panel's position is only
    // committed back to React state once, in endDrag below.
    drag.lastLeft = left;
    drag.lastTop = top;
    const panel = panelRef.current;
    if (panel) {
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    }
  };

  const endDrag = () => {
    const drag = dragStateRef.current;
    if (drag && (drag.lastLeft !== undefined || drag.lastTop !== undefined)) {
      setRect((r) => ({
        ...r,
        left: drag.lastLeft ?? r.left,
        top: drag.lastTop ?? r.top,
      }));
    }
    dragStateRef.current = null;
    document.body.style.cursor = "";
    setIsDragging(false);
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", endDrag);
  };

  // Safety net: if the dialog unmounts mid-drag, don't leave stray
  // window-level listeners behind.
  useEffect(() => endDrag, []);

  const startDrag = (e) => {
    if (e.target.closest(".dialog-close")) return;
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: rect.left,
      baseTop: rect.top,
      width: rect.width,
      height: rect.height,
    };
    // Forced on <body> (not just the header) so the cursor stays a closed
    // hand even when a fast drag carries the pointer over other elements
    // with their own cursor styles - the header's CSS `cursor: grab` alone
    // only applies while actually hovering it.
    document.body.style.cursor = "grabbing";
    setIsDragging(true);
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", endDrag);
  };

  // ── Resize: 8 invisible handles (4 edges + 4 corners), each dragged via
  // pointer events so every edge gets its own correct two-arrow cursor -
  // the native CSS `resize` property only ever gives a single corner handle.
  const RESIZE_MIN = 320;
  const resizeCursor = {
    n: "ns-resize",
    s: "ns-resize",
    e: "ew-resize",
    w: "ew-resize",
    ne: "nesw-resize",
    sw: "nesw-resize",
    nw: "nwse-resize",
    se: "nwse-resize",
  };

  const onResizeMove = (e) => {
    const st = resizeStateRef.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    const maxW = Math.min(window.innerWidth * 0.95, 1100);
    const maxH = window.innerHeight * 0.95;

    let { left, top, width, height } = st.base;

    if (st.direction.includes("e")) {
      // East edge moves; west edge (left) is untouched - stays exactly put.
      width = Math.min(Math.max(st.base.width + dx, RESIZE_MIN), maxW);
    }
    if (st.direction.includes("w")) {
      width = Math.min(Math.max(st.base.width - dx, RESIZE_MIN), maxW);
      // Move `left` by exactly the width delta (in the opposite direction)
      // so `left + width` - the east edge - is algebraically constant,
      // regardless of clamping. That's what actually pins the opposite
      // edge in place; relying on flex-centering to do it (the old
      // approach) silently moved both edges together instead.
      left = st.base.left + (st.base.width - width);
    }
    if (st.direction.includes("s")) {
      height = Math.min(Math.max(st.base.height + dy, RESIZE_MIN), maxH);
    }
    if (st.direction.includes("n")) {
      height = Math.min(Math.max(st.base.height - dy, RESIZE_MIN), maxH);
      top = st.base.top + (st.base.height - height);
    }

    // The whole panel must stay fully inside the viewport on every edge -
    // none of it may land behind the browser's own chrome (tab bar, etc.)
    // where there'd be nothing left on-screen to grab/resize from. Shrink
    // from whichever side overflowed instead of letting that edge go
    // out of bounds, so the opposite edge stays pinned wherever possible.
    if (left < 0) {
      width += left;
      left = 0;
    }
    if (top < 0) {
      height += top;
      top = 0;
    }
    if (left + width > window.innerWidth) width = window.innerWidth - left;
    if (top + height > window.innerHeight) height = window.innerHeight - top;
    width = Math.max(width, RESIZE_MIN);
    height = Math.max(height, RESIZE_MIN);

    // Same reasoning as onDragMove above: mutate the DOM directly during
    // the gesture, commit to React state once at the end, so resizing
    // doesn't re-render (and re-parse every message's markdown) on every
    // pointermove.
    st.last = { left, top, width, height };
    const panel = panelRef.current;
    if (panel) {
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.width = `${width}px`;
      panel.style.height = `${height}px`;
    }
  };

  const endResize = () => {
    const st = resizeStateRef.current;
    if (st?.last) setRect(st.last);
    resizeStateRef.current = null;
    document.body.style.cursor = "";
    setIsResizing(false);
    window.removeEventListener("pointermove", onResizeMove);
    window.removeEventListener("pointerup", endResize);
  };

  useEffect(() => endResize, []);

  const startResize = (e, direction) => {
    if (isMobileViewport()) return; // full-screen on mobile - resizing doesn't apply
    e.stopPropagation();
    e.preventDefault();
    resizeStateRef.current = {
      direction,
      startX: e.clientX,
      startY: e.clientY,
      base: { ...rect },
    };
    document.body.style.cursor = resizeCursor[direction];
    setIsResizing(true);
    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", endResize);
  };

  // Stop any in-progress recognition if the dialog closes or unmounts - it
  // otherwise keeps the mic live (and the browser's recording indicator on)
  // with nowhere for the transcript to go.
  useEffect(() => {
    if (!open) {
      recognitionRef.current?.stop();
    }
    return () => recognitionRef.current?.stop();
  }, [open]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  };

  const startListening = () => {
    if (!SpeechRecognitionCtor || sending || hasPendingConfirmation) return;
    if (isListening) {
      stopListening();
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    baseTextRef.current = input ? `${input} ` : "";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(`${baseTextRef.current}${transcript}`);
    };
    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        pushChatAlert("Couldn't hear you - check mic permissions and try again.");
      }
      stopListening();
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      stopListening();
    }
  };

  const copyMessage = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1400);
    } catch {
      pushChatAlert("Couldn't copy to clipboard");
    }
  };

  // Block sending a new free-text message while a proposed action is
  // awaiting Confirm/Cancel - the backend's conversation is paused there
  // and wouldn't know what to do with an unrelated new question.
  const hasPendingConfirmation = messages.some((m) => m.pendingConfirmation);

  // Return focus to the input once a reply lands, so the user can keep
  // typing without reaching for the mouse - but not while a confirmation
  // is pending, since the input is disabled then.
  useEffect(() => {
    if (sending || hasPendingConfirmation) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [sending, hasPendingConfirmation]);

  const addAssistantMessage = (answer, pendingConfirmation, risk = null, download = null) => {
    setMessages((m) => [
      ...m,
      {
        id: nextMessageId(),
        role: "assistant",
        text: answer,
        ts: Date.now(),
        isError: !pendingConfirmation && isErrorReply(answer),
        pendingConfirmation,
        risk,
        download,
      },
    ]);
    // Browsers only allow a file-save prompt to fire from a real user
    // gesture's call stack in some cases, but a direct synchronous call
    // like this (still inside the same async handler chain triggered by
    // the user's Enter/click) is the standard pattern chat UIs use and
    // works across current browsers - no separate "click to download"
    // step needed for the common case. The button rendered below is the
    // fallback for anyone whose browser blocks it.
    if (download) triggerDownload(download);
  };

  const reportChatError = (err) => {
    const msg =
      err?.response?.data?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      "Chat request failed";
    pushChatAlert(typeof msg === "string" ? msg : JSON.stringify(msg));
    addAssistantMessage(
      "Sorry, something went wrong. Try again in a moment.",
      false,
    );
  };

  const sendUserMessage = async () => {
    const q = input.trim();
    if (!q || sending || hasPendingConfirmation) return;
    if (isListening) stopListening();
    setInput("");
    setMessages((m) => [
      ...m,
      { id: nextMessageId(), role: "user", text: q, ts: Date.now() },
    ]);
    setSending(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const { answer, pendingConfirmation, risk, download } = await postChatQuestion(
        threadIdRef.current,
        q,
        controller.signal,
      );
      addAssistantMessage(answer, pendingConfirmation, risk, download);
      setSending(false);
      // Most tools pause for a separate confirm step, but a few (display
      // preferences - dark mode, privacy mode, page size, bank order)
      // apply immediately within this same ask() turn, with no confirm
      // round trip to hang a refresh off of. Since there's no reliable
      // way to tell from here whether this particular answer came from
      // one of those, just refresh whenever nothing is pending - it's a
      // few cheap GETs, harmless when nothing actually changed.
      if (!pendingConfirmation) {
        setSyncingDashboard(true);
        try {
          await useStore.getState().refreshAfterAgentAction();
        } finally {
          setSyncingDashboard(false);
        }
      }
    } catch (err) {
      setSending(false);
      if (isAbortError(err)) return; // user clicked Stop - nothing to report
      reportChatError(err);
    } finally {
      abortControllerRef.current = null;
    }
  };

  /** Cancels whatever chat request is currently in flight - the backend
   * keeps running it to completion regardless (there's no streaming
   * connection to actually interrupt mid-generation), but the UI stops
   * waiting on it immediately, which is what "Stop" means to the user
   * here. */
  const stopGenerating = () => {
    abortControllerRef.current?.abort();
  };

  /** approve=true/false in response to a message with pendingConfirmation. */
  const respondToConfirmation = async (messageId, approve) => {
    // Lock in the user's choice on that specific bubble immediately (so the
    // Confirm/Cancel buttons disappear right away, even before the network
    // call resolves) rather than leaving them clickable while sending.
    setMessages((m) =>
      m.map((msg) =>
        msg.id === messageId
          ? { ...msg, pendingConfirmation: false, decidedApprove: approve }
          : msg,
      ),
    );
    setSending(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const { answer, pendingConfirmation, risk, download } = await postChatConfirm(
        threadIdRef.current,
        approve,
        controller.signal,
      );
      addAssistantMessage(answer, pendingConfirmation, risk, download);
      setSending(false);
      // The approved action just wrote to the DB (expense/transfer/tag) -
      // pull fresh banks/expenses/tags so the dashboard updates live
      // instead of requiring a manual reload. Nothing to refresh on a
      // cancel, since the agent never touched the DB for it. Awaited (not
      // fire-and-forget) so syncingDashboard stays accurate.
      if (approve) {
        setSyncingDashboard(true);
        try {
          await useStore.getState().refreshAfterAgentAction();
        } finally {
          setSyncingDashboard(false);
        }
      }
    } catch (err) {
      setSending(false);
      if (isAbortError(err)) return;
      reportChatError(err);
    } finally {
      abortControllerRef.current = null;
    }
  };

  if (!open) return null;

  return (
    <div className="chat-dialog-overlay">
      <div
        ref={panelRef}
        className={`chat-dialog-panel${isDragging ? " is-dragging" : ""}${isResizing ? " is-resizing" : ""}`}
        role="dialog"
        aria-labelledby="chat-dialog-title"
        style={{
          // Fully explicit position/size (see computeDefaultRect above) -
          // `scale` for the drag/resize lift effect (.is-dragging/
          // .is-resizing below) stays independent of these since it's a
          // separate CSS property from left/top/width/height.
          position: "fixed",
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        }}
      >
        {["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((dir) => (
          <div
            key={dir}
            className={`chat-resize-handle chat-resize-handle--${dir}`}
            onPointerDown={(e) => startResize(e, dir)}
          />
        ))}
        <div className="chat-dialog-header" onPointerDown={startDrag}>
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
          {messages.map((m, i) => {
            const grouped = i > 0 && messages[i - 1].role === m.role;
            const isCopied = copiedId === m.id;
            return (
              <Fragment key={m.id}>
                {!grouped && (
                  <div className="chat-time-divider">
                    {formatMessageTime(m.ts)}
                  </div>
                )}
                <div
                  className={`chat-row chat-row--${m.role}${grouped ? " chat-row--grouped" : ""}`}
                >
                  <div className="chat-bubble-col">
                    <div
                      className={`chat-bubble chat-bubble--${m.role}${m.isError ? " chat-bubble--error" : ""}${m.pendingConfirmation ? " chat-bubble--pending" : ""}`}
                    >
                      <div className="chat-bubble-text">
                        {m.role === "assistant" ? renderMarkdown(m.text) : m.text}
                      </div>
                      {m.download && (
                        <button
                          type="button"
                          className="chat-download-btn"
                          onClick={() => triggerDownload(m.download)}
                        >
                          <Download size={13} /> {m.download.filename}
                        </button>
                      )}
                      {m.pendingConfirmation && m.risk?.flagged && (
                        <div className="chat-risk-badge">
                          <AlertTriangle size={13} />
                          <span>
                            This looks unusually large or risky - double
                            check before confirming.
                          </span>
                        </div>
                      )}
                      {m.pendingConfirmation && (
                        <div className="chat-confirm-row">
                          <button
                            type="button"
                            className="chat-confirm-btn chat-confirm-btn--approve"
                            onClick={() => respondToConfirmation(m.id, true)}
                          >
                            <Check size={13} /> Confirm
                          </button>
                          <button
                            type="button"
                            className="chat-confirm-btn chat-confirm-btn--reject"
                            onClick={() => respondToConfirmation(m.id, false)}
                          >
                            <X size={13} /> Cancel
                          </button>
                        </div>
                      )}
                      {m.decidedApprove !== undefined && (
                        <div className="chat-confirm-decided">
                          {m.decidedApprove ? "✓ You confirmed" : "✗ You cancelled"}
                        </div>
                      )}
                      <button
                        type="button"
                        className="chat-bubble-copy"
                        onClick={() => copyMessage(m.id, m.text)}
                        aria-label="Copy message"
                        title="Copy"
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              </Fragment>
            );
          })}
          {sending &&
            bufferingVisible &&
            (messages.length === 0 ||
              messages[messages.length - 1].role === "user" ||
              // Also covers waiting on a Confirm/Cancel result - the last
              // message there is the proposal bubble itself, now marked
              // decided, not a fresh "user" message.
              messages[messages.length - 1].decidedApprove !== undefined) && (
              <div className="chat-row chat-row--assistant">
                <div
                  className="chat-bubble chat-bubble--assistant chat-bubble--buffering"
                  role="status"
                >
                  <span className="chat-buffer-spinner" aria-hidden />
                  <span className="chat-buffer-text">Getting reply…</span>
                </div>
              </div>
            )}
          {syncingDashboard && (
            <div className="chat-row chat-row--assistant">
              <div
                className="chat-bubble chat-bubble--assistant chat-bubble--buffering"
                role="status"
              >
                <span className="chat-buffer-spinner" aria-hidden />
                <span className="chat-buffer-text">Updating dashboard…</span>
              </div>
            </div>
          )}
        </div>

        <div className="chat-dialog-footer">
          <textarea
            ref={inputRef}
            className="chat-dialog-input"
            rows={1}
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
            placeholder={
              hasPendingConfirmation
                ? "Confirm or cancel the action above…"
                : "Type a message…"
            }
            disabled={sending || hasPendingConfirmation}
          />
          {SpeechRecognitionCtor && voiceInputEnabled && (
            <button
              type="button"
              className={`chat-dialog-mic${isListening ? " chat-dialog-mic--active" : ""}`}
              onClick={startListening}
              disabled={sending || hasPendingConfirmation}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              title={isListening ? "Stop voice input" : "Speak your message"}
            >
              <Mic size={17} strokeWidth={2.25} />
            </button>
          )}
          {sending ? (
            <button
              type="button"
              className="chat-dialog-send chat-dialog-send--stop"
              onClick={stopGenerating}
              aria-label="Stop generating"
              title="Stop generating"
            >
              <Square size={15} strokeWidth={2.25} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              className="chat-dialog-send"
              onClick={sendUserMessage}
              disabled={hasPendingConfirmation || !input.trim()}
              aria-label="Send message"
            >
              <Send size={17} strokeWidth={2.25} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
