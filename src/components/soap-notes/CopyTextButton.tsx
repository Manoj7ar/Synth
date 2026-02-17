'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface CopyTextButtonProps {
  value: string
  label?: string
}

export function CopyTextButton({ value, label = 'Copy' }: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Ignore clipboard failure and keep UI unchanged.
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? 'Copied' : label}
    </Button>
  )
}
