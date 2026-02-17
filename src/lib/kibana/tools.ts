import { kibanaClient } from './client'

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

export const SYNTH_TOOLS: ESQLTool[] = [
  {
    id: 'synth_get_visit_summary',
    name: 'Get Visit Summary',
    description: 'Retrieve the after-visit summary for a patient',
    query: `FROM synth_visit_artifacts
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
    id: 'synth_get_medications',
    name: 'Get Medications',
    description: 'Retrieve all medications prescribed or discussed in the visit',
    query: `FROM synth_visit_artifacts
| WHERE patient_id == ?patientId AND visit_id == ?visitId
| KEEP medication_list_json, extracted_entities_summary.all_medications
| LIMIT 1`,
    params: [
      { name: 'patientId', type: 'string', description: 'Patient ID', required: true },
      { name: 'visitId', type: 'string', description: 'Visit ID', required: true }
    ]
  },
  
  {
    id: 'synth_search_transcript',
    name: 'Search Transcript',
    description: 'Search for specific topics or keywords in the visit transcript',
    query: `FROM synth_transcript_chunks
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
    id: 'synth_get_timeline',
    name: 'Get Visit Timeline',
    description: 'Get chronological timeline of the visit conversation',
    query: `FROM synth_transcript_chunks
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
    id: 'synth_get_followups',
    name: 'Get Follow-up Instructions',
    description: 'Retrieve follow-up tasks and instructions',
    query: `FROM synth_visit_artifacts
| WHERE patient_id == ?patientId AND visit_id == ?visitId
| KEEP followups_json
| LIMIT 1`,
    params: [
      { name: 'patientId', type: 'string', description: 'Patient ID', required: true },
      { name: 'visitId', type: 'string', description: 'Visit ID', required: true }
    ]
  },
  
  {
    id: 'synth_get_symptoms',
    name: 'Get Symptoms',
    description: 'Retrieve all symptoms mentioned in the visit',
    query: `FROM synth_transcript_chunks
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
  console.log('Creating ES|QL tools in Agent Builder...\n')
  
  const createdTools = []
  
  for (const tool of SYNTH_TOOLS) {
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
      
      console.log(`Created tool: ${tool.name}`)
      createdTools.push(result)
    } catch (error) {
      console.error(`Error creating tool ${tool.name}:`, error)
    }
  }
  
  console.log(`\nCreated ${createdTools.length}/${SYNTH_TOOLS.length} tools`)
  return createdTools
}
