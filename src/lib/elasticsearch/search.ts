import { esClient } from './client'
import { INDICES } from './indices'

interface TranscriptSearchHit {
  _id: string
  _score?: number | null
  _source?: Record<string, unknown>
  highlight?: {
    text?: string[]
  }
}

interface MedicationEntity {
  name: string
  dosage?: string
  frequency?: string
  confidence?: number
}

interface TranscriptChunkSource {
  ml_entities?: {
    medications?: MedicationEntity[]
  }
}

export async function searchTranscript(visitId: string, patientId: string, query: string) {
  try {
    const result = await esClient.search({
      index: INDICES.TRANSCRIPT_CHUNKS,
      query: {
        bool: {
          must: [
            { term: { visit_id: visitId } },
            { term: { patient_id: patientId } },
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
      sort: [{ start_ms: 'asc' as const }],
      size: 50
    })

    const hits = result.hits.hits as unknown as TranscriptSearchHit[]

    return hits.map((hit) => ({
      id: hit._id,
      score: hit._score,
      ...(hit._source ?? {}),
      highlights: hit.highlight?.text || []
    }))
  } catch {
    return []
  }
}

export async function getAllTranscriptChunks(visitId: string, patientId: string) {
  try {
    const result = await esClient.search({
      index: INDICES.TRANSCRIPT_CHUNKS,
      query: {
        bool: {
          must: [
            { term: { visit_id: visitId } },
            { term: { patient_id: patientId } }
          ]
        }
      },
      sort: [{ start_ms: 'asc' as const }],
      size: 10000
    })

    const hits = result.hits.hits as unknown as TranscriptSearchHit[]

    return hits.map((hit) => ({
      id: hit._id,
      ...(hit._source ?? {})
    }))
  } catch {
    return []
  }
}

export async function getMedicationsFromVisit(visitId: string, patientId: string) {
  try {
    const result = await esClient.search({
      index: INDICES.TRANSCRIPT_CHUNKS,
      query: {
        bool: {
          must: [
            { term: { visit_id: visitId } },
            { term: { patient_id: patientId } }
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
    })

    const medications = new Map<
      string,
      {
        name: string
        dosage?: string
        frequency?: string
        confidence?: number
        mentions: number
        chunks: string[]
      }
    >()
    
    const hits = result.hits.hits as unknown as TranscriptSearchHit[]
    for (const hit of hits) {
      const source = (hit._source ?? {}) as TranscriptChunkSource
      const meds = source.ml_entities?.medications ?? []
      for (const med of meds) {
        if (!med?.name) continue

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
            if (existing) {
              existing.mentions++
              existing.chunks.push(hit._id)
            }
          }
      }
    }

    return Array.from(medications.values())
  } catch {
    return []
  }
}
