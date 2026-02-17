'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'

interface FinalizeButtonProps {
  visitId: string
}

export function FinalizeButton({ visitId }: FinalizeButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleFinalize = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/finalize-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to finalize')
      }

      const data = await res.json()
      setResult(data)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to finalize visit')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-green-600 font-medium">Visit finalized!</span>
        {result.shareLink && (
          <a
            href={`/patient/${result.shareLink}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 underline"
          >
            Open Patient Link
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-sm text-red-600">{error}</span>}
      <Button onClick={handleFinalize} disabled={loading}>
        {loading ? (
          <>
            <Loader2 size={18} className="mr-2 animate-spin" />
            Finalizing...
          </>
        ) : (
          <>
            <CheckCircle size={18} className="mr-2" />
            Finalize Visit
          </>
        )}
      </Button>
    </div>
  )
}
