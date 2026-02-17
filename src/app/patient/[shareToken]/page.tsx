import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { PatientAgentShell } from '@/components/patient/PatientAgentShell'

export default async function PatientChatPage({
  params,
}: {
  params: Promise<{ shareToken: string }>
}) {
  const { shareToken } = await params

  const shareLink = await prisma.shareLink.findUnique({
    where: { token: shareToken },
    include: {
      visit: {
        include: {
          patient: true,
          appointments: {
            where: {
              scheduledFor: {
                gte: new Date(),
              },
            },
            orderBy: { scheduledFor: 'asc' },
            take: 1,
          },
        },
      },
    },
  })

  if (!shareLink || shareLink.revokedAt) {
    redirect('/login')
  }

  const nextAppointment = shareLink.visit.appointments[0] ?? null
  return (
    <PatientAgentShell
      patientName={shareLink.visit.patient.displayName}
      patientId={shareLink.patientId}
      visitId={shareLink.visitId}
      shareToken={shareToken}
      visitDate={shareLink.visit.startedAt.toISOString()}
      nextAppointment={nextAppointment ? nextAppointment.scheduledFor.toISOString() : null}
    />
  )
}
