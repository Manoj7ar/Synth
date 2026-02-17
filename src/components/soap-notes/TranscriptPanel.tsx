'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { TranscriptSegment } from '@/lib/clinical-notes'

interface TranscriptPanelProps {
  transcript: TranscriptSegment[]
}

type SpeakerFilter = 'all' | 'clinician' | 'patient'

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [speakerFilter, setSpeakerFilter] = useState<SpeakerFilter>('all')

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return transcript.filter((segment) => {
      if (speakerFilter !== 'all' && segment.speaker !== speakerFilter) return false
      if (!normalizedQuery) return true
      return segment.text.toLowerCase().includes(normalizedQuery)
    })
  }, [query, speakerFilter, transcript])

  return (
    <div className="rounded-2xl border border-[#eadfcd] bg-white/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Conversation Transcript
          </p>
          <p className="mt-1 text-sm text-slate-600">{transcript.length} segments captured</p>
        </div>
        <Button type="button" onClick={() => setIsOpen((open) => !open)}>
          {isOpen ? 'Hide Transcript' : 'Show Transcript'}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search transcript..."
              className="h-10 min-w-52 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            />
            <Button
              type="button"
              variant={speakerFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSpeakerFilter('all')}
            >
              All
            </Button>
            <Button
              type="button"
              variant={speakerFilter === 'clinician' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSpeakerFilter('clinician')}
            >
              Doctor
            </Button>
            <Button
              type="button"
              variant={speakerFilter === 'patient' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSpeakerFilter('patient')}
            >
              Patient
            </Button>
          </div>

          <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                No transcript lines match this filter.
              </p>
            ) : (
              filtered.map((segment, index) => (
                <div
                  key={`${segment.start_ms}-${index}`}
                  className={`rounded-xl border px-3 py-3 ${
                    segment.speaker === 'clinician'
                      ? 'border-sky-200 bg-sky-50'
                      : 'border-emerald-200 bg-emerald-50'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    <span>{segment.speaker === 'clinician' ? 'Doctor' : 'Patient'}</span>
                    <span className="text-slate-400">
                      {formatTimestamp(segment.start_ms)} - {formatTimestamp(segment.end_ms)}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-800">{segment.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
