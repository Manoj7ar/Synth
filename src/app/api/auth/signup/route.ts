/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { createPrismaClient, prisma } from '@/lib/prisma'
import { ensureSarahDemoSoapNoteForClinician } from '@/lib/demo/sarah-soap-note'

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

async function createAccountWithClient(
  client: any,
  input: { name: string; email: string; password: string }
) {
  const existing = await client.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    )
  }

  const passwordHash = await bcrypt.hash(input.password, 10)
  const user = await client.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: 'clinician',
      name: input.name,
    },
    select: {
      id: true,
      email: true,
    },
  })

  try {
    await ensureSarahDemoSoapNoteForClinician(client, user.id)
  } catch (error) {
    // Signup should not fail if demo data creation has a transient issue.
    console.warn('Unable to create Sarah demo SOAP note for new clinician:', error)
  }

  return NextResponse.json({ ok: true, user }, { status: 201 })
}

export async function POST(req: Request) {
  let parsedInput: { name: string; email: string; password: string } | null = null

  try {
    const body = (await req.json()) as {
      name?: unknown
      email?: unknown
      password?: unknown
    }

    const name = normalizeText(body.name)
    const email = normalizeEmail(body.email)
    const password = normalizeText(body.password)
    parsedInput = { name, email, password }

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Please complete all fields' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    return await createAccountWithClient(prisma, { name, email, password })
  } catch (error) {
    console.error('Signup error:', error)
    const errorCode =
      typeof error === 'object' && error && 'code' in error ? String((error as any).code) : ''
    const errorMessage =
      error instanceof Error ? error.message : typeof error === 'string' ? error : ''

    if (errorCode === 'P2002' || errorCode === '23505') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    if (
      errorCode === 'P1001' ||
      errorCode === 'P1000' ||
      errorCode === '57P01' ||
      /database|connection|supabase/i.test(errorMessage)
    ) {
      try {
        const retryClient = createPrismaClient()
        await retryClient.$connect()
        if (parsedInput?.name && parsedInput.email && parsedInput.password) {
          const response = await createAccountWithClient(retryClient, {
            name: parsedInput.name,
            email: parsedInput.email,
            password: parsedInput.password,
          })
          await retryClient.$disconnect()
          return response
        }
        await retryClient.$disconnect()
      } catch (retryError) {
        console.error('Signup retry error:', retryError)
      }

      return NextResponse.json(
        { error: 'Database connection error. Please restart the app and try again.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: 'Unable to create account right now' }, { status: 500 })
  }
}
