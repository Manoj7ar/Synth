export interface User {
  id: string
  email: string
  name?: string
  role: 'clinician' | 'patient'
}

export interface Patient {
  id: string
  displayName: string
  dateOfBirth?: Date
}

export interface Visit {
  id: string
  patientId: string
  clinicianId: string
  status: 'draft' | 'finalized'
  chiefComplaint?: string
  startedAt: Date
  finalizedAt?: Date
  patient?: Patient
}

export interface TranscriptChunk {
  chunk_id: string
  speaker: 'clinician' | 'patient'
  start_ms: number
  end_ms: number
  text: string
  ml_entities?: {
    medications?: Array<{
      name: string
      dosage?: string
      frequency?: string
      confidence: number
    }>
    symptoms?: Array<{
      name: string
      severity?: string
      confidence: number
    }>
    procedures?: Array<{
      name: string
      confidence: number
    }>
    vitals?: Array<{
      type: string
      value: string
      confidence: number
    }>
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  visualization?: ChatVisualization
  sourceDetails?: ChatSourceDetail[]
  citations?: Array<{
    source: string
    timestamp?: string
    excerpt: string
  }>
}

export interface ChatVisualizationPoint {
  label: string
  visitDate: string
  systolic: number
  diastolic: number
}

export interface ChatVisualization {
  type: 'bp_trend'
  title: string
  description?: string
  data: ChatVisualizationPoint[]
}

export interface ChatSourceDetail {
  source: string
  visitDate?: string
  timestamp?: string
  excerpt: string
}

export interface ToolEvent {
  type: 'tool_call' | 'tool_result' | 'reasoning'
  tool?: string
  params?: unknown
  result?: unknown
  reasoning?: string
}

export interface Analytics {
  totalVisits: number
  topMedications: Array<{ name: string; count: number }>
  topSymptoms: Array<{ name: string; count: number }>
  visitsOverTime: Array<{ date: string; count: number }>
}
