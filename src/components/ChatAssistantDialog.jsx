import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useStore } from '../store/useStore.js'

const pushChatAlert = msg => useStore.getState().pushAlert(msg)

const BASE_URL = (import.meta.env.VITE_TM_BACKEND_URL || 'https://api.stalk-my-money.in/').replace(/\/?$/, '')
const CHAT_URL = `${BASE_URL}/user/chat`

/** Only show buffering UI after this delay so fast replies do not flicker. */
const BUFFERING_SHOW_MS = 380

function extractChatReply(data) {
  if (data == null) return ''
  if (typeof data === 'string') return data
  const v =
    data.answer ??
    data.reply ??
    data.response ??
    data.message ??
    (typeof data.data === 'string' ? data.data : data.data?.answer ?? data.data?.reply ?? data.data?.message)
  if (typeof v === 'string') return v
  if (v != null && typeof v === 'object') return JSON.stringify(v)
  try {
    return JSON.stringify(data)
  } catch {
    return 'No reply'
  }
}

async function postChatQuestion(question) {
  const r = await axios.post(CHAT_URL, { question })
  return extractChatReply(r.data)
}

export default function ChatAssistantDialog({ open, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [bufferingVisible, setBufferingVisible] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    if (!sending) {
      setBufferingVisible(false)
      return
    }
    const id = window.setTimeout(() => setBufferingVisible(true), BUFFERING_SHOW_MS)
    return () => clearTimeout(id)
  }, [sending])

  useEffect(() => {
    if (!open) {
      setMessages([])
      setInput('')
      setSending(false)
      return
    }

    const name = useStore.getState().userName
    const greeting =
      `Hi, I am ${(name && String(name).trim()) || 'User'}, greet me with warm welcome`

    let cancelled = false
    setSending(true)
    setMessages([])
    ;(async () => {
      try {
        const reply = await postChatQuestion(greeting)
        if (!cancelled) setMessages([{ role: 'assistant', text: reply }])
      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          'Chat request failed'
        pushChatAlert(typeof msg === 'string' ? msg : JSON.stringify(msg))
        if (!cancelled) {
          setMessages([{ role: 'assistant', text: 'Sorry, something went wrong. Try again in a moment.' }])
        }
      } finally {
        if (!cancelled) setSending(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || !listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [open, messages, sending, bufferingVisible])

  useEffect(() => {
    if (!open) return
    const onKey = e => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const sendUserMessage = async () => {
    const q = input.trim()
    if (!q || sending) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: q }])
    setSending(true)
    try {
      const reply = await postChatQuestion(q)
      setMessages(m => [...m, { role: 'assistant', text: reply }])
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Chat request failed'
      pushChatAlert(typeof msg === 'string' ? msg : JSON.stringify(msg))
      setMessages(m => [...m, { role: 'assistant', text: 'Sorry, something went wrong. Try again in a moment.' }])
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div className="chat-dialog-overlay" onClick={onClose} role="presentation">
      <div className="chat-dialog-panel" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="chat-dialog-title">
        <div className="chat-dialog-header">
          <div className="chat-dialog-title-wrap">
            <div className="chat-dialog-icon">💬</div>
            <div>
              <div id="chat-dialog-title" className="chat-dialog-title">
                Chat
              </div>
              <div className="chat-dialog-sub">Ask anything about your money</div>
            </div>
          </div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close chat">
            ×
          </button>
        </div>

        <div className="chat-dialog-messages" ref={listRef} aria-busy={sending}>
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble chat-bubble--${m.role}`}>
              {m.text}
            </div>
          ))}
          {sending &&
            bufferingVisible &&
            (messages.length === 0 || messages[messages.length - 1].role === 'user') && (
              <div className="chat-bubble chat-bubble--assistant chat-bubble--buffering" role="status">
                <span className="chat-buffer-spinner" aria-hidden />
                <span className="chat-buffer-text">Getting reply…</span>
              </div>
            )}
        </div>

        <div className="chat-dialog-footer">
          <textarea
            className="chat-dialog-input"
            rows={2}
            placeholder="Type a message…"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendUserMessage()
              }
            }}
            disabled={sending}
          />
          <button type="button" className="chat-dialog-send" onClick={sendUserMessage} disabled={sending || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
