import { esClient } from './client'
import { INDICES } from './indices'

type TermsBucket = { key: string; doc_count: number }
type DateBucket = { key_as_string: string; doc_count: number }

type VisitAnalyticsAggregations = {
  total_visits?: { value?: number }
  medications_agg?: { top_medications?: { buckets?: TermsBucket[] } }
  symptoms_agg?: { top_symptoms?: { buckets?: TermsBucket[] } }
  visits_over_time?: { buckets?: DateBucket[] }
}

type MedicationPatternAggregations = {
  dosages?: { dosage_distribution?: { buckets?: TermsBucket[] } }
  by_patient?: { buckets?: TermsBucket[] }
}

function normalizeHitsTotal(total: number | { value: number } | undefined): number {
  if (typeof total === 'number') return total
  return total?.value ?? 0
}

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

    const aggs = result.aggregations as unknown as VisitAnalyticsAggregations

    return {
      totalVisits: aggs?.total_visits?.value ?? 0,
      topMedications: (aggs?.medications_agg?.top_medications?.buckets ?? []).map((b) => ({
        name: b.key,
        count: b.doc_count
      })),
      topSymptoms: (aggs?.symptoms_agg?.top_symptoms?.buckets ?? []).map((b) => ({
        name: b.key,
        count: b.doc_count
      })),
      visitsOverTime: (aggs?.visits_over_time?.buckets ?? []).map((b) => ({
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

  const aggs = result.aggregations as unknown as MedicationPatternAggregations

  return {
    totalMentions: normalizeHitsTotal(result.hits.total as number | { value: number } | undefined),
    dosages: aggs?.dosages?.dosage_distribution?.buckets ?? [],
    uniquePatients: aggs?.by_patient?.buckets?.length ?? 0
  }
}
