import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

// allowDangerousEmailAccountLinking: multiple providers sharing one email
// should land on the same account rather than silently creating a second
// one — the risk this normally guards against (an attacker registering an
// unverified email at another provider to hijack an account) applies to
// multi-tenant products with untrusted sign-ups, not sign-in methods for a
// single known user.
export const authConfig = {
  providers: [GitHub, Google({ allowDangerousEmailAccountLinking: true })],
  pages: {
    signIn: "/sign-in",
  },
} satisfies NextAuthConfig;
