'use client'

import { FormEvent, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Send, Sparkles, X } from 'lucide-react'
import Image from 'next/image'

type AssistantMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

type AssistantApiResponse = {
  answer: string
  navigateTo: string | null
  navigationLabel: string | null
  matchedPatient: string | null
  poweredBy: string
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const QUICK_PROMPTS = [
  'Open transcribe',
  'Open SOAP notes',
  'Open technology',
  "Open Sarah's notes",
  'How do I use this app?',
]

const INITIAL_ASSISTANT_MESSAGE: AssistantMessage = {
  id: makeId(),
  role: 'assistant',
  content:
    'I can help you navigate the app and open patient pages. Try "Open technology" or "Open transcribe".',
}

export function GlobalAiAssistant() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [messages, setMessages] = useState<AssistantMessage[]>([INITIAL_ASSISTANT_MESSAGE])
  const listRef = useRef<HTMLDivElement | null>(null)

  const historyPayload = useMemo(
    () =>
      messages
        .slice(-8)
        .map((item) => ({ role: item.role, content: item.content }))
        .filter((item) => item.content.trim().length > 0),
    [messages]
  )

  function scrollToBottom() {
    window.requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  async function sendPrompt(rawPrompt: string) {
    const trimmed = rawPrompt.trim()
    if (!trimmed || pending) {
      return
    }

    const userMessage: AssistantMessage = {
      id: makeId(),
      role: 'user',
      content: trimmed,
    }
    const pendingAssistantId = makeId()

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: pendingAssistantId,
        role: 'assistant',
        content: 'Thinking...',
      },
    ])
    setMessage('')
    setPending(true)
    scrollToBottom()

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          currentPath: pathname,
          history: [...historyPayload, { role: 'user', content: trimmed }],
        }),
      })

      if (!response.ok) {
        throw new Error('Assistant request failed')
      }

      const data = (await response.json()) as AssistantApiResponse
      const assistantReply = data.answer?.trim() || 'I could not generate a response.'

      setMessages((prev) =>
        prev.map((item) =>
          item.id === pendingAssistantId
            ? {
                ...item,
                content: data.navigateTo
                  ? `${assistantReply}\n\nNavigating to ${data.navigationLabel ?? data.navigateTo}...`
                  : assistantReply,
              }
            : item
        )
      )

      if (data.navigateTo) {
        setTimeout(() => {
          router.push(data.navigateTo as string)
        }, 350)
      }
    } catch {
      setMessages((prev) =>
        prev.map((item) =>
          item.id === pendingAssistantId
            ? {
                ...item,
                content: 'I hit an issue. Please try again.',
              }
            : item
        )
      )
    } finally {
      setPending(false)
      scrollToBottom()
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await sendPrompt(message)
  }

  function clearHistory() {
    setMessages([{ ...INITIAL_ASSISTANT_MESSAGE, id: makeId() }])
  }

  if (pathname.startsWith('/patient')) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-[70] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#efe2ca] shadow-[0_10px_28px_rgba(89,67,35,0.35)] transition hover:scale-[1.03] md:bottom-6 md:right-6"
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        <Image
          src="/favicon.svg"
          alt="Synth assistant"
          width={32}
          height={32}
          className="rounded-full"
        />
      </button>

      <aside
        className={`fixed bottom-24 right-5 z-[80] flex h-[min(72vh,640px)] w-[min(92vw,380px)] flex-col rounded-3xl border border-[#e2d1b2] bg-[#fff8ea]/95 shadow-[0_20px_60px_rgba(64,47,20,0.35)] backdrop-blur-xl transition-all duration-300 md:bottom-24 md:right-6 ${
          open
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-4 scale-95 opacity-0'
        }`}
      >
        <header className="flex items-center justify-between border-b border-[#e8dac0] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#e8d3ab]">
              <Image
                src="/favicon.svg"
                alt="Synth AI"
                width={22}
                height={22}
                className="rounded-full"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Synth AI</p>
              <p className="text-xs text-slate-600">Powered by Gemini</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearHistory}
              className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-white"
              aria-label="Clear chat history"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/75 text-slate-700 hover:bg-white"
              aria-label="Close AI assistant"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="border-b border-[#e8dac0] px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void sendPrompt(prompt)}
                disabled={pending}
                className="rounded-full bg-[#f1e4cc] px-3 py-1 text-xs font-medium text-[#59431f] transition hover:bg-[#ebd8b8] disabled:opacity-60"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((item) => (
            <div
              key={item.id}
              className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                item.role === 'assistant'
                  ? 'bg-[#f3e6cd] text-slate-800'
                  : 'ml-auto bg-[#6b522d] text-white'
              }`}
            >
              {item.content}
            </div>
          ))}
        </div>

        <form onSubmit={onSubmit} className="border-t border-[#e8dac0] px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask me to open a page or find a patient's notes..."
              rows={2}
              className="min-h-14 flex-1 resize-none rounded-2xl border border-[#dcc8a7] bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#b6976a]"
            />
            <button
              type="submit"
              disabled={pending || message.trim().length === 0}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#6b522d] text-white transition hover:bg-[#5b4422] disabled:opacity-60"
              aria-label="Send message"
            >
              {pending ? <Sparkles size={16} className="animate-pulse" /> : <Send size={16} />}
            </button>
          </div>
        </form>
      </aside>
    </>
  )
}
