import type { NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import { upsertUser } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user repo',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token
        token.githubId = String((profile as Record<string, unknown>).id ?? '')
        token.githubLogin = (profile as Record<string, unknown>).login as string ?? ''
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      if (session.user) {
        session.user.githubId = token.githubId
        session.user.githubLogin = token.githubLogin
      }
      return session
    },
    async signIn({ profile, account }) {
      if (!profile || !account) return false
      const ghProfile = profile as Record<string, unknown>
      try {
        await upsertUser({
          github_id: String(ghProfile.id ?? ''),
          github_login: (ghProfile.login as string) ?? '',
          name: (ghProfile.name as string) ?? null,
          avatar_url: (ghProfile.avatar_url as string) ?? null,
          email: (ghProfile.email as string) ?? null,
        })
        return true
      } catch (err) {
        console.error('[auth] Failed to upsert user:', err)
        return true // Still allow sign-in even if DB fails
      }
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
