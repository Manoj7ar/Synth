'use client'

import { useState } from 'react'
import { TranscriptChunk } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Mic, User } from 'lucide-react'

interface TranscriptEditorProps {
  chunks: TranscriptChunk[]
  onUpdate?: (chunks: TranscriptChunk[]) => void
}

export function TranscriptEditor({ chunks, onUpdate }: TranscriptEditorProps) {
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null)

  const formatTimestamp = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Transcript</h3>
        <Badge variant="outline">{chunks.length} turns</Badge>
      </div>

      {chunks.map((chunk) => (
        <div 
          key={chunk.chunk_id} 
          className={`border rounded-lg p-4 ${
            chunk.speaker === 'clinician' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              chunk.speaker === 'clinician' ? 'bg-blue-500' : 'bg-gray-400'
            }`}>
              {chunk.speaker === 'clinician' ? (
                <User size={16} className="text-white" />
              ) : (
                <Mic size={16} className="text-white" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm capitalize">{chunk.speaker}</span>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(chunk.start_ms)} - {formatTimestamp(chunk.end_ms)}
                </span>
              </div>

              <p className="text-gray-700 leading-relaxed">{chunk.text}</p>

              {chunk.ml_entities && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {chunk.ml_entities.medications?.map((med, idx) => (
                    <Badge key={`med-${idx}`} variant="default" className="bg-green-500 text-white border-0">
                      💊 {med.name} {med.dosage || ''}
                    </Badge>
                  ))}
                  {chunk.ml_entities.symptoms?.map((symptom, idx) => (
                    <Badge key={`sym-${idx}`} variant="default" className="bg-yellow-500 text-white border-0">
                      🩹 {symptom.name}
                    </Badge>
                  ))}
                  {chunk.ml_entities.vitals?.map((vital, idx) => (
                    <Badge key={`vit-${idx}`} variant="default" className="bg-blue-500 text-white border-0">
                      🩺 {vital.type}: {vital.value}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
