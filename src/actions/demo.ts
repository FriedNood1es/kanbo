"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { DEMO_EMAIL_DOMAIN } from "@/lib/demo-user";
import type { ApplicationStage } from "@/generated/prisma";
import type { ActionResult } from "./applications";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS);

type DemoApplication = {
  company: string;
  role: string;
  jobUrl?: string;
  notes?: string;
  followUpInDays?: number;
  // Days since the card was last touched. Absent means "just now" (Prisma
  // default) — set it on showcase cards whose badges (ghosted, stale) read
  // updatedAt, or every seeded row would look freshly active regardless of
  // how backdated its history is.
  updatedDaysAgo?: number;
  // Ordered oldest-first; the last entry is the application's current stage.
  history: { stage: ApplicationStage; daysAgo: number }[];
};

// Real, well-known company names so the favicon-guessing feature (name ->
// name.com) actually resolves to something recognizable in the demo.
const demoApplications: DemoApplication[] = [
  {
    company: "Netflix",
    role: "Frontend Engineer",
    jobUrl: "https://netflix.com/jobs",
    history: [{ stage: "APPLIED", daysAgo: 3 }],
  },
  {
    company: "GitHub",
    role: "DevOps Engineer",
    history: [{ stage: "APPLIED", daysAgo: 6 }],
  },
  {
    company: "Spotify",
    role: "Backend Engineer",
    notes:
      "Technical interview **next week**\n- Prep system design\n- Review their tech blog\n- Send referral a thank-you",
    followUpInDays: 3,
    history: [
      { stage: "APPLIED", daysAgo: 14 },
      { stage: "INTERVIEWING", daysAgo: 5 },
    ],
  },
  {
    company: "Airbnb",
    role: "Product Designer",
    history: [
      { stage: "APPLIED", daysAgo: 20 },
      { stage: "INTERVIEWING", daysAgo: 9 },
    ],
  },
  {
    company: "Stripe",
    role: "Software Engineer",
    notes: "Offer received — negotiating start date.",
    history: [
      { stage: "APPLIED", daysAgo: 30 },
      { stage: "INTERVIEWING", daysAgo: 20 },
      { stage: "OFFER", daysAgo: 8 },
    ],
  },
  {
    company: "Notion",
    role: "Full Stack Developer",
    history: [
      { stage: "APPLIED", daysAgo: 25 },
      { stage: "INTERVIEWING", daysAgo: 15 },
      { stage: "REJECTED", daysAgo: 10 },
    ],
  },
  // Showcase rows below: one per card state, so a demo visitor sees every
  // phase on first load — ghosted, stale, overdue, and a collapsed old
  // rejection with its archive stamp.
  {
    company: "Figma",
    role: "Product Engineer",
    history: [
      { stage: "APPLIED", daysAgo: 90 },
      { stage: "INTERVIEWING", daysAgo: 75 },
      { stage: "REJECTED", daysAgo: 63 },
    ],
    updatedDaysAgo: 63,
  },
  {
    company: "Discord",
    role: "Frontend Engineer",
    history: [{ stage: "APPLIED", daysAgo: 35 }],
    updatedDaysAgo: 35,
  },
  {
    company: "Vercel",
    role: "Solutions Architect",
    history: [
      { stage: "APPLIED", daysAgo: 30 },
      { stage: "INTERVIEWING", daysAgo: 20 },
    ],
    updatedDaysAgo: 20,
  },
  {
    company: "Reddit",
    role: "Backend Engineer",
    followUpInDays: -2,
    history: [{ stage: "APPLIED", daysAgo: 14 }],
    updatedDaysAgo: 14,
  },
];

async function seedDemoData(userId: string) {
  // One query per app: the transitions ride along as a nested write, which
  // Prisma runs as an implicit server-side transaction. This deliberately
  // avoids prisma.$transaction — ~30 sequential queries over the Neon
  // serverless driver exceed the 5s interactive-transaction timeout on prod
  // (P2028), and explicit transactions don't work in the adapter's HTTP mode.
  const stagePositions: Partial<Record<ApplicationStage, number>> = {};

  for (const demo of demoApplications) {
    const currentStage = demo.history[demo.history.length - 1].stage;
    const position = stagePositions[currentStage] ?? 0;
    stagePositions[currentStage] = position + 1;

    await prisma.application.create({
      data: {
        userId,
        company: demo.company,
        role: demo.role,
        jobUrl: demo.jobUrl,
        notes: demo.notes,
        stage: currentStage,
        position,
        appliedAt: daysAgo(demo.history[0].daysAgo),
        followUpAt: demo.followUpInDays !== undefined ? daysFromNow(demo.followUpInDays) : null,
        // Explicit only on showcase rows — undefined falls through to the
        // Prisma @updatedAt default (now).
        ...(demo.updatedDaysAgo !== undefined
          ? { updatedAt: daysAgo(demo.updatedDaysAgo) }
          : {}),
        transitions: {
          create: demo.history.map((step, i) => ({
            fromStage: i === 0 ? null : demo.history[i - 1].stage,
            toStage: step.stage,
            createdAt: daysAgo(step.daysAgo),
          })),
        },
      },
    });
  }
}

// Seed the sample board into the signed-in user's own account (offered from
// the empty state).
export async function seedDemoApplications(): Promise<ActionResult> {
  const user = await requireUser();
  await seedDemoData(user.id);

  revalidatePath("/board");
  revalidatePath("/stats");
  return { success: true };
}

// One-click "try it" login with no OAuth: mint a throwaway user, seed the
// sample board, and hand back a real database-backed session. This mirrors
// exactly what the Prisma adapter does on an OAuth sign-in — a Session row
// plus the Auth.js session cookie pointing at it — so requireUser() resolves
// the demo visitor like any other logged-in user.
export async function startDemoSession(): Promise<void> {
  const user = await prisma.user.create({
    data: {
      name: "Demo Visitor",
      email: `demo-${randomBytes(8).toString("hex")}@${DEMO_EMAIL_DOMAIN}`,
    },
  });

  await seedDemoData(user.id);

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + DAY_MS);
  await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });

  // Auth.js names the cookie __Secure-authjs.session-token when the request is
  // https and authjs.session-token otherwise (secure derived from url.protocol
  // in @auth/core). The x-forwarded-proto sniff is unreliable inside Server
  // Actions (absent or a list on some platforms), and a wrong guess means the
  // session row exists but auth() never sees it — so set both names and let
  // Auth.js read whichever one it expects. The extra cookie is ignored.
  const proto = (await headers()).get("x-forwarded-proto") ?? "";
  const isHttps = proto.split(",").some((p) => p.trim() === "https");
  const jar = await cookies();

  jar.set("__Secure-authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: true,
    expires,
  });
  jar.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isHttps,
    expires,
  });

  redirect("/board");
}
