import { TranscribeWorkspace } from '@/components/transcribe/TranscribeWorkspace'
import { requireClinicianPage } from '@/lib/server/clinician-auth'

export default async function TranscribePage() {
  const { user } = await requireClinicianPage()

  return (
    <TranscribeWorkspace
      clinicianName={user.name ?? 'Clinician'}
      practiceName={user.practiceName}
      specialty={user.specialty}
    />
  )
}
