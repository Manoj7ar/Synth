'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MessageInput } from './MessageInput'
import { MessageList } from './MessageList'
import { ToolTracePanel } from './ToolTracePanel'
import { ChatMessage, ChatSourceDetail, ChatVisualization, ToolEvent } from '@/types'

interface ChatInterfaceProps {
  patientId: string
  visitId: string
  shareToken?: string
  agentId?: string
  mode?: 'clinician' | 'patient'
  showToolTrace?: boolean
  onConversationStart?: () => void
}

export function ChatInterface({
  patientId,
  visitId,
  shareToken,
  agentId = 'synth_patient_agent',
  mode = 'clinician',
  showToolTrace = mode === 'clinician',
  onConversationStart,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [toolTraceOpen, setToolTraceOpen] = useState(showToolTrace)

  const theme = mode === 'patient' ? 'patient' : 'default'

  const starterPrompts = useMemo(() => {
    if (mode === 'patient') {
      return [
        'When is my next appointment?',
        'What are the tasks I need to do before my next visit?',
        'What foods should I avoid based on this visit?',
      ]
    }

    return [
      'What medications was I prescribed?',
      'What follow-up do I need?',
      'What did the doctor say about blood pressure?',
    ]
  }, [mode])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) {
      return
    }

    if (messages.length === 0) {
      onConversationStart?.()
    }

    const userMessage: ChatMessage = { role: 'user', content }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId,
          patientId,
          visitId,
          agentId,
          shareToken,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error || 'Chat request failed')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'conversation_id_set') {
              setConversationId(event.conversationId)
            } else if (event.type === 'message_chunk') {
              assistantMessage += event.chunk
              setMessages((prev) => {
                const newMessages = [...prev]
                const lastMessage = newMessages[newMessages.length - 1]
                if (lastMessage?.role === 'assistant') {
                  lastMessage.content = assistantMessage
                } else {
                  newMessages.push({ role: 'assistant', content: assistantMessage })
                }
                return [...newMessages]
              })
            } else if (event.type === 'message_metadata') {
              const citations = parseCitations(event.citations)
              const sourceDetails = parseSourceDetails(event.sourceDetails)
              const visualization = parseVisualization(event.visualization)

              setMessages((prev) => {
                const newMessages = [...prev]
                for (let i = newMessages.length - 1; i >= 0; i -= 1) {
                  if (newMessages[i]?.role === 'assistant') {
                    newMessages[i] = {
                      ...newMessages[i],
                      citations,
                      sourceDetails,
                      visualization,
                    }
                    break
                  }
                }
                return newMessages
              })
            } else if (event.type === 'tool_call' || event.type === 'tool_result') {
              setToolEvents((prev) => [...prev, event])
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full gap-4">
      <div
        className={`flex flex-1 flex-col transition-all ${
          mode === 'patient' ? 'bg-transparent' : 'border-slate-200 bg-white'
        }`}
      >
        <div className={`flex-1 overflow-y-auto ${mode === 'patient' ? 'p-0' : 'p-5'}`}>
          {messages.length === 0 ? (
            <div
              className={`flex h-full flex-col items-center justify-center text-center ${
                mode === 'patient' ? 'p-2 md:p-4' : 'p-8'
              }`}
            >
              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                  mode === 'patient' ? 'bg-[#e9d8ba]' : 'bg-blue-100'
                }`}
              >
                {mode === 'patient' ? (
                  <Image
                    src="/favicon.svg"
                    alt="Synth AI"
                    width={34}
                    height={34}
                    className="rounded-full"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-blue-700">AI</span>
                )}
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">
                {mode === 'patient' ? 'Ask Synth AI About Your Care' : 'Ask About Your Visit'}
              </h3>
              <p className="max-w-md text-slate-600">
                {mode === 'patient'
                  ? 'Ask about your next appointment, care tasks, food guidance, and visit instructions.'
                  : 'I can answer questions about your visit, medications, symptoms, and follow-up instructions.'}
              </p>
              <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => void handleSendMessage(prompt)}
                    className={`rounded-xl p-3 text-left text-sm transition-colors ${
                      mode === 'patient'
                        ? 'bg-white/60 text-[#5a4321] hover:bg-white/80'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <MessageList messages={messages} theme={theme} />
          )}
        </div>
        <div className={`p-4 ${mode === 'patient' ? 'bg-transparent pt-3' : 'border-t bg-gray-50'}`}>
          <MessageInput
            onSend={handleSendMessage}
            disabled={isLoading}
            placeholder={
              mode === 'patient'
                ? 'Ask about appointments, care tasks, food guidance, or your visit...'
                : 'Ask about your visit...'
            }
            theme={theme}
          />
        </div>
      </div>

      {showToolTrace && toolTraceOpen && (
        <div className="w-96 flex-shrink-0 overflow-hidden rounded-lg border bg-white shadow-sm">
          <ToolTracePanel events={toolEvents} />
        </div>
      )}

      {showToolTrace && (
        <button
          onClick={() => setToolTraceOpen((open) => !open)}
          className="fixed right-4 top-1/2 z-10 -translate-y-1/2 rounded-lg border bg-white p-2 shadow-lg transition-colors hover:bg-gray-50"
        >
          {toolTraceOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      )}
    </div>
  )
}

function parseCitations(raw: unknown): ChatMessage['citations'] {
  if (!Array.isArray(raw)) {
    return undefined
  }

  const parsed = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const citation = item as { source?: unknown; timestamp?: unknown; excerpt?: unknown }
      if (typeof citation.source !== 'string' || typeof citation.excerpt !== 'string') {
        return null
      }
      return {
        source: citation.source,
        excerpt: citation.excerpt,
        timestamp: typeof citation.timestamp === 'string' ? citation.timestamp : undefined,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  return parsed.length > 0 ? parsed : undefined
}

function parseSourceDetails(raw: unknown): ChatSourceDetail[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined
  }

  const parsed = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const detail = item as {
        source?: unknown
        visitDate?: unknown
        timestamp?: unknown
        excerpt?: unknown
      }
      if (typeof detail.source !== 'string' || typeof detail.excerpt !== 'string') {
        return null
      }
      return {
        source: detail.source,
        excerpt: detail.excerpt,
        visitDate: typeof detail.visitDate === 'string' ? detail.visitDate : undefined,
        timestamp: typeof detail.timestamp === 'string' ? detail.timestamp : undefined,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  return parsed.length > 0 ? parsed : undefined
}

function parseVisualization(raw: unknown): ChatVisualization | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined
  }

  const value = raw as {
    type?: unknown
    title?: unknown
    description?: unknown
    data?: unknown
  }

  if (value.type !== 'bp_trend' || typeof value.title !== 'string' || !Array.isArray(value.data)) {
    return undefined
  }

  const data = value.data
    .map((point) => {
      if (!point || typeof point !== 'object') return null
      const p = point as {
        label?: unknown
        visitDate?: unknown
        systolic?: unknown
        diastolic?: unknown
      }
      if (
        typeof p.label !== 'string' ||
        typeof p.visitDate !== 'string' ||
        typeof p.systolic !== 'number' ||
        typeof p.diastolic !== 'number'
      ) {
        return null
      }
      return {
        label: p.label,
        visitDate: p.visitDate,
        systolic: p.systolic,
        diastolic: p.diastolic,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  if (data.length === 0) {
    return undefined
  }

  return {
    type: 'bp_trend',
    title: value.title,
    description: typeof value.description === 'string' ? value.description : undefined,
    data,
  }
}
