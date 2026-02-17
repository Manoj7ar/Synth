'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Pause, Square, Loader2 } from 'lucide-react'

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing'
type SpeakerRole = 'clinician' | 'patient'

interface TranscriptSegment {
  speaker: SpeakerRole
  start_ms: number
  end_ms: number
  text: string
}

interface TranscribeResponse {
  success: boolean
  transcript: TranscriptSegment[]
  duration_ms: number
}

interface SaveTranscriptionResponse {
  success: boolean
  visitId: string
  patientName: string
}

interface LiveEntity {
  kind: 'symptom' | 'medication' | 'vital'
  name: string
  emoji: string
}

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionResultListLike {
  length: number
  [index: number]: SpeechRecognitionResultLike
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructorLike
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function getAudioMimeType(): string | undefined {
  const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return preferredTypes.find((type) => MediaRecorder.isTypeSupported(type))
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === 'undefined') return null
  const speechWindow = window as WindowWithSpeechRecognition
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

function dedupeLiveEntities(entities: LiveEntity[]): LiveEntity[] {
  const seen = new Set<string>()
  const output: LiveEntity[] = []
  for (const entity of entities) {
    const key = `${entity.kind}:${entity.name.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    output.push(entity)
  }
  return output
}

function extractLiveEntities(text: string): LiveEntity[] {
  const lower = text.toLowerCase()
  const entities: LiveEntity[] = []

  const symptoms = [
    'headache',
    'headaches',
    'dizzy',
    'dizziness',
    'nausea',
    'fatigue',
    'chest pain',
    'shortness of breath',
    'fever',
    'cough',
  ]
  symptoms.forEach((symptom) => {
    if (lower.includes(symptom)) {
      entities.push({
        kind: 'symptom',
        name: symptom.replace(/\b\w/g, (char) => char.toUpperCase()),
        emoji: '🩹',
      })
    }
  })

  const medicationPattern =
    /\b(lisinopril|metformin|atorvastatin|amlodipine|losartan|aspirin|ibuprofen)\b/gi
  const medicationMatches = text.match(medicationPattern) ?? []
  medicationMatches.forEach((medication) => {
    entities.push({
      kind: 'medication',
      name: medication.replace(/\b\w/g, (char) => char.toUpperCase()),
      emoji: '💊',
    })
  })

  const bpMatch = text.match(/\b(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})\b/i)
  if (bpMatch) {
    entities.push({
      kind: 'vital',
      name: `BP ${bpMatch[1]}/${bpMatch[2]}`,
      emoji: '🩺',
    })
  }

  return dedupeLiveEntities(entities).slice(0, 8)
}

export function TranscribeRecorder() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [liveEntities, setLiveEntities] = useState<LiveEntity[]>([])
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [patientName, setPatientName] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [savedVisitId, setSavedVisitId] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const recordingStateRef = useRef<RecordingState>('idle')

  useEffect(() => {
    recordingStateRef.current = recordingState
  }, [recordingState])

  function startTimer() {
    stopTimer()
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1)
    }, 1000)
  }

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function stopMediaTracks() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  function stopSpeechRecognition() {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setInterimTranscript('')
  }

  useEffect(() => {
    return () => {
      stopTimer()
      stopSpeechRecognition()
      stopMediaTracks()
    }
  }, [])

  useEffect(() => {
    const sourceText = `${liveTranscript} ${interimTranscript}`.trim()
    if (!sourceText) {
      setLiveEntities([])
      return
    }
    setLiveEntities(extractLiveEntities(sourceText))
  }, [liveTranscript, interimTranscript])

  const startSpeechRecognition = () => {
    const RecognitionCtor = getSpeechRecognitionCtor()
    if (!RecognitionCtor) return

    try {
      const recognition = new RecognitionCtor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.onresult = (event) => {
        let committedText = ''
        let interimText = ''

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i]
          const chunkText = result[0]?.transcript?.trim() ?? ''
          if (!chunkText) continue

          if (result.isFinal) {
            committedText += `${chunkText} `
          } else {
            interimText += `${chunkText} `
          }
        }

        if (committedText) {
          setLiveTranscript((previous) => `${previous}${committedText}`)
        }
        setInterimTranscript(interimText.trim())
      }
      recognition.onerror = () => {
        setInterimTranscript('')
      }
      recognition.onend = () => {
        if (recordingStateRef.current === 'recording') {
          startSpeechRecognition()
        }
      }
      recognition.start()
      recognitionRef.current = recognition
    } catch {
      // Browser speech recognition is optional.
    }
  }

  const uploadAndTranscribe = async (blob: Blob) => {
    const extension = blob.type.includes('mp4') ? 'mp4' : 'webm'
    const audioFile = new File([blob], `recording.${extension}`, { type: blob.type || 'audio/webm' })
    const formData = new FormData()
    formData.append('audio', audioFile)

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      let errorText = 'Transcription failed.'
      try {
        const payload = (await response.json()) as { error?: string }
        if (payload.error) errorText = payload.error
      } catch {
        // Keep default message.
      }
      throw new Error(errorText)
    }

    const payload = (await response.json()) as TranscribeResponse
    setSegments(payload.transcript ?? [])
  }

  const startNewRecording = async () => {
    setErrorMessage('')
    setSaveError('')
    setSavedVisitId('')
    setSegments([])
    setLiveTranscript('')
    setInterimTranscript('')
    setLiveEntities([])
    setElapsedSeconds(0)
    recordedChunksRef.current = []

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    const mimeType = getAudioMimeType()
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }

    recorder.onstop = async () => {
      stopMediaTracks()

      const recordingMimeType = mimeType ?? 'audio/webm'
      const blob = new Blob(recordedChunksRef.current, { type: recordingMimeType })
      if (blob.size === 0) {
        setErrorMessage('No audio was captured. Please try again.')
        setRecordingState('idle')
        return
      }

      try {
        await uploadAndTranscribe(blob)
        setRecordingState('idle')
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to transcribe the recording.'
        setErrorMessage(message)
        setRecordingState('idle')
      }
    }

    recorder.start(500)
    startTimer()
    startSpeechRecognition()
    setRecordingState('recording')
  }

  const handleStart = async () => {
    if (recordingState === 'processing') return

    if (recordingState === 'paused') {
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state === 'paused') {
        recorder.resume()
        setRecordingState('recording')
        startTimer()
        startSpeechRecognition()
      }
      return
    }

    try {
      await startNewRecording()
    } catch {
      setErrorMessage('Microphone access failed. Please allow microphone permission and retry.')
      setRecordingState('idle')
      stopMediaTracks()
    }
  }

  const handlePause = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recordingState !== 'recording' || recorder.state !== 'recording') return

    recorder.pause()
    stopTimer()
    stopSpeechRecognition()
    setRecordingState('paused')
  }

  const handleStop = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    stopTimer()
    stopSpeechRecognition()
    setRecordingState('processing')
    recorder.stop()
  }

  const speakerLabel = (speaker: SpeakerRole): string => {
    return speaker === 'clinician' ? 'Doctor' : 'Patient'
  }

  const handleSaveTranscription = async () => {
    if (segments.length === 0 || isSaving) return

    const trimmedName = patientName.trim()
    if (!trimmedName) {
      setSaveError('Please add the patient name before saving.')
      return
    }

    setSaveError('')
    setIsSaving(true)

    try {
      const response = await fetch('/api/transcribe/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: trimmedName,
          transcript: segments,
        }),
      })

      const payload = (await response.json()) as SaveTranscriptionResponse & { error?: string }
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to save transcription')
      }

      setSavedVisitId(payload.visitId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save transcription'
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-[#e8dcc8] pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={handleStart}
            disabled={recordingState === 'processing'}
            className="bg-sky-500 text-white hover:bg-sky-400"
          >
            <Mic size={16} className="mr-2" />
            {recordingState === 'paused' ? 'Resume' : 'Start'}
          </Button>
          <Button
            type="button"
            onClick={handlePause}
            disabled={recordingState !== 'recording'}
            variant="ghost"
            className="bg-white/70 text-slate-700 hover:bg-white"
          >
            <Pause size={16} className="mr-2" />
            Pause
          </Button>
          <Button
            type="button"
            onClick={handleStop}
            disabled={recordingState !== 'recording' && recordingState !== 'paused'}
            variant="ghost"
            className="bg-white/70 text-slate-700 hover:bg-white"
          >
            <Square size={16} className="mr-2" />
            Stop
          </Button>

          <div className="ml-auto flex items-center gap-2 rounded-xl border border-[#e8dcc8] bg-white/45 px-3 py-2 text-sm font-medium text-slate-700">
            {recordingState === 'processing' ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    recordingState === 'recording' ? 'bg-red-500' : 'bg-slate-400'
                  }`}
                />
                {formatElapsed(elapsedSeconds)}
              </>
            )}
          </div>
        </div>
      </div>

      {(liveTranscript || interimTranscript) && (
        <div className="border-b border-[#e8dcc8] pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Live Transcript
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {liveTranscript}
            {interimTranscript && (
              <span className="italic text-slate-500">{`${interimTranscript} `}</span>
            )}
          </p>

          {liveEntities.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Live ML Signals
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {liveEntities.map((entity) => (
                  <span
                    key={`${entity.kind}-${entity.name}`}
                    className="inline-flex items-center rounded-full bg-[#f1e4cc] px-2.5 py-1 text-xs font-medium text-[#59431f]"
                  >
                    <span className="mr-1">{entity.emoji}</span>
                    {entity.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="border-b border-[#e8dcc8] pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Save Transcription
        </p>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Patient name"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 md:flex-1"
          />
          <Button
            type="button"
            onClick={handleSaveTranscription}
            disabled={segments.length === 0 || isSaving}
            className="bg-sky-500 text-white hover:bg-sky-400"
          >
            {isSaving ? 'Saving...' : 'Save transcription'}
          </Button>
        </div>

        {saveError && <p className="mt-3 text-sm text-red-700">{saveError}</p>}
        {savedVisitId && (
          <div className="mt-3 text-sm text-emerald-700">
            Saved successfully.{' '}
            <Link href={`/soap-notes/${savedVisitId}`} className="font-semibold underline">
              Open this patient in SOAP Notes
            </Link>
            .
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Transcript
        </p>

        {segments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            Record and stop to generate transcript. Speaker labels will appear as Doctor and
            Patient.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {segments.map((segment, index) => (
              <div
                key={`${segment.start_ms}-${index}`}
                className={`border-l-4 py-2 pl-3 pr-2 ${
                  segment.speaker === 'clinician'
                    ? 'border-sky-300 bg-sky-50/55'
                    : 'border-emerald-300 bg-emerald-50/55'
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                  <span>{speakerLabel(segment.speaker)}</span>
                  <span className="text-slate-400">
                    {formatTimestamp(segment.start_ms)} - {formatTimestamp(segment.end_ms)}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-800">{segment.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
