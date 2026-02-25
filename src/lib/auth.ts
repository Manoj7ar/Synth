import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
        intent: { label: 'Intent', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.trim().toLowerCase()
        const password = credentials.password
        const providedName = typeof credentials.name === 'string' ? credentials.name.trim() : ''
        const intent = typeof credentials.intent === 'string' ? credentials.intent : 'signin'

        if (!email || !password) {
          return null
        }

        // Demo auth mode: accept any credentials and auto-provision clinician users.
        // Passwords are stored only so Prisma/NextAuth data remains structurally valid.
        let user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          const passwordHash = await bcrypt.hash(password, 10)
          user = await prisma.user.create({
            data: {
              email,
              passwordHash,
              role: 'clinician',
              name: providedName || null,
            },
          })
        } else if (intent === 'signup' && providedName && user.name !== providedName) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              name: providedName,
            },
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        if (token.sub) {
          session.user.id = token.sub
        }
        if (typeof token.email === 'string') {
          session.user.email = token.email
        }
        if (token.role) {
          session.user.role = token.role
        }

        if (token.sub) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.sub },
              select: {
                email: true,
                name: true,
                role: true,
                practiceName: true,
                specialty: true,
                onboardingCompletedAt: true,
              },
            })

            if (dbUser) {
              session.user.email = dbUser.email
              session.user.name = dbUser.name
              session.user.role = dbUser.role
              session.user.practiceName = dbUser.practiceName
              session.user.specialty = dbUser.specialty
              session.user.onboardingCompletedAt = dbUser.onboardingCompletedAt?.toISOString() ?? null
              session.user.onboardingComplete = Boolean(dbUser.onboardingCompletedAt)
            } else {
              session.user.practiceName = null
              session.user.specialty = null
              session.user.onboardingCompletedAt = null
              session.user.onboardingComplete = false
            }
          } catch (error) {
            // Compatibility fallback if a local/demo SQLite file hasn't applied the profile columns yet.
            console.warn('Session profile hydration fallback:', error)
            const legacyUser = await prisma.user.findUnique({
              where: { id: token.sub },
              select: {
                email: true,
                name: true,
                role: true,
              },
            })

            if (legacyUser) {
              session.user.email = legacyUser.email
              session.user.name = legacyUser.name
              session.user.role = legacyUser.role
            }
            session.user.practiceName = null
            session.user.specialty = null
            session.user.onboardingCompletedAt = null
            // Avoid login redirect loops when schema is behind; onboarding fields can be added after migration.
            session.user.onboardingComplete = true
          }
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt'
  }
}
