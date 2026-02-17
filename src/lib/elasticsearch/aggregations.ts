import { esClient } from './client'
import { INDICES } from './indices'

export async function getVisitAnalytics() {
  try {
    const result = await esClient.search({
      index: INDICES.VISIT_ARTIFACTS,
      size: 0,
      aggs: {
        total_visits: {
          cardinality: {
            field: 'visit_id'
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
                order: { _count: 'desc' as const }
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
                order: { _count: 'desc' as const }
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
    })

    const aggs = result.aggregations as any

    return {
      totalVisits: aggs?.total_visits?.value ?? 0,
      topMedications: (aggs?.medications_agg?.top_medications?.buckets ?? []).map((b: any) => ({
        name: b.key,
        count: b.doc_count
      })),
      topSymptoms: (aggs?.symptoms_agg?.top_symptoms?.buckets ?? []).map((b: any) => ({
        name: b.key,
        count: b.doc_count
      })),
      visitsOverTime: (aggs?.visits_over_time?.buckets ?? []).map((b: any) => ({
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
          field: 'patient_id',
          size: 100
        }
      }
    },
    size: 0
  })

  return {
    totalMentions: result.hits.total,
    dosages: (result.aggregations as any)?.dosages?.dosage_distribution?.buckets ?? [],
    uniquePatients: (result.aggregations as any)?.by_patient?.buckets?.length ?? 0
  }
}
