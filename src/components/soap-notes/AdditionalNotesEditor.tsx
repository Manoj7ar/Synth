'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface AdditionalNotesEditorProps {
  visitId: string
  initialNotes: string
}

export function AdditionalNotesEditor({ visitId, initialNotes }: AdditionalNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    setStatus('')
    setError('')

    try {
      const response = await fetch(`/api/soap-notes/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalNotes: notes }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save additional notes')
      }

      setStatus('Additional notes saved.')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save additional notes'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#eadfcd] bg-white/80 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        Additional Notes
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Type additional notes..."
        className="mt-3 min-h-40 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
      />
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save additional notes'}
        </Button>
        {status && <span className="text-sm text-emerald-700">{status}</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    </div>
  )
}
