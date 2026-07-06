import type { DefaultSession } from "next-auth";

// The session callback in src/lib/auth.ts always attaches user.id — this
// augmentation makes that non-optional in the type, matching runtime reality.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
