import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TranscribeWorkspace } from '@/components/transcribe/TranscribeWorkspace'

export default async function TranscribePage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'clinician') {
    redirect('/login')
  }

  return <TranscribeWorkspace clinicianName={session.user.name ?? 'Clinician'} />
}
