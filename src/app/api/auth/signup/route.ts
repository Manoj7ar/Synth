import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureSarahDemoSoapNoteForClinician } from '@/lib/demo/sarah-soap-note'

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: unknown
      email?: unknown
      password?: unknown
    }

    const name = normalizeText(body.name)
    const email = normalizeEmail(body.email)
    const password = normalizeText(body.password)

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Please complete all fields' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'clinician',
        name,
      },
      select: {
        id: true,
        email: true,
      },
    })

    try {
      await ensureSarahDemoSoapNoteForClinician(prisma, user.id)
    } catch (error) {
      // Signup should not fail if demo data creation has a transient issue.
      console.warn('Unable to create Sarah demo SOAP note for new clinician:', error)
    }

    return NextResponse.json({ ok: true, user }, { status: 201 })
  } catch (error) {
    console.error('Signup error:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again in a moment.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: 'Unable to create account right now' }, { status: 500 })
  }
}
