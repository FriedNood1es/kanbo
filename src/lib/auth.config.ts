import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

// Edge-safe config: providers and pages only, no adapter/DB access here.
export const authConfig = {
  providers: [GitHub],
  pages: {
    signIn: "/sign-in",
  },
} satisfies NextAuthConfig;
