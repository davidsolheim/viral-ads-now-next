import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db';
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from '@/db/schema';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY!,
      from: process.env.RESEND_FROM_EMAIL!,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
  },
  callbacks: {
    async session({ session, token, user }) {
      if (session.user) {
        // Get user ID from token or user parameter
        const userId = token?.sub || user?.id;
        if (userId) {
          session.user.id = userId;
          // Add active organization to session if available
          const userWithOrg = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, userId),
            columns: {
              activeOrganizationId: true,
            },
          });
          if (userWithOrg?.activeOrganizationId) {
            session.user.activeOrganizationId = userWithOrg.activeOrganizationId;
          }
        }
      }
      return session;
    },
  },
  session: {
    strategy: 'database',
  },
});
