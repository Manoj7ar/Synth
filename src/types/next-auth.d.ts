import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: string
      practiceName?: string | null
      specialty?: string | null
      onboardingCompletedAt?: string | null
      onboardingComplete?: boolean
      image?: string | null
    }
  }

  interface User {
    role: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
  }
}
