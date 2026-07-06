import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Optimistic check only — reads the session cookie, no DB access here (Proxy
// runs on every matched route). The real authorization check lives in
// src/lib/dal.ts and must be called from every Server Action / data-touching
// Server Component.
export const proxy = auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/board/:path*", "/stats/:path*"],
};
