import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  callbacks: {
    // Auth.js's default session callback only forwards name/email/image —
    // user.id has to be attached explicitly or every downstream query that
    // scopes by userId silently breaks.
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
