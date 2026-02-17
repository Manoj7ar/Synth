import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ClinicianWorkspace } from '@/components/clinician/ClinicianWorkspace'

export default async function ClinicianDashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'clinician') {
    redirect('/login')
  }

  return (
    <ClinicianWorkspace
      clinicianName={session.user.name ?? 'Clinician'}
    />
  )
}
