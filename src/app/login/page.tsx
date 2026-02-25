'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type AuthMode = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('signin')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [signInError, setSignInError] = useState('')

  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [signUpError, setSignUpError] = useState('')

  async function parseErrorMessage(res: Response, fallback: string) {
    try {
      const data = (await res.json()) as { error?: unknown }
      return typeof data.error === 'string' && data.error.trim() ? data.error : fallback
    } catch {
      return fallback
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSignInError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setSignInError('Invalid credentials')
      setLoading(false)
      return
    }

    router.push('/clinician')
    router.refresh()
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignUpError('')
    setSignInError('')

    const normalizedName = signupName.trim()
    const normalizedEmail = signupEmail.trim().toLowerCase()

    if (signupPassword !== signupConfirm) {
      setSignUpError('Passwords do not match')
      return
    }

    if (!normalizedName || !normalizedEmail || !signupPassword) {
      setSignUpError('Please complete all fields')
      return
    }

    setLoading(true)
    try {
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          password: signupPassword,
        }),
      })

      if (!signupResponse.ok) {
        setSignUpError(
          await parseErrorMessage(signupResponse, 'Unable to create account right now')
        )
        setLoading(false)
        return
      }

      const result = await signIn('credentials', {
        email: normalizedEmail,
        password: signupPassword,
        redirect: false,
      })

      if (result?.error) {
        setSignUpError('Account created, but sign-in failed. Please log in manually.')
        setLoading(false)
        return
      }

      router.push('/clinician/onboarding')
      router.refresh()
    } catch {
      setSignUpError('Unable to create account right now')
      setLoading(false)
    }
  }

  const quickLogin = async (loginEmail: string, loginPassword: string) => {
    setLoading(true)
    setSignInError('')

    const result = await signIn('credentials', {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    })

    if (result?.error) {
      setSignInError('Login failed')
      setLoading(false)
      return
    }

    router.push('/clinician')
    router.refresh()
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
            <CardTitle className="text-2xl tracking-tight text-white">Synth</CardTitle>
            <CardDescription className="text-slate-100/85">
              AI-powered medical visit assistant
            </CardDescription>

            <div className="mt-4 grid grid-cols-2 rounded-xl bg-white/10 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setSignUpError('')
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === 'signin'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup')
                  setSignInError('')
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {mode === 'signin' ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-white/90">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="border-0 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-sky-300 focus-visible:ring-offset-0"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-white/90">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      className="border-0 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-sky-300 focus-visible:ring-offset-0"
                      required
                    />
                  </div>

                  {signInError && (
                    <div className="rounded-lg border border-red-300/40 bg-red-500/20 p-3 text-sm text-red-100">
                      {signInError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-sky-400 font-semibold text-slate-900 hover:bg-sky-300"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>

                <div className="pt-5">
                  <p className="mb-3 text-sm text-white/85">Quick access</p>
                  <Button
                    variant="ghost"
                    className="w-full justify-start border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    onClick={() => quickLogin('admin@synth.health', 'synth2025')}
                    disabled={loading}
                  >
                    Tester
                  </Button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-white/90">
                    Full Name
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Jane Doe"
                    className="border-0 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-sky-300 focus-visible:ring-offset-0"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-white/90">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="name@clinic.com"
                    className="border-0 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-sky-300 focus-visible:ring-offset-0"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-white/90">
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a password"
                    className="border-0 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-sky-300 focus-visible:ring-offset-0"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-confirm" className="text-white/90">
                    Confirm Password
                  </Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    value={signupConfirm}
                    onChange={(e) => setSignupConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className="border-0 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-sky-300 focus-visible:ring-offset-0"
                    required
                  />
                </div>

                {signUpError && (
                  <div className="rounded-lg border border-red-300/40 bg-red-500/20 p-3 text-sm text-red-100">
                    {signUpError}
                  </div>
                )}

                  <Button
                  type="submit"
                  className="w-full bg-sky-400 font-semibold text-slate-900 hover:bg-sky-300"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
