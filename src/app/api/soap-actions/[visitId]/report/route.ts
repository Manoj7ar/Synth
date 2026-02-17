import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type ReportRecord = {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

async function getAuthorizedVisit(visitId: string, clinicianId: string) {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      patient: true,
      documentation: true,
    },
  })

  if (!visit || visit.clinicianId !== clinicianId) {
    return null
  }
  return visit
}

function fallbackReport({
  patientName,
  clinicianName,
  summary,
  soapNotes,
  additionalNotes,
}: {
  patientName: string
  clinicianName: string
  summary: string
  soapNotes: string
  additionalNotes: string
}) {
  return `# Clinical Visit Report

## Patient Information
- Patient: ${patientName}
- Clinician: ${clinicianName}
- Generated: ${new Date().toLocaleString()}

## Visit Summary
${summary || 'No summary available.'}

## SOAP Documentation
${soapNotes || 'No SOAP notes available.'}

## Additional Clinical Notes
${additionalNotes || 'No additional notes provided.'}

## Follow-Up Recommendations
- Continue standard monitoring plan.
- Review symptoms and medication adherence at next follow-up.
- Escalate for urgent review if symptoms worsen.
`
}

async function generateMedicalReportContent(args: {
  patientName: string
  clinicianName: string
  summary: string
  soapNotes: string
  additionalNotes: string
}) {
  try {
    const { getGeminiModel } = await import('@/lib/gemini')
    const model = getGeminiModel('gemini-2.0-flash')
    const prompt = `You are a senior clinical documentation assistant.
Generate a professional, print-ready, medical-grade report in markdown.
Use concise clinical language and include only information present in the context.

Required sections:
1) Patient Information
2) Clinical Summary
3) SOAP Findings
4) Follow-Up Plan
5) Safety and Escalation Notes

Context:
Patient: ${args.patientName}
Clinician: ${args.clinicianName}

Summary:
${args.summary}

SOAP Notes:
${args.soapNotes}

Additional Notes:
${args.additionalNotes}
`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    if (!text) {
      return fallbackReport(args)
    }
    return text
  } catch {
    return fallbackReport(args)
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { visitId } = await params
    const visit = await getAuthorizedVisit(visitId, session.user.id)
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const reports = await prisma.generatedReport.findMany({
      where: { visitId: visit.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, reports })
  } catch (error) {
    console.error('Get reports error:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { visitId } = await params
    const visit = await getAuthorizedVisit(visitId, session.user.id)
    if (!visit || !visit.documentation) {
      return NextResponse.json({ error: 'Visit documentation not found' }, { status: 404 })
    }

    const payload = (await req.json()) as { title?: string }
    const reportTitle = payload.title?.trim() || `Clinical Report - ${visit.patient.displayName}`
    const clinicianName = session.user.name || 'Clinician'
    const summary = visit.documentation.summary ?? ''
    const soapNotes = visit.documentation.soapNotes ?? ''
    const additionalNotes = visit.documentation.additionalNotes ?? ''

    const content = await generateMedicalReportContent({
      patientName: visit.patient.displayName,
      clinicianName,
      summary,
      soapNotes,
      additionalNotes,
    })

    const report: ReportRecord = await prisma.generatedReport.create({
      data: {
        visitId: visit.id,
        patientId: visit.patientId,
        clinicianId: session.user.id,
        title: reportTitle,
        content,
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error('Generate report error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
