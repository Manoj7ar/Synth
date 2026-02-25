import type { estypes } from '@elastic/elasticsearch'
import { esClient } from './client'

const INDEX_PREFIX = 'synth_'

export const INDICES = {
  TRANSCRIPT_CHUNKS: `${INDEX_PREFIX}transcript_chunks`,
  DOCUMENTS: `${INDEX_PREFIX}documents`,
  VISIT_ARTIFACTS: `${INDEX_PREFIX}visit_artifacts`,
  AUDIT_ACTIONS: `${INDEX_PREFIX}audit_actions`,
  ANALYTICS: `${INDEX_PREFIX}analytics`
}

export async function createIndices() {
  console.log('Creating Elasticsearch indices...\n')

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
              type: { type: 'keyword' },
              value: { type: 'text' },
              confidence: { type: 'float' }
            }
          }
        }
      }
    }
  })

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

  await createIndexIfNotExists(INDICES.VISIT_ARTIFACTS, {
    properties: {
      visit_id: { type: 'keyword' },
      patient_id: { type: 'keyword' },
      after_visit_summary: { type: 'text' },
      soap_draft: { type: 'text' },
      medication_list_json: { 
        type: 'object',
        enabled: true
      },
      followups_json: { 
        type: 'object',
        enabled: true
      },
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

  await createIndexIfNotExists(INDICES.ANALYTICS, {
    properties: {
      period_type: { type: 'keyword' },
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

  console.log('All indices created!\n')
}

async function createIndexIfNotExists(
  indexName: string,
  mappings: { properties: Record<string, estypes.MappingProperty> }
) {
  try {
    const exists = await esClient.indices.exists({ index: indexName })
    
    if (exists) {
      console.log(`Index exists: ${indexName}`)
      return
    }

    await esClient.indices.create({
      index: indexName,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
        'index.max_result_window': 10000
      },
      mappings: {
        properties: mappings.properties
      }
    })

    console.log(`Created index: ${indexName}`)
  } catch (error) {
    console.error(`Error creating index ${indexName}:`, error)
    throw error
  }
}
