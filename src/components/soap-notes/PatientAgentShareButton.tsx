'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Bot, Copy, ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PatientAgentShareButtonProps {
  shareToken: string
}

export function PatientAgentShareButton({ shareToken }: PatientAgentShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const relativeUrl = useMemo(() => `/patient/${shareToken}`, [shareToken])
  const [fullUrl, setFullUrl] = useState(relativeUrl)

  useEffect(() => {
    setFullUrl(`${window.location.origin}${relativeUrl}`)
  }, [relativeUrl])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Bot size={16} className="mr-2" />
        Patient&apos;s Agent
      </Button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#e5d7bf] bg-[#fff8ea] p-5 shadow-[0_22px_60px_rgba(52,39,19,0.28)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-slate-900">Share Patient&apos;s Agent</p>
                <p className="text-sm text-slate-600">
                  Send this link to your patient so they can chat with Synth AI for this visit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-white/80 p-1.5 text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rounded-xl border border-[#e3d1af] bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Share Link
              </p>
              <p className="mt-2 break-all text-sm text-slate-800">{fullUrl}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => void handleCopy()} className="bg-[#6f5530] text-white hover:bg-[#5b4422]">
                <Copy size={14} className="mr-2" />
                {copied ? 'Copied' : 'Copy Link'}
              </Button>
              <Button asChild variant="outline">
                <Link href={relativeUrl} target="_blank">
                  <ExternalLink size={14} className="mr-2" />
                  Open Agent
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
