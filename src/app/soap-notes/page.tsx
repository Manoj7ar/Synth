import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FloatingSidebarNav } from '@/components/clinician/FloatingSidebarNav'
import { LogOut, Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { SoapNotesFloatingHeader } from '@/components/soap-notes/SoapNotesFloatingHeader'
import { requireClinicianPage } from '@/lib/server/clinician-auth'
import { ensureSarahDemoSoapNoteForClinician } from '@/lib/demo/sarah-soap-note'

function profileSubtitle(practiceName: string | null, specialty: string | null) {
  const parts = [specialty, practiceName].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

export default async function SoapNotesPage() {
  const { user } = await requireClinicianPage()

  try {
    await ensureSarahDemoSoapNoteForClinician(prisma, user.id)
  } catch (error) {
    console.warn('Unable to ensure Sarah demo SOAP note:', error)
  }

  const records = await prisma.visitDocumentation.findMany({
    where: {
      visit: {
        clinicianId: user.id,
      },
    },
    include: {
      visit: {
        include: {
          patient: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

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
        eyebrow="Synth"
        title={`Welcome, ${user.name ?? 'Clinician'}`}
        subtitle={profileSubtitle(user.practiceName, user.specialty)}
        fadeOnScroll
      />

      <main className="relative z-10 px-4 pb-10 pt-24 md:px-8 md:pt-28">
        <div className="w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            SOAP Notes
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Saved patient records
          </h1>
          <p className="mt-3 text-sm text-slate-600 md:text-base">
            Open a patient record to review summary, transcript, SOAP notes, and add your
            additional notes.
          </p>

          <div className="mt-8 space-y-3">
            {records.length === 0 ? (
              <div className="rounded-2xl border border-[#eadfcd] bg-white/80 px-4 py-6 text-sm text-slate-600">
                No saved transcriptions yet. Record and save one from the Transcribe page.
              </div>
            ) : (
              records.map((record) => (
                <Link
                  key={record.id}
                  href={`/soap-notes/${record.visitId}`}
                  className="block rounded-2xl border border-[#eadfcd] bg-white/80 px-4 py-4 transition hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {record.visit.patient.displayName}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {record.summary.replace(/\n+/g, ' ').slice(0, 180)}
                      </p>
                    </div>
                    <div className="shrink-0 text-xs font-medium text-slate-500">
                      {new Date(record.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
