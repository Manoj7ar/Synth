import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { TranscriptEditor } from '@/components/visit/TranscriptEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { FinalizeButton } from './FinalizeButton'

export default async function VisitPage({ params }: { params: Promise<{ visitId: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'clinician') {
    redirect('/login')
  }

  const { visitId } = await params

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { patient: true, shareLinks: true }
  })

  if (!visit || visit.clinicianId !== session.user.id) {
    redirect('/clinician')
  }

  // Try to get chunks from ES first
  let chunks: any[] = []
  try {
    const { getAllTranscriptChunks } = await import('@/lib/elasticsearch/search')
    chunks = await getAllTranscriptChunks(visit.id, visit.patientId)
  } catch {
    // ES not available
  }

  // Fall back to Prisma VisitDocumentation + local ML entity extraction
  if (chunks.length === 0) {
    const doc = await prisma.visitDocumentation.findUnique({
      where: { visitId: visit.id },
      select: { transcriptJson: true },
    })

    if (doc?.transcriptJson) {
      const { extractMedicalEntities } = await import('@/lib/elasticsearch/ml')
      const segments = JSON.parse(doc.transcriptJson) as Array<{
        speaker: string; start_ms: number; end_ms: number; text: string
      }>

      chunks = await Promise.all(
        segments.map(async (seg, idx) => {
          const entities = await extractMedicalEntities(seg.text)
          return {
            chunk_id: `${visit.id}-chunk-${idx}`,
            visit_id: visit.id,
            patient_id: visit.patientId,
            speaker: seg.speaker,
            start_ms: seg.start_ms,
            end_ms: seg.end_ms,
            text: seg.text,
            ml_entities: {
              medications: entities.medications.map(m => ({ name: m.name, dosage: m.dosage, frequency: m.frequency, confidence: m.confidence })),
              symptoms: entities.symptoms.map(s => ({ name: s.name, severity: s.severity, confidence: s.confidence })),
              procedures: entities.procedures.map(p => ({ name: p.name, confidence: p.confidence })),
              vitals: entities.vitals.map(v => ({ type: v.type, value: v.value, confidence: v.confidence }))
            }
          }
        })
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/clinician">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft size={20} />
                </button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{visit.patient.displayName}</h1>
                <p className="text-sm text-gray-600">{visit.chiefComplaint}</p>
              </div>
              <Badge variant={visit.status === 'finalized' ? 'default' : 'secondary'}>
                {visit.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              {visit.status === 'draft' && chunks.length > 0 && (
                <FinalizeButton visitId={visit.id} />
              )}

              {visit.status === 'finalized' && visit.shareLinks[0] && (
                <Link href={`/patient/${visit.shareLinks[0].token}`} target="_blank">
                  <button className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    View Patient Link
                  </button>
                </Link>
              )}
            </div>
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
                    <p className="text-sm mt-2">Record a conversation from the Transcribe page first.</p>
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

            {chunks.length > 0 && (
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
                          .flatMap((c: any) => c.ml_entities?.medications || [])
                          .filter((med: any, idx: number, arr: any[]) => arr.findIndex((m: any) => m.name === med.name) === idx)
                          .map((med: any, idx: number) => (
                            <Badge key={idx} variant="default" className="bg-green-500 text-white border-0">
                              {med.name}
                            </Badge>
                          ))}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium mb-2">Symptoms</div>
                      <div className="flex flex-wrap gap-2">
                        {chunks
                          .flatMap((c: any) => c.ml_entities?.symptoms || [])
                          .filter((sym: any, idx: number, arr: any[]) => arr.findIndex((s: any) => s.name === sym.name) === idx)
                          .map((sym: any, idx: number) => (
                            <Badge key={idx} variant="default" className="bg-yellow-500 text-white border-0">
                              {sym.name}
                            </Badge>
                          ))}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium mb-2">Vitals</div>
                      <div className="space-y-1">
                        {chunks
                          .flatMap((c: any) => c.ml_entities?.vitals || [])
                          .map((vital: any, idx: number) => (
                            <div key={idx} className="text-xs bg-blue-50 p-2 rounded">
                              <span className="font-medium">{vital.type}:</span> {vital.value}
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
