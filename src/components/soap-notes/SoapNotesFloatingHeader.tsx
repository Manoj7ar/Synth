'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  FLOATING_SIDEBAR_STATE_EVENT,
  type FloatingSidebarStateDetail,
} from '@/lib/floating-sidebar-events'

type SoapNotesFloatingHeaderProps = {
  eyebrow: string
  title: string
  subtitle?: string | null
  fadeOnScroll?: boolean
}

export function SoapNotesFloatingHeader({
  eyebrow,
  title,
  subtitle,
  fadeOnScroll = false,
}: SoapNotesFloatingHeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [headerHidden, setHeaderHidden] = useState(false)
  const hideWithScroll = fadeOnScroll && headerHidden

  useEffect(() => {
    const handleSidebarState = (event: Event) => {
      const detail = (event as CustomEvent<FloatingSidebarStateDetail>).detail
      setSidebarOpen(Boolean(detail?.open))
    }

    window.addEventListener(FLOATING_SIDEBAR_STATE_EVENT, handleSidebarState as EventListener)
    return () =>
      window.removeEventListener(
        FLOATING_SIDEBAR_STATE_EVENT,
        handleSidebarState as EventListener
      )
  }, [])

  useEffect(() => {
    if (!fadeOnScroll) {
      return
    }

    const handleScroll = () => {
      setHeaderHidden(window.scrollY > 20)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [fadeOnScroll])

  return (
    <header
      className={cn(
        'fixed top-4 z-20 flex items-center transition-all duration-300 ease-out md:top-6',
        sidebarOpen ? 'left-64 md:left-[17rem]' : 'left-20 md:left-24',
        fadeOnScroll &&
          (hideWithScroll
            ? 'pointer-events-none -translate-y-2 opacity-0'
            : 'translate-y-0 opacity-100')
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
        <p className="text-sm font-medium text-slate-700">{title}</p>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    </header>
  )
}
