import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Real authorization boundary — Proxy's check is optimistic only (see
// src/proxy.ts). Call this from every Server Action and every Server
// Component that touches application data.
export const requireUser = cache(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  return session.user;
});

export const getCurrentUser = cache(async () => {
  const session = await auth();
  return session?.user ?? null;
});
