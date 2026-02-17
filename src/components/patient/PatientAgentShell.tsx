'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { ChatInterface } from '@/components/chat/ChatInterface'

interface PatientAgentShellProps {
  patientName: string
  patientId: string
  visitId: string
  shareToken: string
  visitDate: string
  nextAppointment: string | null
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function formatDateLabel(iso: string | null) {
  if (!iso) {
    return 'Not scheduled'
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return 'Not scheduled'
  }

  const month = MONTH_NAMES[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  return `${month} ${day}, ${year}`
}

export function PatientAgentShell({
  patientName,
  patientId,
  visitId,
  shareToken,
  visitDate,
  nextAppointment,
}: PatientAgentShellProps) {
  const [chatFocused, setChatFocused] = useState(false)

  const firstName = useMemo(() => {
    const trimmed = patientName.trim()
    if (!trimmed) return 'Patient'
    const [name] = trimmed.split(/\s+/)
    return name
  }, [patientName])

  const visitDateLabel = useMemo(() => formatDateLabel(visitDate), [visitDate])
  const nextAppointmentLabel = useMemo(
    () => formatDateLabel(nextAppointment),
    [nextAppointment]
  )

  const chromeClass = chatFocused
    ? 'pointer-events-none -translate-y-2 opacity-0'
    : 'translate-y-0 opacity-100'

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6efe2] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 14%, rgba(255,255,255,0.55) 0%, transparent 45%), radial-gradient(circle at 82% 86%, rgba(238,224,197,0.6) 0%, transparent 42%), radial-gradient(circle at 58% 24%, rgba(248,236,212,0.7) 0%, transparent 50%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cg fill='%2368573f' fill-opacity='0.35'%3E%3Ccircle cx='14' cy='26' r='1'/%3E%3Ccircle cx='42' cy='68' r='1'/%3E%3Ccircle cx='88' cy='32' r='1'/%3E%3Ccircle cx='132' cy='54' r='1'/%3E%3Ccircle cx='168' cy='18' r='1'/%3E%3Ccircle cx='22' cy='122' r='1'/%3E%3Ccircle cx='64' cy='148' r='1'/%3E%3Ccircle cx='114' cy='124' r='1'/%3E%3Ccircle cx='154' cy='144' r='1'/%3E%3Ccircle cx='78' cy='92' r='1'/%3E%3C/g%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
        }}
      />

      <div
        className={`fixed left-4 top-4 z-20 transition-all duration-500 md:left-6 md:top-6 ${chromeClass}`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Patient Agent
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Welcome {firstName}!
        </h1>
      </div>

      <div
        className={`fixed right-4 top-4 z-20 flex flex-wrap items-center justify-end gap-2 transition-all duration-500 md:right-6 md:top-6 ${chromeClass}`}
      >
        <div className="rounded-full bg-white/70 px-4 py-2 text-xs font-medium text-slate-700 shadow-[0_10px_24px_rgba(109,86,52,0.16)] backdrop-blur-md md:text-sm">
          Visit: <span className="font-semibold text-slate-900">{visitDateLabel}</span>
        </div>
        <div className="rounded-full bg-white/70 px-4 py-2 text-xs font-medium text-slate-700 shadow-[0_10px_24px_rgba(109,86,52,0.16)] backdrop-blur-md md:text-sm">
          Next Appointment:{' '}
          <span className="font-semibold text-slate-900">{nextAppointmentLabel}</span>
        </div>
      </div>

      <div
        className={`fixed left-4 top-4 z-20 transition-all duration-500 md:left-6 md:top-6 ${
          chatFocused ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}
      >
        <Image src="/favicon.svg" alt="Synth" width={38} height={38} className="rounded-full" />
      </div>

      <main
        className={`relative z-10 h-screen transition-all duration-500 ${
          chatFocused ? 'px-3 pb-3 pt-14 md:px-6 md:pb-6 md:pt-16' : 'px-3 pb-3 pt-24 md:px-6 md:pb-6 md:pt-28'
        }`}
      >
        <ChatInterface
          patientId={patientId}
          visitId={visitId}
          shareToken={shareToken}
          mode="patient"
          onConversationStart={() => setChatFocused(true)}
        />
      </main>
    </div>
  )
}
