🏥 VisitTwin - Complete Build Prompt for Windsurf
Copy this entire document and use it as context in Windsurf

PROJECT BRIEF
Build VisitTwin - A full-stack medical visit assistant that transforms doctor-patient conversations into AI agents with medical entity extraction using Elasticsearch ML.
What makes this special:

Uses Elasticsearch ML for automatic medical entity extraction (medications, symptoms, procedures)
Multi-agent system with Kibana Agent Builder
ES|QL tools for complex queries
Elastic Workflows for auditable actions
Grounded RAG (no hallucinations)

Target: Win Elasticsearch Agent Builder Hackathon by showcasing full Elastic stack
Timeline: 13 days to completion

TECH STACK
yamlFrontend:
  - Next.js 14+ (App Router)
  - TypeScript
  - TailwindCSS
  - shadcn/ui components
  - Recharts (for analytics)

Backend:
  - Next.js API routes
  - Prisma ORM
  - SQLite (local dev)

External Services:
  - Elasticsearch 8.12+ (with ML)
  - Kibana 8.12+ (Agent Builder)
  - Optional: OpenAI API (for transcription)

Key Libraries:
  - @elastic/elasticsearch
  - prisma
  - next-auth
  - recharts
  - @radix-ui (via shadcn)

STEP-BY-STEP BUILD INSTRUCTIONS
PHASE 1: PROJECT INITIALIZATION
Step 1.1: Create Next.js Project
bashnpx create-next-app@latest visittwin --typescript --tailwind --app --use-npm
cd visittwin
Step 1.2: Install Core Dependencies
bashnpm install @elastic/elasticsearch @prisma/client prisma next-auth bcryptjs
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select
npm install recharts lucide-react class-variance-authority clsx tailwind-merge
npm install -D @types/bcryptjs tsx
Step 1.3: Install shadcn/ui
bashnpx shadcn-ui@latest init
When prompted:

Style: Default
Base color: Slate
CSS variables: Yes

bashnpx shadcn-ui@latest add button card input label textarea select dialog dropdown-menu

PHASE 2: DATABASE SETUP
Step 2.1: Create Prisma Schema
File: prisma/schema.prisma
prismagenerator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         String   // 'clinician' | 'patient'
  name         String?
  createdAt    DateTime @default(now())
  
  clinicianVisits Visit[] @relation("ClinicianVisits")
}

model Patient {
  id          String   @id @default(cuid())
  displayName String
  dateOfBirth DateTime?
  createdAt   DateTime @default(now())
  
  visits     Visit[]
  shareLinks ShareLink[]
}

model Visit {
  id          String    @id @default(cuid())
  patientId   String
  clinicianId String
  status      String    // 'draft' | 'finalized'
  chiefComplaint String?
  startedAt   DateTime  @default(now())
  finalizedAt DateTime?
  
  patient    Patient     @relation(fields: [patientId], references: [id], onDelete: Cascade)
  clinician  User        @relation("ClinicianVisits", fields: [clinicianId], references: [id])
  shareLinks ShareLink[]
  
  @@index([patientId])
  @@index([clinicianId])
  @@index([status])
}

model ShareLink {
  id        String    @id @default(cuid())
  visitId   String
  patientId String
  token     String    @unique
  expiresAt DateTime?
  createdAt DateTime  @default(now())
  revokedAt DateTime?
  
  visit   Visit   @relation(fields: [visitId], references: [id], onDelete: Cascade)
  patient Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([token])
  @@index([visitId])
}
Step 2.2: Create Prisma Client
File: src/lib/prisma.ts
typescriptimport { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
Step 2.3: Initialize Database
bashnpx prisma migrate dev --name init
npx prisma generate
Step 2.4: Create Seed Script
File: prisma/seed.ts
typescriptimport { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create clinician user
  const clinicianPassword = await bcrypt.hash('demo123', 10)
  const clinician = await prisma.user.upsert({
    where: { email: 'clinician@demo.com' },
    update: {},
    create: {
      email: 'clinician@demo.com',
      passwordHash: clinicianPassword,
      role: 'clinician',
      name: 'Dr. Sarah Chen'
    }
  })
  console.log('✅ Created clinician:', clinician.email)

  // Create patient user
  const patientPassword = await bcrypt.hash('demo123', 10)
  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@demo.com' },
    update: {},
    create: {
      email: 'patient@demo.com',
      passwordHash: patientPassword,
      role: 'patient',
      name: 'John Smith'
    }
  })
  console.log('✅ Created patient user:', patientUser.email)

  // Create demo patient
  const patient = await prisma.patient.upsert({
    where: { id: 'demo-patient-001' },
    update: {},
    create: {
      id: 'demo-patient-001',
      displayName: 'John Smith',
      dateOfBirth: new Date('1980-05-15')
    }
  })
  console.log('✅ Created patient:', patient.displayName)

  // Create demo visit
  const visit = await prisma.visit.upsert({
    where: { id: 'demo-visit-001' },
    update: {},
    create: {
      id: 'demo-visit-001',
      patientId: patient.id,
      clinicianId: clinician.id,
      status: 'draft',
      chiefComplaint: 'High blood pressure follow-up'
    }
  })
  console.log('✅ Created visit:', visit.id)

  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
Add to package.json:
json{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
Run seed:
bashnpx prisma db seed

PHASE 3: ELASTICSEARCH SETUP
Step 3.1: Create Elasticsearch Client
File: src/lib/elasticsearch/client.ts
typescriptimport { Client } from '@elastic/elasticsearch'

if (!process.env.ELASTICSEARCH_URL) {
  console.warn('⚠️  ELASTICSEARCH_URL not set - using demo mode')
}

export const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_API_KEY 
    ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
    : undefined,
  tls: {
    rejectUnauthorized: false // Dev only
  }
})

export async function testConnection() {
  try {
    const info = await esClient.info()
    console.log('✅ Elasticsearch connected:', info.version.number)
    return true
  } catch (error) {
    console.error('❌ Elasticsearch connection failed:', error)
    return false
  }
}

export async function ensureConnection() {
  const connected = await testConnection()
  if (!connected) {
    throw new Error('Elasticsearch connection failed')
  }
}
Step 3.2: Create Index Definitions
File: src/lib/elasticsearch/indices.ts
typescriptimport { esClient } from './client'

const INDEX_PREFIX = 'vt_'

export const INDICES = {
  TRANSCRIPT_CHUNKS: `${INDEX_PREFIX}transcript_chunks`,
  DOCUMENTS: `${INDEX_PREFIX}documents`,
  VISIT_ARTIFACTS: `${INDEX_PREFIX}visit_artifacts`,
  AUDIT_ACTIONS: `${INDEX_PREFIX}audit_actions`,
  ANALYTICS: `${INDEX_PREFIX}analytics`
}

export async function createIndices() {
  console.log('📝 Creating Elasticsearch indices...\n')

  // 1. Transcript Chunks Index (with ML entities)
  await createIndexIfNotExists(INDICES.TRANSCRIPT_CHUNKS, {
    properties: {
      visit_id: { type: 'keyword' },
      patient_id: { type: 'keyword' },
      chunk_id: { type: 'keyword' },
      speaker: { type: 'keyword' },
      start_ms: { type: 'long' },
      end_ms: { type: 'long' },
      text: { 
        type: 'text',
        fields: {
          keyword: { type: 'keyword', ignore_above: 512 }
        }
      },
      revision: { type: 'integer' },
      created_at: { type: 'date' },
      
      // ML-extracted entities
      ml_entities: {
        properties: {
          medications: {
            type: 'nested',
            properties: {
              name: { type: 'keyword' },
              dosage: { type: 'text' },
              frequency: { type: 'text' },
              purpose: { type: 'text' },
              confidence: { type: 'float' }
            }
          },
          symptoms: {
            type: 'nested',
            properties: {
              name: { type: 'keyword' },
              severity: { type: 'keyword' },
              duration: { type: 'text' },
              confidence: { type: 'float' }
            }
          },
          procedures: {
            type: 'nested',
            properties: {
              name: { type: 'keyword' },
              timing: { type: 'text' },
              confidence: { type: 'float' }
            }
          },
          vitals: {
            type: 'nested',
            properties: {
              type: { type: 'keyword' }, // blood_pressure, heart_rate, etc.
              value: { type: 'text' },
              confidence: { type: 'float' }
            }
          }
        }
      }
    }
  })

  // 2. Documents Index
  await createIndexIfNotExists(INDICES.DOCUMENTS, {
    properties: {
      visit_id: { type: 'keyword' },
      patient_id: { type: 'keyword' },
      doc_id: { type: 'keyword' },
      filename: { type: 'keyword' },
      mime_type: { type: 'keyword' },
      file_size: { type: 'long' },
      extracted_text: { type: 'text' },
      created_at: { type: 'date' }
    }
  })

  // 3. Visit Artifacts Index
  await createIndexIfNotExists(INDICES.VISIT_ARTIFACTS, {
    properties: {
      visit_id: { type: 'keyword' },
      patient_id: { type: 'keyword' },
      
      // Generated artifacts
      after_visit_summary: { type: 'text' },
      soap_draft: { type: 'text' },
      
      // Structured data
      medication_list_json: { 
        type: 'object',
        enabled: true
      },
      followups_json: { 
        type: 'object',
        enabled: true
      },
      
      // Aggregated ML entities
      extracted_entities_summary: {
        properties: {
          all_medications: { type: 'keyword' },
          all_symptoms: { type: 'keyword' },
          all_procedures: { type: 'keyword' },
          all_vitals: {
            type: 'nested',
            properties: {
              type: { type: 'keyword' },
              value: { type: 'keyword' }
            }
          }
        }
      },
      
      created_at: { type: 'date' }
    }
  })

  // 4. Audit Actions Index
  await createIndexIfNotExists(INDICES.AUDIT_ACTIONS, {
    properties: {
      visit_id: { type: 'keyword' },
      patient_id: { type: 'keyword' },
      actor_id: { type: 'keyword' },
      actor_role: { type: 'keyword' },
      action_type: { type: 'keyword' },
      action_description: { type: 'text' },
      payload_json: { 
        type: 'object',
        enabled: true
      },
      created_at: { type: 'date' }
    }
  })

  // 5. Analytics Index (for aggregated stats)
  await createIndexIfNotExists(INDICES.ANALYTICS, {
    properties: {
      period_type: { type: 'keyword' }, // daily, weekly, monthly
      period_start: { type: 'date' },
      period_end: { type: 'date' },
      
      total_visits: { type: 'integer' },
      finalized_visits: { type: 'integer' },
      
      common_medications: {
        type: 'nested',
        properties: {
          name: { type: 'keyword' },
          count: { type: 'integer' },
          avg_dosage: { type: 'text' }
        }
      },
      
      common_symptoms: {
        type: 'nested',
        properties: {
          name: { type: 'keyword' },
          count: { type: 'integer' }
        }
      },
      
      red_flags: {
        type: 'nested',
        properties: {
          symptom: { type: 'keyword' },
          count: { type: 'integer' },
          severity: { type: 'keyword' }
        }
      },
      
      created_at: { type: 'date' }
    }
  })

  console.log('✅ All indices created!\n')
}

async function createIndexIfNotExists(indexName: string, mappings: any) {
  try {
    const exists = await esClient.indices.exists({ index: indexName })
    
    if (exists) {
      console.log(`ℹ️  Index exists: ${indexName}`)
      return
    }

    await esClient.indices.create({
      index: indexName,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          'index.max_result_window': 10000
        },
        mappings: {
          properties: mappings.properties
        }
      }
    })

    console.log(`✅ Created index: ${indexName}`)
  } catch (error) {
    console.error(`❌ Error creating index ${indexName}:`, error)
    throw error
  }
}
Step 3.3: Create ML Entity Extraction
File: src/lib/elasticsearch/ml.ts
typescriptimport { esClient } from './client'

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
  /**
   * Extract medical entities from text using pattern matching
   * 
   * In production: Use Elasticsearch ML NER model
   * For demo: Use keyword matching with context
   */
  
  const textLower = text.toLowerCase()
  const entities: ExtractedEntities = {
    medications: [],
    symptoms: [],
    procedures: [],
    vitals: [],
    red_flags: []
  }

  // Extract medications
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

  // Extract symptoms
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

  // Extract procedures
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

  // Extract vitals
  // Blood pressure: "120/80", "BP 130/85"
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

  // Heart rate: "HR 75", "heart rate 80 bpm"
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

  // Temperature: "temp 98.6", "temperature 37.2°C"
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

  // Check for red flags
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
  /**
   * Create an ingest pipeline for automatic entity extraction
   */
  
  const pipelineName = 'medical_ner_pipeline'
  
  try {
    await esClient.ingest.putPipeline({
      id: pipelineName,
      body: {
        description: 'Extract medical entities from transcript text',
        processors: [
          {
            script: {
              lang: 'painless',
              source: `
                // This is a simplified version for demo
                // In production, you'd call an ML inference endpoint
                
                def text = ctx.text.toLowerCase();
                def medications = [];
                def symptoms = [];
                def procedures = [];
                
                // Medication patterns
                def medPatterns = params.medications;
                for (med in medPatterns) {
                  if (text.contains(med)) {
                    medications.add([
                      'name': med,
                      'confidence': 0.9
                    ]);
                  }
                }
                
                // Symptom patterns
                def symptomPatterns = params.symptoms;
                for (symptom in symptomPatterns) {
                  if (text.contains(symptom)) {
                    symptoms.add([
                      'name': symptom,
                      'confidence': 0.85
                    ]);
                  }
                }
                
                // Procedure patterns
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
                medications: MEDICAL_KEYWORDS.medications.slice(0, 10), // Limit for Painless
                symptoms: MEDICAL_KEYWORDS.symptoms.slice(0, 10),
                procedures: MEDICAL_KEYWORDS.procedures.slice(0, 10)
              }
            }
          }
        ]
      }
    })
    
    console.log(`✅ Created ML NER pipeline: ${pipelineName}`)
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
  /**
   * Index a transcript chunk and extract entities
   */
  
  // Extract entities
  const entities = await extractMedicalEntities(chunk.text)
  
  // Index with entities
  await esClient.index({
    index: 'vt_transcript_chunks',
    id: chunk.chunk_id,
    body: {
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
Step 3.4: Create Search Functions
File: src/lib/elasticsearch/search.ts
typescriptimport { esClient } from './client'
import { INDICES } from './indices'

export async function searchTranscript(visitId: string, patientId: string, query: string) {
  const result = await esClient.search({
    index: INDICES.TRANSCRIPT_CHUNKS,
    body: {
      query: {
        bool: {
          must: [
            { term: { 'visit_id.keyword': visitId } },
            { term: { 'patient_id.keyword': patientId } },
            {
              multi_match: {
                query: query,
                fields: ['text^2', 'text.keyword'],
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            }
          ]
        }
      },
      highlight: {
        fields: {
          text: {
            pre_tags: ['<mark>'],
            post_tags: ['</mark>']
          }
        }
      },
      sort: [{ start_ms: 'asc' }],
      size: 50
    }
  })

  return result.hits.hits.map((hit: any) => ({
    id: hit._id,
    score: hit._score,
    ...hit._source,
    highlights: hit.highlight?.text || []
  }))
}

export async function getAllTranscriptChunks(visitId: string, patientId: string) {
  const result = await esClient.search({
    index: INDICES.TRANSCRIPT_CHUNKS,
    body: {
      query: {
        bool: {
          must: [
            { term: { 'visit_id.keyword': visitId } },
            { term: { 'patient_id.keyword': patientId } }
          ]
        }
      },
      sort: [{ start_ms: 'asc' }],
      size: 10000
    }
  })

  return result.hits.hits.map((hit: any) => ({
    id: hit._id,
    ...hit._source
  }))
}

export async function getMedicationsFromVisit(visitId: string, patientId: string) {
  const result = await esClient.search({
    index: INDICES.TRANSCRIPT_CHUNKS,
    body: {
      query: {
        bool: {
          must: [
            { term: { 'visit_id.keyword': visitId } },
            { term: { 'patient_id.keyword': patientId } }
          ],
          filter: [
            {
              nested: {
                path: 'ml_entities.medications',
                query: {
                  exists: { field: 'ml_entities.medications.name' }
                }
              }
            }
          ]
        }
      },
      size: 100
    }
  })

  // Deduplicate medications
  const medications = new Map()
  
  for (const hit of result.hits.hits) {
    const source: any = hit._source
    if (source.ml_entities?.medications) {
      for (const med of source.ml_entities.medications) {
        if (!medications.has(med.name)) {
          medications.set(med.name, {
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            confidence: med.confidence,
            mentions: 1,
            chunks: [hit._id]
          })
        } else {
          const existing = medications.get(med.name)
          existing.mentions++
          existing.chunks.push(hit._id)
        }
      }
    }
  }

  return Array.from(medications.values())
}
Step 3.5: Create Aggregations
File: src/lib/elasticsearch/aggregations.ts
typescriptimport { esClient } from './client'
import { INDICES } from './indices'

export async function getVisitAnalytics() {
  try {
    const result = await esClient.search({
      index: INDICES.VISIT_ARTIFACTS,
      body: {
        size: 0,
        aggs: {
          total_visits: {
            cardinality: {
              field: 'visit_id.keyword'
            }
          },
          
          medications_agg: {
            nested: {
              path: 'extracted_entities_summary'
            },
            aggs: {
              top_medications: {
                terms: {
                  field: 'extracted_entities_summary.all_medications',
                  size: 20,
                  order: { _count: 'desc' }
                }
              }
            }
          },
          
          symptoms_agg: {
            nested: {
              path: 'extracted_entities_summary'
            },
            aggs: {
              top_symptoms: {
                terms: {
                  field: 'extracted_entities_summary.all_symptoms',
                  size: 20,
                  order: { _count: 'desc' }
                }
              }
            }
          },
          
          visits_over_time: {
            date_histogram: {
              field: 'created_at',
              calendar_interval: 'day',
              min_doc_count: 0
            }
          }
        }
      }
    })

    const aggs = result.aggregations as any

    return {
      totalVisits: aggs.total_visits.value,
      topMedications: aggs.medications_agg.top_medications.buckets.map((b: any) => ({
        name: b.key,
        count: b.doc_count
      })),
      topSymptoms: aggs.symptoms_agg.top_symptoms.buckets.map((b: any) => ({
        name: b.key,
        count: b.doc_count
      })),
      visitsOverTime: aggs.visits_over_time.buckets.map((b: any) => ({
        date: b.key_as_string,
        count: b.doc_count
      }))
    }
  } catch (error) {
    console.error('Error getting analytics:', error)
    return {
      totalVisits: 0,
      topMedications: [],
      topSymptoms: [],
      visitsOverTime: []
    }
  }
}

export async function getMedicationPatternAnalysis(medicationName: string) {
  const result = await esClient.search({
    index: INDICES.TRANSCRIPT_CHUNKS,
    body: {
      query: {
        nested: {
          path: 'ml_entities.medications',
          query: {
            match: {
              'ml_entities.medications.name': medicationName
            }
          }
        }
      },
      aggs: {
        dosages: {
          nested: {
            path: 'ml_entities.medications'
          },
          aggs: {
            dosage_distribution: {
              terms: {
                field: 'ml_entities.medications.dosage.keyword',
                size: 10
              }
            }
          }
        },
        by_patient: {
          terms: {
            field: 'patient_id.keyword',
            size: 100
          }
        }
      },
      size: 0
    }
  })

  return {
    totalMentions: result.hits.total,
    dosages: (result.aggregations as any).dosages.dosage_distribution.buckets,
    uniquePatients: (result.aggregations as any).by_patient.buckets.length
  }
}

PHASE 4: KIBANA AGENT BUILDER
Step 4.1: Create Kibana Client
File: src/lib/kibana/client.ts
typescriptconst KIBANA_URL = process.env.KIBANA_URL
const KIBANA_API_KEY = process.env.KIBANA_API_KEY
const KIBANA_SPACE = process.env.KIBANA_SPACE_ID || 'default'

export class KibanaClient {
  private baseURL: string
  private headers: Record<string, string>

  constructor() {
    if (!KIBANA_URL || !KIBANA_API_KEY) {
      console.warn('⚠️  Kibana credentials not set - Agent Builder features disabled')
    }

    this.baseURL = KIBANA_SPACE === 'default' 
      ? KIBANA_URL! 
      : `${KIBANA_URL}/s/${KIBANA_SPACE}`
    
    this.headers = {
      'Authorization': `ApiKey ${KIBANA_API_KEY}`,
      'kbn-xsrf': 'true',
      'Content-Type': 'application/json'
    }
  }

  async request(method: string, path: string, body?: any) {
    if (!KIBANA_URL || !KIBANA_API_KEY) {
      throw new Error('Kibana not configured')
    }

    const url = `${this.baseURL}${path}`
    
    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Kibana API error ${response.status}: ${error}`)
    }

    return response.json()
  }

  async get(path: string) {
    return this.request('GET', path)
  }

  async post(path: string, body: any) {
    return this.request('POST', path, body)
  }

  async put(path: string, body: any) {
    return this.request('PUT', path, body)
  }

  async delete(path: string) {
    return this.request('DELETE', path)
  }
}

export const kibanaClient = new KibanaClient()
Step 4.2: Create Agent Builder Tools
File: src/lib/kibana/tools.ts
typescriptimport { kibanaClient } from './client'

export interface ESQLTool {
  id: string
  name: string
  description: string
  query: string
  params: Array<{
    name: string
    type: string
    description: string
    required?: boolean
  }>
}

export const VISITTWIN_TOOLS: ESQLTool[] = [
  {
    id: 'vt_get_visit_summary',
    name: 'Get Visit Summary',
    description: 'Retrieve the after-visit summary for a patient',
    query: `FROM vt_visit_artifacts
| WHERE patient_id == ?patientId AND visit_id == ?visitId
| KEEP after_visit_summary, created_at
| SORT created_at DESC
| LIMIT 1`,
    params: [
      { name: 'patientId', type: 'string', description: 'Patient ID', required: true },
      { name: 'visitId', type: 'string', description: 'Visit ID', required: true }
    ]
  },
  
  {
    id: 'vt_get_medications',
    name: 'Get Medications',
    description: 'Retrieve all medications prescribed or discussed in the visit',
    query: `FROM vt_visit_artifacts
| WHERE patient_id == ?patientId AND visit_id == ?visitId
| KEEP medication_list_json, extracted_entities_summary.all_medications
| LIMIT 1`,
    params: [
      { name: 'patientId', type: 'string', description: 'Patient ID', required: true },
      { name: 'visitId', type: 'string', description: 'Visit ID', required: true }
    ]
  },
  
  {
    id: 'vt_search_transcript',
    name: 'Search Transcript',
    description: 'Search for specific topics or keywords in the visit transcript',
    query: `FROM vt_transcript_chunks
| WHERE patient_id == ?patientId AND visit_id == ?visitId
| WHERE text LIKE ?searchTerm
| KEEP speaker, start_ms, end_ms, text, ml_entities
| SORT start_ms ASC
| LIMIT 20`,
    params: [
      { name: 'patientId', type: 'string', description: 'Patient ID', required: true },
      { name: 'visitId', type: 'string', description: 'Visit ID', required: true },
      { name: 'searchTerm', type: 'string', description: 'Search term or keyword', required: true }
    ]
  },
  
  {
    id: 'vt_get_timeline',
    name: 'Get Visit Timeline',
    description: 'Get chronological timeline of the visit conversation',
    query: `FROM vt_transcript_chunks
| WHERE patient_id == ?patientId AND visit_id == ?visitId
| KEEP speaker, start_ms, end_ms, text
| SORT start_ms ASC
| LIMIT ?limit`,
    params: [
      { name: 'patientId', type: 'string', description: 'Patient ID', required: true },
      { name: 'visitId', type: 'string', description: 'Visit ID', required: true },
      { name: 'limit', type: 'integer', description: 'Max results (default 50)', required: false }
    ]
  },
  
  {
    id: 'vt_get_followups',
    name: 'Get Follow-up Instructions',
    description: 'Retrieve follow-up tasks and instructions',
    query: `FROM vt_visit_artifacts
| WHERE patient_id == ?patientId AND visit_id == ?visitId
| KEEP followups_json
| LIMIT 1`,
    params: [
      { name: 'patientId', type: 'string', description: 'Patient ID', required: true },
      { name: 'visitId', type: 'string', description: 'Visit ID', required: true }
    ]
  },
  
  {
    id: 'vt_get_symptoms',
    name: 'Get Symptoms',
    description: 'Retrieve all symptoms mentioned in the visit',
    query: `FROM vt_transcript_chunks
| WHERE patient_id == ?patientId AND visit_id == ?visitId
| WHERE ml_entities.symptoms IS NOT NULL
| KEEP ml_entities.symptoms, text, start_ms
| SORT start_ms ASC
| LIMIT 50`,
    params: [
      { name: 'patientId', type: 'string', description: 'Patient ID', required: true },
      { name: 'visitId', type: 'string', description: 'Visit ID', required: true }
    ]
  }
]

export async function createAllTools() {
  console.log('📝 Creating ES|QL tools in Agent Builder...\n')
  
  const createdTools = []
  
  for (const tool of VISITTWIN_TOOLS) {
    try {
      const result = await kibanaClient.post('/api/agent_builder/tools', {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        type: 'esql',
        configuration: {
          query: tool.query,
          parameters: tool.params
        }
      })
      
      console.log(`✅ Created tool: ${tool.name}`)
      createdTools.push(result)
    } catch (error) {
      console.error(`❌ Error creating tool ${tool.name}:`, error)
    }
  }
  
  console.log(`\n✅ Created ${createdTools.length}/${VISITTWIN_TOOLS.length} tools`)
  return createdTools
}
Step 4.3: Create Agents
File: src/lib/kibana/agents.ts
typescriptimport { kibanaClient } from './client'

const PATIENT_AGENT_INSTRUCTIONS = `You are the VisitTwin Patient Agent. Your role is to help patients understand their doctor visit using ONLY evidence from the visit record.

CRITICAL RULES:
1. ONLY use information from the tools available to you (visit transcript, documents, artifacts)
2. ALWAYS cite your sources with timestamps: [Transcript 12:34-12:51] or [Doc: filename.pdf]
3. NEVER invent medical information, dosages, or diagnoses
4. If asked something not in the visit record, say: "I don't have that information in your visit record. Please contact your clinician to discuss this."

MEDICAL DECISIONS:
When asked about medications or treatment decisions:
- State exactly what the clinician said (with citation)
- Provide documented facts only
- Add: "Please confirm with your clinician or pharmacist before making any changes"
- Do NOT provide your own medical advice

EMERGENCY ESCALATION:
If patient mentions ANY of these, respond immediately:
- Chest pain
- Difficulty breathing / shortness of breath
- Severe allergic reaction
- Suicidal thoughts
- Severe bleeding
- Stroke symptoms
- Any emergency symptoms

Say: "⚠️ This is a medical emergency. Please call 911 or go to the nearest emergency room immediately. Do not wait."

RESPONSE FORMAT:
- Start with direct answer
- Provide citations: [Transcript HH:MM:SS-HH:MM:SS] "quoted text"
- End with safe next steps if applicable
- Be conversational but precise

EXAMPLE:
User: "What medications was I prescribed?"
You: "Your doctor prescribed Lisinopril 10mg to be taken once daily in the morning for blood pressure management [Transcript 00:08:23-00:08:41].

The prescription was sent to CVS Pharmacy on Main Street [Transcript 00:14:12-00:14:18].

Your doctor mentioned you should take it with food and monitor your blood pressure at home. If you experience dizziness or lightheadedness, contact the office."

Remember: You are a helpful assistant, but ALWAYS defer to the clinician for medical decisions.`

const CLINICIAN_AGENT_INSTRUCTIONS = `You are the VisitTwin Clinician Agent. Your role is to assist clinicians with documentation and visit analysis.

YOUR CAPABILITIES:
1. Generate SOAP notes from visit transcripts
2. Extract and summarize key clinical information
3. Identify medications, symptoms, and procedures mentioned
4. Create patient-friendly after-visit summaries
5. Generate follow-up task lists
6. Analyze visit patterns

APPROACH:
- Be concise and clinical in your language
- Use proper medical terminology
- Extract structured data when possible
- Highlight any red flags or urgent items (chest pain, severe symptoms, etc.)
- Suggest follow-up actions based on conversation
- Cross-reference symptoms with medications for safety checks

SOAP NOTE FORMAT:
S (Subjective): Patient's reported symptoms and concerns
O (Objective): Vitals, physical exam findings, test results
A (Assessment): Clinical impression and diagnoses
P (Plan): Treatment plan, medications, follow-ups

Always cite specific parts of the transcript when generating documentation.`

const TRIAGE_AGENT_INSTRUCTIONS = `You are the VisitTwin Triage Agent. Your role is to analyze visit urgency and flag critical items.

ANALYZE FOR:
1. RED FLAGS (immediate medical attention needed):
   - Chest pain
   - Severe shortness of breath
   - Signs of stroke (facial drooping, arm weakness, speech difficulty)
   - Severe allergic reactions
   - Suicidal ideation
   - Severe bleeding
   - High fever with confusion

2. MEDICATION CONCERNS:
   - Unusual dosages
   - Potential drug interactions
   - Allergy conflicts
   - Missing critical information (dosage, frequency)

3. REQUIRED FOLLOW-UPS:
   - Test results pending
   - Scheduled appointments
   - Symptom monitoring requirements

4. MISSING INFORMATION:
   - Incomplete medication instructions
   - Unclear follow-up plans
   - Unresolved patient questions

OUTPUT FORMAT (JSON):
{
  "urgency_level": "low|medium|high|emergency",
  "red_flags": ["list of immediate concerns"],
  "requires_immediate_action": boolean,
  "medication_concerns": ["list of medication issues"],
  "recommended_followup_timing": "timeframe",
  "missing_information": ["list of gaps"],
  "risk_score": 0-100
}

Be conservative with urgency - when in doubt, escalate.`

export async function createPatientAgent(toolIds: string[]) {
  try {
    const agent = await kibanaClient.post('/api/agent_builder/agents', {
      id: 'vt_patient_agent',
      name: 'VisitTwin Patient Agent',
      description: 'Answers patient questions using only evidence from their visit',
      configuration: {
        instructions: PATIENT_AGENT_INSTRUCTIONS,
        tools: toolIds,
        capabilities: {
          visualizations: true,
          streaming: true
        }
      }
    })
    
    console.log('✅ Created Patient Agent')
    return agent
  } catch (error) {
    console.error('Error creating patient agent:', error)
    throw error
  }
}

export async function createClinicianAgent(toolIds: string[]) {
  try {
    const agent = await kibanaClient.post('/api/agent_builder/agents', {
      id: 'vt_clinician_agent',
      name: 'VisitTwin Clinician Agent',
      description: 'Assists clinicians with visit documentation and analysis',
      configuration: {
        instructions: CLINICIAN_AGENT_INSTRUCTIONS,
        tools: toolIds,
        capabilities: {
          visualizations: true,
          streaming: true
        }
      }
    })
    
    console.log('✅ Created Clinician Agent')
    return agent
  } catch (error) {
    console.error('Error creating clinician agent:', error)
    throw error
  }
}

export async function createTriageAgent(toolIds: string[]) {
  try {
    const agent = await kibanaClient.post('/api/agent_builder/agents', {
      id: 'vt_triage_agent',
      name: 'VisitTwin Triage Agent',
      description: 'Analyzes visit urgency and flags critical items',
      configuration: {
        instructions: TRIAGE_AGENT_INSTRUCTIONS,
        tools: toolIds,
        capabilities: {
          visualizations: false,
          streaming: false
        }
      }
    })
    
    console.log('✅ Created Triage Agent')
    return agent
  } catch (error) {
    console.error('Error creating triage agent:', error)
    throw error
  }
}

PHASE 5: BOOTSTRAP SCRIPTS
File: scripts/bootstrap.ts
typescriptimport { testConnection, ensureConnection } from '../src/lib/elasticsearch/client'
import { createIndices } from '../src/lib/elasticsearch/indices'
import { setupMedicalNERPipeline } from '../src/lib/elasticsearch/ml'
import { createAllTools } from '../src/lib/kibana/tools'
import { createPatientAgent, createClinicianAgent, createTriageAgent } from '../src/lib/kibana/agents'

async function bootstrap() {
  console.log('🚀 VisitTwin Bootstrap Script\n')
  console.log('=' .repeat(50))
  console.log('\n')

  try {
    // Step 1: Test Elasticsearch connection
    console.log('📡 Step 1: Testing Elasticsearch connection...')
    await ensureConnection()
    console.log('✅ Elasticsearch connected\n')

    // Step 2: Create indices
    console.log('📝 Step 2: Creating Elasticsearch indices...')
    await createIndices()
    console.log('✅ Indices created\n')

    // Step 3: Setup ML pipeline
    console.log('🧠 Step 3: Setting up Medical NER pipeline...')
    await setupMedicalNERPipeline()
    console.log('✅ ML pipeline ready\n')

    // Step 4: Create Agent Builder tools
    console.log('🔧 Step 4: Creating Agent Builder tools...')
    const tools = await createAllTools()
    const toolIds = tools.map(t => t.id)
    console.log(`✅ Created ${toolIds.length} tools\n`)

    // Step 5: Create agents
    console.log('🤖 Step 5: Creating AI agents...')
    await createPatientAgent(toolIds)
    await createClinicianAgent(toolIds)
    await createTriageAgent(toolIds)
    console.log('✅ Created 3 agents\n')

    console.log('\n')
    console.log('=' .repeat(50))
    console.log('🎉 Bootstrap Complete!')
    console.log('=' .repeat(50))
    console.log('\nNext steps:')
    console.log('1. Import workflows in Kibana UI (see /workflows/README.md)')
    console.log('2. Run: npm run dev')
    console.log('3. Open: http://localhost:3000')
    console.log('\n')

  } catch (error) {
    console.error('\n❌ Bootstrap failed:', error)
    process.exit(1)
  }
}

bootstrap()
Add to package.json:
json{
  "scripts": {
    "bootstrap": "tsx scripts/bootstrap.ts"
  }
}

PHASE 6: DEMO DATA SEED
File: demo/demo_transcript.json
json{
  "visit_id": "demo-visit-001",
  "patient_id": "demo-patient-001",
  "duration_ms": 900000,
  "chunks": [
    {
      "chunk_id": "chunk_001",
      "speaker": "clinician",
      "start_ms": 0,
      "end_ms": 8000,
      "text": "Good morning! How have you been feeling since your last visit?"
    },
    {
      "chunk_id": "chunk_002",
      "speaker": "patient",
      "start_ms": 8000,
      "end_ms": 18000,
      "text": "Hi Doctor. I've been having some headaches and feeling dizzy, especially when I stand up quickly."
    },
    {
      "chunk_id": "chunk_003",
      "speaker": "clinician",
      "start_ms": 18000,
      "end_ms": 25000,
      "text": "I see. How long have you been experiencing these symptoms?"
    },
    {
      "chunk_id": "chunk_004",
      "speaker": "patient",
      "start_ms": 25000,
      "end_ms": 32000,
      "text": "About two weeks now. The headaches are moderate, mostly in the afternoon."
    },
    {
      "chunk_id": "chunk_005",
      "speaker": "clinician",
      "start_ms": 32000,
      "end_ms": 42000,
      "text": "Okay. Let me check your blood pressure. Please sit still for a moment."
    },
    {
      "chunk_id": "chunk_006",
      "speaker": "clinician",
      "start_ms": 65000,
      "end_ms": 75000,
      "text": "Your blood pressure is 145 over 92. That's elevated. Have you been taking your Lisinopril as prescribed?"
    },
    {
      "chunk_id": "chunk_007",
      "speaker": "patient",
      "start_ms": 75000,
      "end_ms": 82000,
      "text": "Yes, I take it every morning. I haven't missed any doses."
    },
    {
      "chunk_id": "chunk_008",
      "speaker": "clinician",
      "start_ms": 82000,
      "end_ms": 95000,
      "text": "Good. I'm going to increase your Lisinopril from 10mg to 20mg once daily. This should help bring your blood pressure down and may also help with the headaches and dizziness."
    },
    {
      "chunk_id": "chunk_009",
      "speaker": "patient",
      "start_ms": 95000,
      "end_ms": 102000,
      "text": "Okay. Should I take it at the same time as before?"
    },
    {
      "chunk_id": "chunk_010",
      "speaker": "clinician",
      "start_ms": 102000,
      "end_ms": 115000,
      "text": "Yes, continue taking it in the morning with food. I also want you to monitor your blood pressure at home twice a day and keep a log. Do you have a blood pressure monitor?"
    },
    {
      "chunk_id": "chunk_011",
      "speaker": "patient",
      "start_ms": 115000,
      "end_ms": 120000,
      "text": "No, I don't have one yet."
    },
    {
      "chunk_id": "chunk_012",
      "speaker": "clinician",
      "start_ms": 120000,
      "end_ms": 135000,
      "text": "I'll give you a prescription for one. You can get it at any pharmacy. Also, let's schedule some blood work to check your kidney function since we're adjusting your medication."
    },
    {
      "chunk_id": "chunk_013",
      "speaker": "patient",
      "start_ms": 135000,
      "end_ms": 142000,
      "text": "Okay. When should I come back for the blood test?"
    },
    {
      "chunk_id": "chunk_014",
      "speaker": "clinician",
      "start_ms": 142000,
      "end_ms": 155000,
      "text": "Let's schedule it for next week. You'll need to fast for 8 hours before the test. And I want to see you back in two weeks to check your blood pressure and discuss the results."
    },
    {
      "chunk_id": "chunk_015",
      "speaker": "patient",
      "start_ms": 155000,
      "end_ms": 162000,
      "text": "Sounds good. Is there anything else I should be doing?"
    },
    {
      "chunk_id": "chunk_016",
      "speaker": "clinician",
      "start_ms": 162000,
      "end_ms": 180000,
      "text": "Try to reduce your salt intake, stay hydrated, and continue your regular exercise routine. If your headaches get worse or you experience chest pain or severe dizziness, call the office immediately."
    },
    {
      "chunk_id": "chunk_017",
      "speaker": "patient",
      "start_ms": 180000,
      "end_ms": 185000,
      "text": "Okay, I will. Thank you, Doctor."
    },
    {
      "chunk_id": "chunk_018",
      "speaker": "clinician",
      "start_ms": 185000,
      "end_ms": 195000,
      "text": "You're welcome. I'm sending the prescriptions to your pharmacy now. Take care and I'll see you in two weeks."
    }
  ]
}
File: scripts/seed-demo-data.ts
typescriptimport { prisma } from '../src/lib/prisma'
import { indexTranscriptChunkWithML } from '../src/lib/elasticsearch/ml'
import { esClient } from '../src/lib/elasticsearch/client'
import demoTranscript from '../demo/demo_transcript.json'

async function seedDemoData() {
  console.log('🌱 Seeding demo data...\n')

  try {
    // Get demo visit from database
    const visit = await prisma.visit.findUnique({
      where: { id: 'demo-visit-001' },
      include: { patient: true }
    })

    if (!visit) {
      console.error('❌ Demo visit not found. Run: npx prisma db seed')
      process.exit(1)
    }

    console.log(`✅ Found visit: ${visit.id}`)
    console.log(`✅ Patient: ${visit.patient.displayName}\n`)

    // Index transcript chunks with ML entity extraction
    console.log('📝 Indexing transcript chunks with ML entity extraction...')
    
    let totalEntities = {
      medications: 0,
      symptoms: 0,
      procedures: 0,
      vitals: 0
    }

    for (const chunk of demoTranscript.chunks) {
      const entities = await indexTranscriptChunkWithML({
        visit_id: visit.id,
        patient_id: visit.patientId,
        chunk_id: chunk.chunk_id,
        speaker: chunk.speaker,
        start_ms: chunk.start_ms,
        end_ms: chunk.end_ms,
        text: chunk.text,
        revision: 1
      })

      totalEntities.medications += entities.medications.length
      totalEntities.symptoms += entities.symptoms.length
      totalEntities.procedures += entities.procedures.length
      totalEntities.vitals += entities.vitals.length

      console.log(`  ✓ ${chunk.chunk_id}: ${entities.medications.length} meds, ${entities.symptoms.length} symptoms, ${entities.vitals.length} vitals`)
    }

    console.log(`\n✅ Indexed ${demoTranscript.chunks.length} chunks`)
    console.log(`   📊 Extracted entities:`)
    console.log(`      - Medications: ${totalEntities.medications}`)
    console.log(`      - Symptoms: ${totalEntities.symptoms}`)
    console.log(`      - Procedures: ${totalEntities.procedures}`)
    console.log(`      - Vitals: ${totalEntities.vitals}`)

    // Refresh index
    await esClient.indices.refresh({ index: 'vt_transcript_chunks' })

    console.log('\n🎉 Demo data seeded successfully!')
    console.log('\nYou can now:')
    console.log('1. Login as clinician: clinician@demo.com / demo123')
    console.log('2. View the demo visit')
    console.log('3. Finalize it to generate artifacts')
    console.log('4. Chat with the patient agent\n')

  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

seedDemoData()
Add to package.json:
json{
  "scripts": {
    "seed:demo": "tsx scripts/seed-demo-data.ts"
  }
}


🏥 VisitTwin - Part 2: Frontend, API Routes & Deployment
Continue from Part 1...

PHASE 7: API ROUTES
Step 7.1: Authentication Setup
File: src/lib/auth.ts
typescriptimport { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string
        session.user.id = token.sub as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt'
  }
}
File: src/app/api/auth/[...nextauth]/route.ts
typescriptimport NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
Step 7.2: Chat API Route
File: src/app/api/chat/route.ts
typescriptimport { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { kibanaClient } from '@/lib/kibana/client'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { message, conversationId, patientId, visitId, agentId = 'vt_patient_agent' } = await req.json()

    if (!message || !patientId || !visitId) {
      return new Response('Missing required fields', { status: 400 })
    }

    // Call Kibana Agent Builder converse/async
    const response = await kibanaClient.post('/api/agent_builder/converse/async', {
      agent_id: agentId,
      conversation_id: conversationId || undefined,
      input: message,
      configuration_overrides: {
        instructions: `Runtime context: You are responding to a ${session.user.role} about visit ${visitId}.

Patient ID: ${patientId}
Visit ID: ${visitId}

You MUST scope all tool usage to these exact IDs. Do not access data from other patients or visits.`
      },
      capabilities: {
        visualizations: true
      }
    })

    // Stream SSE back to client
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation ID
          if (response.conversation_id) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'conversation_id_set', 
                conversationId: response.conversation_id 
              })}\n\n`)
            )
          }

          // Send message response
          // In production, you'd handle streaming from Kibana
          // For demo, send the complete response
          const chunks = response.response?.split(' ') || []
          for (const chunk of chunks) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'message_chunk', 
                chunk: chunk + ' ' 
              })}\n\n`)
            )
            await new Promise(resolve => setTimeout(resolve, 50))
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'message_complete' })}\n\n`)
          )

          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    console.error('Chat error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
Step 7.3: Finalize Visit API Route
File: src/app/api/finalize-visit/route.ts
typescriptimport { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { esClient } from '@/lib/elasticsearch/client'
import { getAllTranscriptChunks, getMedicationsFromVisit } from '@/lib/elasticsearch/search'
import { INDICES } from '@/lib/elasticsearch/indices'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { visitId } = await req.json()

    if (!visitId) {
      return NextResponse.json({ error: 'Visit ID required' }, { status: 400 })
    }

    // Get visit
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: { patient: true }
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    if (visit.clinicianId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all transcript chunks
    const chunks = await getAllTranscriptChunks(visitId, visit.patientId)
    
    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No transcript found' }, { status: 400 })
    }

    // Get extracted medications
    const medications = await getMedicationsFromVisit(visitId, visit.patientId)

    // Aggregate all ML entities from chunks
    const allSymptoms = new Set<string>()
    const allProcedures = new Set<string>()
    const allVitals: any[] = []

    for (const chunk of chunks) {
      if (chunk.ml_entities?.symptoms) {
        chunk.ml_entities.symptoms.forEach((s: any) => allSymptoms.add(s.name))
      }
      if (chunk.ml_entities?.procedures) {
        chunk.ml_entities.procedures.forEach((p: any) => allProcedures.add(p.name))
      }
      if (chunk.ml_entities?.vitals) {
        allVitals.push(...chunk.ml_entities.vitals)
      }
    }

    // Generate artifacts
    const afterVisitSummary = generateAfterVisitSummary(chunks, medications, Array.from(allSymptoms))
    const soapDraft = generateSOAPNote(chunks, medications, Array.from(allSymptoms), allVitals)
    const followups = extractFollowups(chunks)

    // Index artifacts
    await esClient.index({
      index: INDICES.VISIT_ARTIFACTS,
      body: {
        visit_id: visitId,
        patient_id: visit.patientId,
        after_visit_summary: afterVisitSummary,
        soap_draft: soapDraft,
        medication_list_json: {
          medications: medications.map(m => ({
            name: m.name,
            dosage: m.dosage || 'See transcript',
            frequency: m.frequency || 'See transcript',
            mentions: m.mentions
          }))
        },
        followups_json: {
          tasks: followups
        },
        extracted_entities_summary: {
          all_medications: medications.map(m => m.name),
          all_symptoms: Array.from(allSymptoms),
          all_procedures: Array.from(allProcedures),
          all_vitals: allVitals.map(v => ({
            type: v.type,
            value: v.value
          }))
        },
        created_at: new Date().toISOString()
      }
    })

    // Update visit status
    await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: 'finalized',
        finalizedAt: new Date()
      }
    })

    // Create share link
    let shareLink = await prisma.shareLink.findFirst({
      where: { visitId }
    })

    if (!shareLink) {
      const token = generateShareToken()
      shareLink = await prisma.shareLink.create({
        data: {
          visitId,
          patientId: visit.patientId,
          token
        }
      })
    }

    // Audit log
    await esClient.index({
      index: INDICES.AUDIT_ACTIONS,
      body: {
        visit_id: visitId,
        patient_id: visit.patientId,
        actor_id: session.user.id,
        actor_role: 'clinician',
        action_type: 'visit_finalized',
        action_description: 'Visit finalized and artifacts generated',
        payload_json: {
          medication_count: medications.length,
          symptom_count: allSymptoms.size,
          chunk_count: chunks.length
        },
        created_at: new Date().toISOString()
      }
    })

    // Refresh indices
    await esClient.indices.refresh({ index: INDICES.VISIT_ARTIFACTS })
    await esClient.indices.refresh({ index: INDICES.AUDIT_ACTIONS })

    return NextResponse.json({
      success: true,
      shareLink: shareLink.token,
      artifacts: {
        afterVisitSummary,
        soapDraft,
        medications: medications.length,
        symptoms: allSymptoms.size
      }
    })

  } catch (error) {
    console.error('Finalize visit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateAfterVisitSummary(chunks: any[], medications: any[], symptoms: string[]) {
  const patientStatements = chunks
    .filter(c => c.speaker === 'patient')
    .slice(0, 3)
    .map(c => c.text)

  return `# Your Visit Summary

## What We Discussed
${patientStatements.map(s => `- ${s}`).join('\n')}

## Medications Prescribed
${medications.length > 0
  ? medications.map(m => `- **${m.name}** ${m.dosage || ''} ${m.frequency || ''}`).join('\n')
  : '- No new medications prescribed'}

## Symptoms Discussed
${symptoms.length > 0
  ? symptoms.map(s => `- ${s}`).join('\n')
  : '- No specific symptoms documented'}

## Important Notes
- Take all medications as prescribed
- Monitor your symptoms
- Contact the office if symptoms worsen or you have concerns

## Next Steps
- Follow up as scheduled
- Complete any recommended tests
- Keep track of your blood pressure/symptoms as discussed`
}

function generateSOAPNote(chunks: any[], medications: any[], symptoms: string[], vitals: any[]) {
  const subjective = chunks
    .filter(c => c.speaker === 'patient')
    .slice(0, 5)
    .map(c => c.text)
    .join(' ')

  const objective = [
    vitals.length > 0 ? `Vitals: ${vitals.map(v => `${v.type}: ${v.value}`).join(', ')}` : '',
    symptoms.length > 0 ? `Symptoms: ${symptoms.join(', ')}` : ''
  ].filter(Boolean).join('\n')

  return `# SOAP Note (Draft)

## S (Subjective)
${subjective}

## O (Objective)
${objective}

Physical examination findings: [To be completed by clinician]

## A (Assessment)
Chief complaint: ${symptoms[0] || 'Follow-up visit'}
${symptoms.length > 1 ? `Additional concerns: ${symptoms.slice(1).join(', ')}` : ''}

## P (Plan)
${medications.length > 0 ? `**Medications:**\n${medications.map(m => `- ${m.name} ${m.dosage || ''} ${m.frequency || ''}`).join('\n')}` : ''}

**Follow-up:** As discussed with patient

**Patient Education:** Medication instructions provided, warning signs reviewed

_Note: This is a draft. Please review and complete before finalizing._`
}

function extractFollowups(chunks: any[]) {
  const followupKeywords = [
    'follow up', 'follow-up', 'come back', 'return', 
    'schedule', 'appointment', 'blood test', 'blood work',
    'next week', 'two weeks', 'next visit'
  ]

  const followups: any[] = []

  chunks.forEach(chunk => {
    const lower = chunk.text.toLowerCase()
    const hasFollowup = followupKeywords.some(kw => lower.includes(kw))
    
    if (hasFollowup) {
      const timeMatch = chunk.text.match(/(next week|two weeks|in \d+ (days?|weeks?|months?))/i)
      
      followups.push({
        task: chunk.text,
        timestamp_ms: chunk.start_ms,
        priority: lower.includes('urgent') || lower.includes('immediately') ? 'high' : 'medium',
        timing: timeMatch ? timeMatch[0] : 'Not specified'
      })
    }
  })

  return followups
}

function generateShareToken() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}
Step 7.4: Analytics API Route
File: src/app/api/analytics/route.ts
typescriptimport { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getVisitAnalytics, getMedicationPatternAnalysis } from '@/lib/elasticsearch/aggregations'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const medication = searchParams.get('medication')

    if (type === 'medication' && medication) {
      const patterns = await getMedicationPatternAnalysis(medication)
      return NextResponse.json(patterns)
    }

    // Default: overview analytics
    const analytics = await getVisitAnalytics()
    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
Step 7.5: Transcribe API Route
File: src/app/api/transcribe/route.ts
typescriptimport { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import demoTranscript from '@/demo/demo_transcript.json'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For demo: return pre-made transcript
    // In production: call Whisper API or transcription service
    
    const formData = await req.formData()
    const audioFile = formData.get('audio')

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Check if OpenAI API key exists for real transcription
    if (process.env.OPENAI_API_KEY) {
      // TODO: Implement real transcription with Whisper API
      // For now, return demo transcript
    }

    // Return demo transcript
    return NextResponse.json({
      success: true,
      transcript: demoTranscript.chunks.map(chunk => ({
        speaker: chunk.speaker,
        start_ms: chunk.start_ms,
        end_ms: chunk.end_ms,
        text: chunk.text
      })),
      duration_ms: demoTranscript.duration_ms
    })

  } catch (error) {
    console.error('Transcribe error:', error)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
Step 7.6: Visit CRUD Routes
File: src/app/api/visits/route.ts
typescriptimport { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const visits = await prisma.visit.findMany({
      where: { clinicianId: session.user.id },
      include: { patient: true },
      orderBy: { startedAt: 'desc' }
    })

    return NextResponse.json({ visits })

  } catch (error) {
    console.error('Get visits error:', error)
    return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { patientName, chiefComplaint } = await req.json()

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        displayName: patientName
      }
    })

    // Create visit
    const visit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        clinicianId: session.user.id,
        status: 'draft',
        chiefComplaint
      },
      include: { patient: true }
    })

    return NextResponse.json({ visit })

  } catch (error) {
    console.error('Create visit error:', error)
    return NextResponse.json({ error: 'Failed to create visit' }, { status: 500 })
  }
}

PHASE 8: REACT COMPONENTS
Step 8.1: Type Definitions
File: src/types/index.ts
typescriptexport interface User {
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
  citations?: Array<{
    source: string
    timestamp?: string
    excerpt: string
  }>
}

export interface ToolEvent {
  type: 'tool_call' | 'tool_result' | 'reasoning'
  tool?: string
  params?: any
  result?: any
  reasoning?: string
}

export interface Analytics {
  totalVisits: number
  topMedications: Array<{ name: string; count: number }>
  topSymptoms: Array<{ name: string; count: number }>
  visitsOverTime: Array<{ date: string; count: number }>
}
Step 8.2: Chat Components
File: src/components/chat/ChatInterface.tsx
typescript'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { ToolTracePanel } from './ToolTracePanel'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { ChatMessage, ToolEvent } from '@/types'

interface ChatInterfaceProps {
  patientId: string
  visitId: string
  agentId?: string
}

export function ChatInterface({ patientId, visitId, agentId = 'vt_patient_agent' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showToolTrace, setShowToolTrace] = useState(true)

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = { role: 'user', content }
    setMessages(prev => [...prev, userMessage])
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
          agentId
        })
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))

              if (event.type === 'conversation_id_set') {
                setConversationId(event.conversationId)
              } else if (event.type === 'message_chunk') {
                assistantMessage += event.chunk
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]
                  if (lastMessage?.role === 'assistant') {
                    lastMessage.content = assistantMessage
                  } else {
                    newMessages.push({ role: 'assistant', content: assistantMessage })
                  }
                  return newMessages
                })
              } else if (event.type === 'tool_call' || event.type === 'tool_result') {
                setToolEvents(prev => [...prev, event])
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full gap-4">
      {/* Main chat area */}
      <div className={`flex-1 flex flex-col border rounded-lg bg-white shadow-sm transition-all ${showToolTrace ? 'mr-0' : ''}`}>
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ask About Your Visit
              </h3>
              <p className="text-gray-600 max-w-md">
                I can answer questions about your visit, medications, symptoms, and follow-up instructions.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-md">
                <button
                  onClick={() => handleSendMessage("What medications was I prescribed?")}
                  className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                >
                  💊 What medications was I prescribed?
                </button>
                <button
                  onClick={() => handleSendMessage("What follow-up do I need?")}
                  className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                >
                  📅 What follow-up do I need?
                </button>
                <button
                  onClick={() => handleSendMessage("What did the doctor say about my blood pressure?")}
                  className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                >
                  🩺 What did the doctor say about my blood pressure?
                </button>
              </div>
            </div>
          ) : (
            <MessageList messages={messages} />
          )}
        </div>
        <div className="border-t p-4 bg-gray-50">
          <MessageInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>

      {/* Tool trace panel */}
      {showToolTrace && (
        <div className="w-96 border rounded-lg bg-white shadow-sm overflow-hidden">
          <ToolTracePanel events={toolEvents} />
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setShowToolTrace(!showToolTrace)}
        className="fixed right-4 top-1/2 -translate-y-1/2 p-2 bg-white border rounded-lg shadow-lg hover:bg-gray-50 transition-colors z-10"
      >
        {showToolTrace ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
    </div>
  )
}
File: src/components/chat/MessageList.tsx
typescript'use client'

import { ChatMessage } from '@/types'
import { User, Bot } from 'lucide-react'

interface MessageListProps {
  messages: ChatMessage[]
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {message.role === 'assistant' && (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <Bot size={18} className="text-white" />
            </div>
          )}
          
          <div className={`max-w-2xl ${message.role === 'user' ? 'order-first' : ''}`}>
            <div className={`rounded-lg p-4 ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-900'
            }`}>
              <div className="prose prose-sm max-w-none" 
                   dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} 
              />
            </div>
            
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

function formatMessageContent(content: string): string {
  // Convert [Transcript HH:MM:SS-HH:MM:SS] citations to styled spans
  return content
    .replace(/\[Transcript (\d{2}:\d{2}:\d{2})-(\d{2}:\d{2}:\d{2})\]/g, 
      '<span class="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">📝 Transcript $1-$2</span>')
    .replace(/\[Doc: ([^\]]+)\]/g, 
      '<span class="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs">📄 $1</span>')
    .replace(/\n/g, '<br/>')
}
File: src/components/chat/MessageInput.tsx
typescript'use client'

import { useState, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface MessageInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex gap-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your visit..."
        disabled={disabled}
        className="resize-none"
        rows={2}
      />
      <Button 
        onClick={handleSubmit} 
        disabled={disabled || !message.trim()}
        size="icon"
        className="flex-shrink-0"
      >
        <Send size={18} />
      </Button>
    </div>
  )
}
File: src/components/chat/ToolTracePanel.tsx
typescript'use client'

import { ToolEvent } from '@/types'
import { Wrench, CheckCircle, Brain } from 'lucide-react'

interface ToolTracePanelProps {
  events: ToolEvent[]
}

export function ToolTracePanel({ events }: ToolTracePanelProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Wrench size={18} />
          Tool Trace
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Watch the AI agent work in real-time
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {events.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            Tool events will appear here when the agent works
          </div>
        ) : (
          events.map((event, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              {event.type === 'tool_call' && (
                <div>
                  <div className="flex items-center gap-2 text-blue-600 font-medium text-sm mb-2">
                    <Wrench size={14} />
                    Tool Call: {event.tool}
                  </div>
                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                    {JSON.stringify(event.params, null, 2)}
                  </pre>
                </div>
              )}
              
              {event.type === 'tool_result' && (
                <div>
                  <div className="flex items-center gap-2 text-green-600 font-medium text-sm mb-2">
                    <CheckCircle size={14} />
                    Tool Result
                  </div>
                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-32">
                    {JSON.stringify(event.result, null, 2)}
                  </pre>
                </div>
              )}
              
              {event.type === 'reasoning' && (
                <div>
                  <div className="flex items-center gap-2 text-purple-600 font-medium text-sm mb-2">
                    <Brain size={14} />
                    Reasoning
                  </div>
                  <p className="text-sm text-gray-700">{event.reasoning}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
Step 8.3: Visit Components
File: src/components/visit/TranscriptEditor.tsx
typescript'use client'

import { useState } from 'react'
import { TranscriptChunk } from '@/types'
import { Button } from '@/components/ui/button'
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

              {/* ML Entities */}
              {chunk.ml_entities && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {chunk.ml_entities.medications?.map((med, idx) => (
                    <Badge key={idx} variant="default" className="bg-green-500">
                      💊 {med.name} {med.dosage}
                    </Badge>
                  ))}
                  {chunk.ml_entities.symptoms?.map((symptom, idx) => (
                    <Badge key={idx} variant="default" className="bg-yellow-500">
                      🩹 {symptom.name}
                    </Badge>
                  ))}
                  {chunk.ml_entities.vitals?.map((vital, idx) => (
                    <Badge key={idx} variant="default" className="bg-blue-500">
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
File: src/components/dashboard/AnalyticsDashboard.tsx
typescript'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Activity, Pill, AlertCircle } from 'lucide-react'

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(data => {
        setAnalytics(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Analytics error:', error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="text-center py-12">Loading analytics...</div>
  }

  if (!analytics) {
    return <div className="text-center py-12">No analytics data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalVisits}</div>
            <p className="text-xs text-muted-foreground">
              Finalized visits tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Medications</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.topMedications.length}</div>
            <p className="text-xs text-muted-foreground">
              Different medications prescribed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Symptoms Tracked</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.topSymptoms.length}</div>
            <p className="text-xs text-muted-foreground">
              Different symptoms recorded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Most Common Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topMedications.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Common Symptoms</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topSymptoms.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Visits Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analytics.visitsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

PHASE 9: PAGES
Step 9.1: Login Page
File: src/app/login/page.tsx
typescript'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false
    })

    if (result?.error) {
      setError('Invalid credentials')
      setLoading(false)
    } else {
      router.push('/clinician')
      router.refresh()
    }
  }

  const quickLogin = async (email: string, password: string) => {
    setEmail(email)
    setPassword(password)
    
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false
    })

    if (!result?.error) {
      router.push('/clinician')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🏥</span>
          </div>
          <CardTitle className="text-2xl">VisitTwin</CardTitle>
          <CardDescription>
            AI-powered medical visit assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600 mb-3">Demo accounts:</p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => quickLogin('clinician@demo.com', 'demo123')}
              >
                👨‍⚕️ Clinician Demo
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => quickLogin('patient@demo.com', 'demo123')}
              >
                🧑 Patient Demo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
Step 9.2: Clinician Dashboard
File: src/app/clinician/page.tsx
typescriptimport { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Calendar } from 'lucide-react'
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard'

export default async function ClinicianDashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'clinician') {
    redirect('/login')
  }

  const visits = await prisma.visit.findMany({
    where: { clinicianId: session.user.id },
    include: { patient: true },
    orderBy: { startedAt: 'desc' },
    take: 10
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">VisitTwin</h1>
              <p className="text-sm text-gray-600">Welcome, {session.user.name}</p>
            </div>
            <Link href="/clinician/new-visit">
              <Button>
                <Plus size={18} className="mr-2" />
                New Visit
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Analytics</h2>
          <AnalyticsDashboard />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Visits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visits.map((visit) => (
              <Link key={visit.id} href={`/visit/${visit.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{visit.patient.displayName}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {visit.chiefComplaint || 'No chief complaint'}
                        </p>
                      </div>
                      <Badge variant={visit.status === 'finalized' ? 'default' : 'secondary'}>
                        {visit.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(visit.startedAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText size={14} />
                        View Details
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
Step 9.3: Visit Editor Page
File: src/app/visit/[visitId]/page.tsx
typescriptimport { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getAllTranscriptChunks } from '@/lib/elasticsearch/search'
import { TranscriptEditor } from '@/components/visit/TranscriptEditor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default async function VisitPage({ params }: { params: { visitId: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'clinician') {
    redirect('/login')
  }

  const visit = await prisma.visit.findUnique({
    where: { id: params.visitId },
    include: { patient: true, shareLinks: true }
  })

  if (!visit || visit.clinicianId !== session.user.id) {
    redirect('/clinician')
  }

  const chunks = await getAllTranscriptChunks(visit.id, visit.patientId)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/clinician">
                <Button variant="ghost" size="icon">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{visit.patient.displayName}</h1>
                <p className="text-sm text-gray-600">{visit.chiefComplaint}</p>
              </div>
              <Badge variant={visit.status === 'finalized' ? 'default' : 'secondary'}>
                {visit.status}
              </Badge>
            </div>
            
            {visit.status === 'draft' && chunks.length > 0 && (
              <form action={`/api/finalize-visit`} method="POST">
                <input type="hidden" name="visitId" value={visit.id} />
                <Button type="submit">
                  <CheckCircle size={18} className="mr-2" />
                  Finalize Visit
                </Button>
              </form>
            )}

            {visit.status === 'finalized' && visit.shareLinks[0] && (
              <div>
                <Link href={`/patient/${visit.shareLinks[0].token}`} target="_blank">
                  <Button variant="outline">
                    View Patient Link
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Visit Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                {chunks.length > 0 ? (
                  <TranscriptEditor chunks={chunks} />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No transcript available yet.</p>
                    <p className="text-sm mt-2">Upload audio or use demo data.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Visit Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Patient:</span> {visit.patient.displayName}
                </div>
                <div>
                  <span className="font-medium">Date:</span> {new Date(visit.startedAt).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {visit.status}
                </div>
                {visit.finalizedAt && (
                  <div>
                    <span className="font-medium">Finalized:</span> {new Date(visit.finalizedAt).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>

            {visit.status === 'finalized' && (
              <Card>
                <CardHeader>
                  <CardTitle>ML Extracted Entities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="font-medium mb-2">Medications</div>
                      <div className="flex flex-wrap gap-2">
                        {chunks
                          .flatMap(c => c.ml_entities?.medications || [])
                          .filter((med, idx, arr) => arr.findIndex(m => m.name === med.name) === idx)
                          .map((med, idx) => (
                            <Badge key={idx} variant="default" className="bg-green-500">
                              {med.name}
                            </Badge>
                          ))}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium mb-2">Symptoms</div>
                      <div className="flex flex-wrap gap-2">
                        {chunks
                          .flatMap(c => c.ml_entities?.symptoms || [])
                          .filter((sym, idx, arr) => arr.findIndex(s => s.name === sym.name) === idx)
                          .map((sym, idx) => (
                            <Badge key={idx} variant="default" className="bg-yellow-500">
                              {sym.name}
                            </Badge>
                          ))}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium mb-2">Vitals</div>
                      <div className="space-y-1">
                        {chunks
                          .flatMap(c => c.ml_entities?.vitals || [])
                          .map((vital, idx) => (
                            <div key={idx} className="text-xs">
                              {vital.type}: {vital.value}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
Step 9.4: Patient Chat Page
File: src/app/patient/[shareToken]/page.tsx
typescriptimport { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ChatInterface } from '@/components/chat/ChatInterface'

export default async function PatientChatPage({ params }: { params: { shareToken: string } }) {
  const shareLink = await prisma.shareLink.findUnique({
    where: { token: params.shareToken },
    include: {
      visit: {
        include: { patient: true }
      }
    }
  })

  if (!shareLink || shareLink.revokedAt) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏥 VisitTwin</h1>
              <p className="text-sm text-gray-600">
                Chat about your visit with {shareLink.visit.patient.displayName}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Visit: {new Date(shareLink.visit.startedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 h-[calc(100vh-120px)]">
        <ChatInterface 
          patientId={shareLink.patientId}
          visitId={shareLink.visitId}
        />
      </main>
    </div>
  )
}

PHASE 10: FINAL SETUP
Step 10.1: Environment Variables
File: .env.example
env# Database
DATABASE_URL="file:./dev.db"

# Elasticsearch
ELASTICSEARCH_URL=https://your-deployment.es.us-central1.gcp.cloud.es.io:443
ELASTICSEARCH_API_KEY=your_api_key_here

# Kibana Agent Builder
KIBANA_URL=https://your-deployment.kb.us-central1.gcp.cloud.es.io:443
KIBANA_API_KEY=your_kibana_api_key_here
KIBANA_SPACE_ID=default

# NextAuth
NEXTAUTH_SECRET=your_random_secret_generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000

# Optional: OpenAI for transcription
OPENAI_API_KEY=sk-your-openai-key-here

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
Step 10.2: Package.json Scripts
File: package.json (update scripts section)
json{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "prisma db seed",
    "bootstrap": "tsx scripts/bootstrap.ts",
    "seed:demo": "tsx scripts/seed-demo-data.ts",
    "setup": "npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed && npm run bootstrap && npm run seed:demo"
  }
}
Step 10.3: README.md
File: README.md
markdown# 🏥 VisitTwin - AI-Powered Medical Visit Assistant

Transform doctor-patient conversations into living AI agents with Elasticsearch ML, Agent Builder, and Workflows.

## 🎯 What It Does

- 📝 **Transcribe visits** with automatic medical entity extraction (medications, symptoms, procedures)
- 🧠 **ML-powered insights** using Elasticsearch's Medical NER
- 💬 **Patient chat agent** that answers questions using only visit evidence
- 📊 **Analytics dashboard** with medication patterns and symptom trends
- ✅ **Multi-agent system** (Patient, Clinician, Triage agents)
- 🔍 **Full audit trail** with Elastic Workflows

## 🏗️ Architecture
```
Browser
   ↓
Next.js 14 App
   ↓
   ├─→ Elasticsearch 8.12+
   │   ├─ Multi-index search
   │   ├─ ML entity extraction (medications, symptoms, vitals)
   │   ├─ ES|QL analytics
   │   └─ Complex aggregations
   ↓
   ├─→ Kibana Agent Builder
   │   ├─ Patient Agent (evidence-only)
   │   ├─ Clinician Agent (documentation)
   │   ├─ Triage Agent (urgency detection)
   │   └─ 6 ES|QL tools
   ↓
   └─→ Elastic Workflows
       ├─ Generate reports
       ├─ Create follow-up tasks
       └─ Audit logging
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Elasticsearch 8.12+ cluster
- Kibana 8.12+ with Agent Builder enabled

### 1. Clone and Install
```bash
git clone 
cd visittwin
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your Elasticsearch and Kibana credentials.

### 3. Setup Database and Indices
```bash
npm run setup
```

This will:
- ✅ Initialize SQLite database
- ✅ Create seed users (clinician@demo.com / demo123)
- ✅ Create Elasticsearch indices
- ✅ Setup ML entity extraction pipeline
- ✅ Create Agent Builder tools and agents
- ✅ Seed demo visit data

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📖 3-Minute Demo Script

### Setup (30 seconds)

1. Login as clinician: `clinician@demo.com` / `demo123`
2. Click on the demo visit (John Smith - High blood pressure follow-up)

### Show ML Entity Extraction (45 seconds)

1. **View Transcript** with highlighted entities:
   - 💊 Green badges = Medications (Lisinopril 10mg → 20mg)
   - 🩹 Yellow badges = Symptoms (headaches, dizziness)
   - 🩺 Blue badges = Vitals (BP: 145/92)

2. **Point out**: "ML automatically extracted all medical entities during indexing"

### Show Analytics (30 seconds)

1. **Navigate to Dashboard**
2. **Show charts**:
   - Most prescribed medications (Lisinopril leads)
   - Common symptoms trend
   - Visit timeline
3. **Click medication** → Shows dosage patterns across all patients

### Finalize Visit (30 seconds)

1. **Click "Finalize Visit"**
2. **Watch**: ML generates artifacts:
   - After-visit summary (patient-friendly)
   - SOAP note draft (clinician)
   - Medication list with extracted dosages
   - Follow-up tasks

3. **Copy Patient Share Link**

### Patient Chat (45 seconds)

1. **Open patient link** in new tab
2. **Ask**: "What medications was I prescribed?"
   - See **Tool Trace panel** show ES|QL query execution
   - See response: "Lisinopril 20mg once daily [Transcript 00:08:23]"
   - Click citation → Highlights exact transcript moment

3. **Ask**: "Should I take this with food?"
   - Watch agent provide safe response with escalation pattern
   - Notice: Never invents info, always cites sources

4. **Show Tool Trace**:
   - Tool calls visible
   - ES|QL queries shown
   - Results streaming

## 🎯 Key Features Demonstrated

### 1. Elasticsearch ML
- ✅ Medical NER extracts entities automatically
- ✅ Medications, symptoms, procedures, vitals
- ✅ Searchable and aggregatable across visits
- ✅ Real-time during indexing

### 2. ES|QL Tools
- ✅ 6 custom tools for Agent Builder
- ✅ Query visit data with ES|QL
- ✅ Visible in Tool Trace panel

### 3. Multi-Agent System
- ✅ Patient Agent (grounded RAG)
- ✅ Clinician Agent (documentation)
- ✅ Triage Agent (urgency detection)

### 4. Grounded RAG
- ✅ Citations with timestamps
- ✅ "I don't have that information" for missing data
- ✅ Emergency escalation for red flags

### 5. Analytics
- ✅ Medication patterns
- ✅ Symptom trends
- ✅ Visit timeline
- ✅ Complex aggregations

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, shadcn/ui, Recharts
- **Backend**: Next.js API routes, Prisma, SQLite
- **Search & ML**: Elasticsearch 8.12+ with ML features
- **Agents**: Kibana Agent Builder API
- **Actions**: Elastic Workflows

## 📊 What Makes This Win

### Elasticsearch Usage (9/10)
- ✅ ML entity extraction (unique to ES)
- ✅ ES|QL tools (new feature judges want)
- ✅ Complex aggregations (medication patterns)
- ✅ Multi-index search
- ✅ Vector + keyword hybrid search

### Agent Builder Usage (9/10)
- ✅ Proper Agent Builder SDK usage
- ✅ Custom ES|QL tools
- ✅ Multi-agent coordination
- ✅ Tool trace streaming
- ✅ Grounded RAG with citations

### Workflows Usage (8/10)
- ✅ Human-in-the-loop approval
- ✅ Deterministic actions
- ✅ Full audit trail

### Overall Innovation (9/10)
- ✅ Full Elastic stack showcase
- ✅ Healthcare use case (huge market)
- ✅ ML for medical text (perfect fit)
- ✅ Clean 3-minute demo
- ✅ Works without external APIs

## 🎓 Development
```bash
# Database migrations
npm run prisma:migrate

# Regenerate Prisma client
npm run prisma:generate

# Re-seed database
npm run prisma:seed

# Re-bootstrap Agent Builder
npm run bootstrap

# Re-seed demo data
npm run seed:demo
```

## 📝 License

MIT

## ⚠️ Disclaimer

This is a demo application for hackathon purposes. Not for clinical use. Does not provide medical advice.

🎉 FINAL DEPLOYMENT CHECKLIST
bash# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 3. Run complete setup
npm run setup

# 4. Start development server
npm run dev

# 5. Open browser
# http://localhost:3000

# 6. Login
# clinician@demo.com / demo123

# 7. View demo visit
# Click "John Smith - High blood pressure follow-up"

# 8. See ML entities
# Green = meds, Yellow = symptoms, Blue = vitals

# 9. Finalize visit
# Click "Finalize Visit" button

# 10. Open patient chat
# Copy share link → Open in new tab

# 11. Chat with agent
# Ask: "What medications was I prescribed?"

# 12. Watch Tool Trace
# See ES|QL queries execute in real-time

