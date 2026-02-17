import { esClient } from './client'
import { INDICES } from './indices'

export async function searchTranscript(visitId: string, patientId: string, query: string) {
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

  return result.hits.hits.map((hit: any) => ({
    id: hit._id,
    ...hit._source
  }))
}

export async function getMedicationsFromVisit(visitId: string, patientId: string) {
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
