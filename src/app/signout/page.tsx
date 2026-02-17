'use client'

import Link from 'next/link'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogOut, ArrowLeft } from 'lucide-react'

export default function SignOutPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSignOut = async () => {
    setIsSubmitting(true)
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/4ce66827-b6c7-4a55-bcab-d3da8a13ff63-redcove-pro/assets/images/08-2.jpg')",
          backgroundSize: 'cover',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-cover bg-bottom pointer-events-none"
        style={{
          backgroundImage:
            "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/4ce66827-b6c7-4a55-bcab-d3da8a13ff63-redcove-pro/assets/images/daisies-4.png')",
          backgroundSize: 'cover',
        }}
      />
      <div aria-hidden="true" className="absolute inset-0 z-[2] bg-black/35" />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[3] pointer-events-none opacity-25"
        style={{
          backgroundImage:
            "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/4ce66827-b6c7-4a55-bcab-d3da8a13ff63-redcove-pro/assets/images/noise-3.png')",
          backgroundRepeat: 'repeat',
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl border-0 bg-white/12 text-white shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-md">
              <LogOut className="size-8 text-white" />
            </div>
            <CardTitle className="text-2xl tracking-tight text-white">Sign out</CardTitle>
            <CardDescription className="text-slate-100/85">
              End your current session on this device.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <Button
              onClick={handleSignOut}
              disabled={isSubmitting}
              className="w-full bg-sky-400 font-semibold text-slate-900 hover:bg-sky-300"
            >
              {isSubmitting ? 'Signing out...' : 'Sign out'}
            </Button>
            <Button
              asChild
              variant="ghost"
              className="w-full border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link href="/clinician">
                <ArrowLeft className="mr-2 size-4" />
                Stay signed in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
