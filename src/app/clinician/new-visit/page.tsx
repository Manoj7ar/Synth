import { NewVisitForm } from '@/components/clinician/NewVisitForm'
import { requireClinicianPage } from '@/lib/server/clinician-auth'

export default async function NewVisitPage() {
  const { user } = await requireClinicianPage()

  return (
    <NewVisitForm
      clinicianName={user.name ?? 'Clinician'}
      practiceName={user.practiceName}
      specialty={user.specialty}
    />
  )
}

