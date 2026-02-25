import { ClinicianWorkspace } from '@/components/clinician/ClinicianWorkspace'
import { requireClinicianPage } from '@/lib/server/clinician-auth'

export default async function ClinicianDashboard() {
  const { user } = await requireClinicianPage()

  return (
    <ClinicianWorkspace
      clinicianName={user.name ?? 'Clinician'}
      practiceName={user.practiceName}
      specialty={user.specialty}
    />
  )
}
