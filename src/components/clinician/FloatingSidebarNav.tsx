'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ComponentType, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, FileAudio, MessageSquare, ScrollText } from 'lucide-react'
import {
  FLOATING_SIDEBAR_STATE_EVENT,
  type FloatingSidebarStateDetail,
} from '@/lib/floating-sidebar-events'

type NavItem = {
  key: 'ai-chat' | 'transcribe' | 'soap-notes'
  label: string
  href: string
  icon: ComponentType<{ size?: number; className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { key: 'ai-chat', label: 'AI Chat', href: '/clinician', icon: MessageSquare },
  { key: 'transcribe', label: 'Transcribe', href: '/transcribe', icon: FileAudio },
  { key: 'soap-notes', label: 'SOAP Notes', href: '/soap-notes', icon: ScrollText },
]

type FloatingSidebarNavProps = {
  anchor?: 'middle-left' | 'top-left'
  fadeOnScroll?: boolean
  theme?: 'sand' | 'night'
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/clinician') {
    return pathname === '/clinician'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function FloatingSidebarNav({
  anchor = 'middle-left',
  fadeOnScroll = false,
  theme = 'sand',
}: FloatingSidebarNavProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [navHidden, setNavHidden] = useState(false)

  const anchorClass =
    anchor === 'top-left'
      ? 'left-4 top-4 md:left-6 md:top-6'
      : 'left-4 top-1/2 -translate-y-1/2'
  const hideWithScroll = fadeOnScroll && navHidden
  const scrollFadeClass = fadeOnScroll
    ? navHidden
      ? 'pointer-events-none -translate-y-2 opacity-0'
      : 'translate-y-0 opacity-100'
    : ''
  const isNight = theme === 'night'
  const asideBaseClass = isNight
    ? 'border border-white/[0.12] bg-[rgba(17,17,17,0.75)] shadow-2xl'
    : 'bg-[#fff8ea]/90 shadow-[0_12px_40px_rgba(114,90,56,0.22)]'
  const labelClass = isNight ? 'text-slate-400' : 'text-slate-500'
  const toggleButtonClass = isNight
    ? 'border border-white/[0.08] bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]'
    : 'bg-white/70 text-slate-700 hover:bg-white'
  const inactiveItemClass = isNight
    ? 'border border-white/[0.08] bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]'
    : 'bg-white/70 text-slate-700 hover:bg-white'
  const activeItemClass = isNight
    ? 'bg-cyan-400 text-slate-950'
    : 'bg-sky-500 text-white'

  useEffect(() => {
    const detail: FloatingSidebarStateDetail = { open: sidebarOpen }
    window.dispatchEvent(new CustomEvent(FLOATING_SIDEBAR_STATE_EVENT, { detail }))
  }, [sidebarOpen])

  useEffect(() => {
    if (!fadeOnScroll) {
      return
    }

    const handleScroll = () => {
      setNavHidden(window.scrollY > 20)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [fadeOnScroll])

  return (
    <aside
      className={`fixed z-20 rounded-2xl backdrop-blur-xl transition-all duration-300 ${anchorClass} ${asideBaseClass} ${
        sidebarOpen ? 'w-56 p-3' : 'w-14 p-2'
      } ${hideWithScroll ? 'pointer-events-none -translate-y-2 opacity-0' : scrollFadeClass}`}
    >
      <div className="flex items-center justify-between">
        {sidebarOpen && (
          <p className={`px-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${labelClass}`}>
            Navigation
          </p>
        )}
        <button
          type="button"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition ${toggleButtonClass}`}
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {sidebarOpen && (
        <div className="mt-3 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActivePath(pathname, item.href)

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  active ? activeItemClass : inactiveItemClass
                }`}
              >
                <Icon size={16} className="mr-2" />
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </aside>
  )
}
