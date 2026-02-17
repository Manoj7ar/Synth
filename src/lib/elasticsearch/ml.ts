import { esClient } from './client'

const MEDICAL_KEYWORDS = {
  medications: [
    'aspirin', 'ibuprofen', 'acetaminophen', 'tylenol', 'advil',
    'lisinopril', 'metformin', 'atorvastatin', 'amlodipine', 'simvastatin',
    'omeprazole', 'albuterol', 'levothyroxine', 'losartan', 'gabapentin',
    'metoprolol', 'hydrochlorothiazide', 'sertraline', 'montelukast'
  ],
  symptoms: [
    'pain', 'headache', 'fever', 'cough', 'fatigue', 'nausea',
    'dizziness', 'shortness of breath', 'chest pain', 'abdominal pain',
    'back pain', 'sore throat', 'runny nose', 'congestion',
    'vomiting', 'diarrhea', 'constipation', 'insomnia', 'anxiety'
  ],
  procedures: [
    'x-ray', 'blood test', 'mri', 'ct scan', 'ultrasound',
    'physical exam', 'vaccination', 'vaccine', 'surgery', 'biopsy',
    'ecg', 'ekg', 'colonoscopy', 'endoscopy'
  ],
  vitals: [
    'blood pressure', 'heart rate', 'temperature', 'weight',
    'bmi', 'pulse', 'respiratory rate', 'oxygen saturation'
  ]
}

const RED_FLAG_SYMPTOMS = [
  'chest pain', 'trouble breathing', 'difficulty breathing',
  'severe headache', 'suicidal', 'allergic reaction',
  'severe bleeding', 'stroke', 'heart attack'
]

export interface ExtractedEntities {
  medications: Array<{
    name: string
    dosage?: string
    frequency?: string
    purpose?: string
    confidence: number
    position: { start: number; end: number }
  }>
  symptoms: Array<{
    name: string
    severity?: string
    duration?: string
    confidence: number
    position: { start: number; end: number }
  }>
  procedures: Array<{
    name: string
    timing?: string
    confidence: number
    position: { start: number; end: number }
  }>
  vitals: Array<{
    type: string
    value: string
    confidence: number
    position: { start: number; end: number }
  }>
  red_flags: string[]
}

export async function extractMedicalEntities(text: string): Promise<ExtractedEntities> {
  const textLower = text.toLowerCase()
  const entities: ExtractedEntities = {
    medications: [],
    symptoms: [],
    procedures: [],
    vitals: [],
    red_flags: []
  }

  for (const med of MEDICAL_KEYWORDS.medications) {
    const regex = new RegExp(`\\b${med}\\b`, 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      const context = extractContext(text, match.index, 50)
      const dosageMatch = context.match(/(\d+)\s*(mg|mcg|g|ml)/i)
      const frequencyMatch = context.match(/(once|twice|three times|daily|weekly|hourly|every \d+ hours)/i)
      
      entities.medications.push({
        name: med,
        dosage: dosageMatch ? dosageMatch[0] : undefined,
        frequency: frequencyMatch ? frequencyMatch[0] : undefined,
        confidence: 0.9,
        position: { start: match.index, end: match.index + med.length }
      })
    }
  }

  for (const symptom of MEDICAL_KEYWORDS.symptoms) {
    const regex = new RegExp(`\\b${symptom}\\b`, 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      const context = extractContext(text, match.index, 30)
      const severityMatch = context.match(/(mild|moderate|severe|extreme)/i)
      const durationMatch = context.match(/(\d+)\s*(days?|weeks?|months?|years?)/i)
      
      entities.symptoms.push({
        name: symptom,
        severity: severityMatch ? severityMatch[0] : undefined,
        duration: durationMatch ? durationMatch[0] : undefined,
        confidence: 0.85,
        position: { start: match.index, end: match.index + symptom.length }
      })
    }
  }

  for (const proc of MEDICAL_KEYWORDS.procedures) {
    const regex = new RegExp(`\\b${proc}\\b`, 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      const context = extractContext(text, match.index, 40)
      const timingMatch = context.match(/(today|tomorrow|next week|in \d+ (days?|weeks?|months?))/i)
      
      entities.procedures.push({
        name: proc,
        timing: timingMatch ? timingMatch[0] : undefined,
        confidence: 0.9,
        position: { start: match.index, end: match.index + proc.length }
      })
    }
  }

  const bpRegex = /(?:blood pressure|bp|b\.p\.)\s*:?\s*(\d{2,3}\/\d{2,3})/gi
  let bpMatch
  while ((bpMatch = bpRegex.exec(textLower)) !== null) {
    entities.vitals.push({
      type: 'blood_pressure',
      value: bpMatch[1],
      confidence: 0.95,
      position: { start: bpMatch.index, end: bpMatch.index + bpMatch[0].length }
    })
  }

  const hrRegex = /(?:heart rate|hr|pulse)\s*:?\s*(\d{2,3})\s*(?:bpm)?/gi
  let hrMatch
  while ((hrMatch = hrRegex.exec(textLower)) !== null) {
    entities.vitals.push({
      type: 'heart_rate',
      value: hrMatch[1],
      confidence: 0.95,
      position: { start: hrMatch.index, end: hrMatch.index + hrMatch[0].length }
    })
  }

  const tempRegex = /(?:temperature|temp)\s*:?\s*(\d{2,3}\.?\d?)\s*(?:°?[fc])?/gi
  let tempMatch
  while ((tempMatch = tempRegex.exec(textLower)) !== null) {
    entities.vitals.push({
      type: 'temperature',
      value: tempMatch[1],
      confidence: 0.9,
      position: { start: tempMatch.index, end: tempMatch.index + tempMatch[0].length }
    })
  }

  for (const redFlag of RED_FLAG_SYMPTOMS) {
    if (textLower.includes(redFlag)) {
      entities.red_flags.push(redFlag)
    }
  }

  return entities
}

function extractContext(text: string, position: number, radius: number): string {
  const start = Math.max(0, position - radius)
  const end = Math.min(text.length, position + radius)
  return text.substring(start, end)
}

export async function setupMedicalNERPipeline() {
  const pipelineName = 'medical_ner_pipeline'
  
  try {
    await esClient.ingest.putPipeline({
      id: pipelineName,
      description: 'Extract medical entities from transcript text',
      processors: [
          {
            script: {
              lang: 'painless',
              source: `
                def text = ctx.text.toLowerCase();
                def medications = [];
                def symptoms = [];
                def procedures = [];
                
                def medPatterns = params.medications;
                for (med in medPatterns) {
                  if (text.contains(med)) {
                    medications.add([
                      'name': med,
                      'confidence': 0.9
                    ]);
                  }
                }
                
                def symptomPatterns = params.symptoms;
                for (symptom in symptomPatterns) {
                  if (text.contains(symptom)) {
                    symptoms.add([
                      'name': symptom,
                      'confidence': 0.85
                    ]);
                  }
                }
                
                def procPatterns = params.procedures;
                for (proc in procPatterns) {
                  if (text.contains(proc)) {
                    procedures.add([
                      'name': proc,
                      'confidence': 0.9
                    ]);
                  }
                }
                
                ctx.ml_entities = [
                  'medications': medications,
                  'symptoms': symptoms,
                  'procedures': procedures
                ];
              `,
              params: {
                medications: MEDICAL_KEYWORDS.medications.slice(0, 10),
                symptoms: MEDICAL_KEYWORDS.symptoms.slice(0, 10),
                procedures: MEDICAL_KEYWORDS.procedures.slice(0, 10)
              }
            }
          }
        ]
    })
    
    console.log(`Created ML NER pipeline: ${pipelineName}`)
    return pipelineName
  } catch (error) {
    console.error('Error setting up NER pipeline:', error)
    throw error
  }
}

export async function indexTranscriptChunkWithML(chunk: {
  visit_id: string
  patient_id: string
  chunk_id: string
  speaker: string
  start_ms: number
  end_ms: number
  text: string
  revision: number
}) {
  const entities = await extractMedicalEntities(chunk.text)
  
  await esClient.index({
    index: 'synth_transcript_chunks',
    id: chunk.chunk_id,
    document: {
      ...chunk,
      ml_entities: {
        medications: entities.medications.map(m => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          confidence: m.confidence
        })),
        symptoms: entities.symptoms.map(s => ({
          name: s.name,
          severity: s.severity,
          duration: s.duration,
          confidence: s.confidence
        })),
        procedures: entities.procedures.map(p => ({
          name: p.name,
          timing: p.timing,
          confidence: p.confidence
        })),
        vitals: entities.vitals.map(v => ({
          type: v.type,
          value: v.value,
          confidence: v.confidence
        }))
      },
      created_at: new Date().toISOString()
    }
  })
  
  return entities
}
