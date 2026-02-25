import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FloatingSidebarNav } from '@/components/clinician/FloatingSidebarNav'
import { LogOut, Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { AdditionalNotesEditor } from '@/components/soap-notes/AdditionalNotesEditor'
import type { TranscriptSegment } from '@/lib/clinical-notes'
import { TranscriptPanel } from '@/components/soap-notes/TranscriptPanel'
import { CopyTextButton } from '@/components/soap-notes/CopyTextButton'
import { SoapNoteRenderer } from '@/components/soap-notes/SoapNoteRenderer'
import { ConversationSummaryRenderer } from '@/components/soap-notes/ConversationSummaryRenderer'
import { SoapNotesFloatingHeader } from '@/components/soap-notes/SoapNotesFloatingHeader'
import { PatientAgentShareButton } from '@/components/soap-notes/PatientAgentShareButton'
import { requireClinicianPage } from '@/lib/server/clinician-auth'

function generateShareToken() {
  return (
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  )
}

function safeParseTranscript(raw: string): TranscriptSegment[] {
  try {
    const parsed = JSON.parse(raw) as TranscriptSegment[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (segment) =>
        (segment.speaker === 'clinician' || segment.speaker === 'patient') &&
        typeof segment.text === 'string' &&
        typeof segment.start_ms === 'number' &&
        typeof segment.end_ms === 'number'
    )
  } catch {
    return []
  }
}

export default async function SoapNotesDetailPage({
  params,
}: {
  params: Promise<{ visitId: string }>
}) {
  const { user } = await requireClinicianPage()

  const { visitId } = await params

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      patient: true,
      documentation: true,
      shareLinks: {
        where: { revokedAt: null },
        take: 1,
      },
    },
  })

  if (!visit || visit.clinicianId !== user.id || !visit.documentation) {
    redirect('/soap-notes')
  }

  let shareToken = visit.shareLinks[0]?.token ?? ''
  if (!shareToken) {
    const shareLink = await prisma.shareLink.create({
      data: {
        visitId: visit.id,
        patientId: visit.patientId,
        token: generateShareToken(),
      },
    })
    shareToken = shareLink.token
  }

  const transcript = safeParseTranscript(visit.documentation.transcriptJson)
  const clinicianTurns = transcript.filter((segment) => segment.speaker === 'clinician').length
  const patientTurns = transcript.filter((segment) => segment.speaker === 'patient').length
  const transcriptDurationMs =
    transcript.length > 0 ? Math.max(...transcript.map((segment) => segment.end_ms)) : 0
  const transcriptDurationMin = Math.round(transcriptDurationMs / 60000)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6efe2] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 14%, rgba(255,255,255,0.55) 0%, transparent 45%), radial-gradient(circle at 82% 86%, rgba(238,224,197,0.6) 0%, transparent 42%), radial-gradient(circle at 58% 24%, rgba(248,236,212,0.7) 0%, transparent 50%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cg fill='%2368573f' fill-opacity='0.35'%3E%3Ccircle cx='14' cy='26' r='1'/%3E%3Ccircle cx='42' cy='68' r='1'/%3E%3Ccircle cx='88' cy='32' r='1'/%3E%3Ccircle cx='132' cy='54' r='1'/%3E%3Ccircle cx='168' cy='18' r='1'/%3E%3Ccircle cx='22' cy='122' r='1'/%3E%3Ccircle cx='64' cy='148' r='1'/%3E%3Ccircle cx='114' cy='124' r='1'/%3E%3Ccircle cx='154' cy='144' r='1'/%3E%3Ccircle cx='78' cy='92' r='1'/%3E%3C/g%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
        }}
      />

      <FloatingSidebarNav anchor="top-left" fadeOnScroll />

      <div className="fixed right-4 top-4 z-20 flex items-center gap-2 md:right-6 md:top-6">
        <PatientAgentShareButton shareToken={shareToken} />
        <Button asChild>
          <Link href="/clinician/new-visit">
            <Plus size={16} className="mr-2" />
            New Visit
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/signout">
            <LogOut size={16} className="mr-2" />
            Sign Out
          </Link>
        </Button>
      </div>

      <SoapNotesFloatingHeader
        eyebrow="SOAP Notes"
        title={visit.patient.displayName}
        fadeOnScroll
      />

      <main className="relative z-10 px-4 pb-10 pt-24 md:px-8 md:pt-28">
        <div className="w-full space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-[#eadfcd] bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Doctor Turns</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{clinicianTurns}</p>
            </div>
            <div className="rounded-2xl border border-[#eadfcd] bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Patient Turns</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{patientTurns}</p>
            </div>
            <div className="rounded-2xl border border-[#eadfcd] bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Segments</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{transcript.length}</p>
            </div>
            <div className="rounded-2xl border border-[#eadfcd] bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Duration</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {transcriptDurationMin > 0 ? `${transcriptDurationMin} min` : 'Under 1 min'}
              </p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-12">
            <div className="rounded-2xl border border-[#eadfcd] bg-white/80 p-5 xl:col-span-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Conversation Summary
                </p>
                <CopyTextButton value={visit.documentation.summary} label="Copy Summary" />
              </div>
              <div className="mt-3">
                <ConversationSummaryRenderer content={visit.documentation.summary} />
              </div>
            </div>

            <div className="rounded-2xl border border-[#eadfcd] bg-white/80 p-5 xl:col-span-7">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  SOAP Notes
                </p>
                <CopyTextButton value={visit.documentation.soapNotes} label="Copy SOAP" />
              </div>
              <div className="mt-4">
                <SoapNoteRenderer
                  content={visit.documentation.soapNotes}
                  visitId={visit.id}
                  patientName={visit.patient.displayName}
                />
              </div>
            </div>
          </div>

          <TranscriptPanel transcript={transcript} />

          <AdditionalNotesEditor
            visitId={visit.id}
            initialNotes={visit.documentation.additionalNotes ?? ''}
          />
        </div>
      </main>
    </div>
  )
}
