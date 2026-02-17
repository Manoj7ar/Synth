'use client'

import { ChatMessage, ChatSourceDetail, ChatVisualization } from '@/types'
import Image from 'next/image'
import { User, Bot } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface MessageListProps {
  messages: ChatMessage[]
  theme?: 'default' | 'patient'
}

export function MessageList({ messages, theme = 'default' }: MessageListProps) {
  const assistantBubbleClass =
    theme === 'patient' ? 'bg-[#f3e6cf] text-slate-800 border border-[#e5d4b6]' : 'bg-gray-100 text-gray-900'
  const userBubbleClass =
    theme === 'patient' ? 'bg-[#6f5530] text-white' : 'bg-blue-500 text-white'
  const assistantAvatarClass =
    theme === 'patient' ? 'bg-[#8a6c3d]' : 'bg-blue-500'

  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {message.role === 'assistant' && (
            <div className={`w-8 h-8 rounded-full ${assistantAvatarClass} flex items-center justify-center flex-shrink-0`}>
              {theme === 'patient' ? (
                <Image
                  src="/favicon.svg"
                  alt="Synth AI"
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ) : (
                <Bot size={18} className="text-white" />
              )}
            </div>
          )}
          
          <div className={`max-w-2xl ${message.role === 'user' ? 'order-first' : ''}`}>
            <div className={`rounded-lg p-4 ${
              message.role === 'user' 
                ? userBubbleClass
                : assistantBubbleClass
            }`}>
              <div className="prose prose-sm max-w-none" 
                   dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} 
              />
            </div>

            {message.role === 'assistant' && message.visualization && (
              <VisualizationCard visualization={message.visualization} theme={theme} />
            )}

            {message.role === 'assistant' && message.sourceDetails && message.sourceDetails.length > 0 && (
              <SourceDetailsCard sourceDetails={message.sourceDetails} theme={theme} />
            )}
            
            {message.citations && message.citations.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.citations.map((citation, idx) => (
                  <div key={idx} className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="font-medium">{citation.source}</span>
                    {citation.timestamp && <span className="ml-2">({citation.timestamp})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {message.role === 'user' && (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-gray-600" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function VisualizationCard({
  visualization,
  theme,
}: {
  visualization: ChatVisualization
  theme: 'default' | 'patient'
}) {
  if (visualization.type !== 'bp_trend' || visualization.data.length === 0) {
    return null
  }

  return (
    <div
      className={`mt-3 rounded-2xl p-4 ${
        theme === 'patient'
          ? 'bg-[#fff8ea]/75 shadow-[0_10px_24px_rgba(109,86,52,0.14)]'
          : 'bg-white border border-slate-200'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vital Trend</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{visualization.title}</p>
      {visualization.description && (
        <p className="mt-1 text-xs text-slate-600">{visualization.description}</p>
      )}

      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visualization.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5dccd" />
            <XAxis dataKey="label" stroke="#7a6a53" tick={{ fontSize: 11 }} />
            <YAxis domain={['dataMin - 8', 'dataMax + 8']} stroke="#7a6a53" tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} mmHg`,
                name === 'systolic' ? 'Systolic' : 'Diastolic',
              ]}
              labelFormatter={(label) => `Visit: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="systolic"
              stroke="#b45309"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Systolic"
            />
            <Line
              type="monotone"
              dataKey="diastolic"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Diastolic"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function SourceDetailsCard({
  sourceDetails,
  theme,
}: {
  sourceDetails: ChatSourceDetail[]
  theme: 'default' | 'patient'
}) {
  return (
    <div
      className={`mt-3 rounded-2xl p-4 ${
        theme === 'patient'
          ? 'bg-[#fffdf6]/80 shadow-[0_10px_24px_rgba(109,86,52,0.12)]'
          : 'bg-white border border-slate-200'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sources Used</p>
      <div className="mt-3 space-y-2">
        {sourceDetails.map((detail, index) => (
          <div
            key={`${detail.source}-${detail.timestamp ?? ''}-${index}`}
            className="rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-700"
          >
            <p className="font-semibold text-slate-900">
              {detail.source}
              {detail.visitDate ? ` - ${detail.visitDate}` : ''}
              {detail.timestamp ? ` (${detail.timestamp})` : ''}
            </p>
            <p className="mt-1 leading-relaxed">{detail.excerpt}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatMessageContent(content: string): string {
  return content
    .replace(/\[Transcript (\d{2}:\d{2}(?::\d{2})?)\]/g,
      '<span class="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">Transcript $1</span>')
    .replace(/\[Transcript (\d{2}:\d{2}:\d{2})-(\d{2}:\d{2}:\d{2})\]/g, 
      '<span class="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">Transcript $1-$2</span>')
    .replace(/\[Transcript (\d{2}:\d{2})-(\d{2}:\d{2})\]/g, 
      '<span class="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">Transcript $1-$2</span>')
    .replace(/\[(Summary|SOAP|Appointment|Plan)\]/g,
      '<span class="inline-block px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">$1</span>')
    .replace(/\[Doc: ([^\]]+)\]/g, 
      '<span class="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs">$1</span>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
}
