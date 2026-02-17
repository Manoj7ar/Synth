import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getVisitAnalytics, getMedicationPatternAnalysis } from '@/lib/elasticsearch/aggregations'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const medication = searchParams.get('medication')

    if (type === 'medication' && medication) {
      try {
        const patterns = await getMedicationPatternAnalysis(medication)
        return NextResponse.json(patterns)
      } catch {
        return NextResponse.json({ totalMentions: 0, dosages: [], uniquePatients: 0 })
      }
    }

    // Default: overview analytics from ES (returns empty data if ES not configured)
    const analytics = await getVisitAnalytics()
    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
