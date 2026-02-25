'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ClinicianOnboardingFormProps = {
  initialName: string
  initialPracticeName: string
  initialSpecialty: string
  isEditMode: boolean
}

type ProfileApiResponse = {
  profile?: {
    name: string | null
    practiceName: string | null
    specialty: string | null
    onboardingCompletedAt: string | null
    onboardingComplete: boolean
  }
  error?: string
}

export function ClinicianOnboardingForm({
  initialName,
  initialPracticeName,
  initialSpecialty,
  isEditMode,
}: ClinicianOnboardingFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [practiceName, setPracticeName] = useState(initialPracticeName)
  const [specialty, setSpecialty] = useState(initialSpecialty)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSaving) return

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          practiceName,
          specialty,
        }),
      })

      const data = (await response.json()) as ProfileApiResponse
      if (!response.ok) {
        setError(data.error || 'Unable to save your profile right now.')
        setIsSaving(false)
        return
      }

      router.push('/clinician')
      router.refresh()
    } catch {
      setError('Unable to save your profile right now.')
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clinician-name" className="text-slate-800">
            Clinician Name
          </Label>
          <Input
            id="clinician-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Dr. Jane Doe"
            className="h-11 border-[#e5d8c3] bg-white/80"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clinician-specialty" className="text-slate-800">
            Specialty
          </Label>
          <Input
            id="clinician-specialty"
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            placeholder="Family Medicine"
            className="h-11 border-[#e5d8c3] bg-white/80"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="practice-name" className="text-slate-800">
          Practice Name
        </Label>
        <Input
          id="practice-name"
          value={practiceName}
          onChange={(event) => setPracticeName(event.target.value)}
          placeholder="Riverside Community Clinic"
          className="h-11 border-[#e5d8c3] bg-white/80"
          required
        />
      </div>

      <div className="rounded-2xl border border-[#eadfcd] bg-white/65 px-4 py-3 text-sm text-slate-600">
        These details personalize your clinician dashboard, transcription workspace, SOAP notes
        headers, and generated clinical reports.
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="submit"
          disabled={isSaving}
          className="rounded-full bg-[#0ea5e9] px-5 text-white hover:bg-[#38bdf8]"
        >
          {isSaving
            ? isEditMode
              ? 'Saving...'
              : 'Saving profile...'
            : isEditMode
              ? 'Save Profile'
              : 'Continue to Workspace'}
        </Button>

        {isEditMode ? (
          <Button asChild type="button" variant="ghost" className="rounded-full border border-[#e6d9c4] bg-white/70 text-slate-700 hover:bg-white">
            <Link href="/clinician">Back to Clinician</Link>
          </Button>
        ) : null}
      </div>
    </form>
  )
}

