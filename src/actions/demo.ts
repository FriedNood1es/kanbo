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
];

async function seedDemoData(userId: string) {
  const stagePositions: Partial<Record<ApplicationStage, number>> = {};

  await prisma.$transaction(async (tx) => {
    for (const demo of demoApplications) {
      const currentStage = demo.history[demo.history.length - 1].stage;
      const position = stagePositions[currentStage] ?? 0;
      stagePositions[currentStage] = position + 1;

      const application = await tx.application.create({
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
        },
      });

      let previousStage: ApplicationStage | null = null;
      for (const step of demo.history) {
        await tx.stageTransition.create({
          data: {
            applicationId: application.id,
            fromStage: previousStage,
            toStage: step.stage,
            createdAt: daysAgo(step.daysAgo),
          },
        });
        previousStage = step.stage;
      }
    }
  });
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
  // in @auth/core). Match that off the forwarded proto so the cookie we set is
  // the exact one auth() reads back.
  const isHttps = (await headers()).get("x-forwarded-proto") === "https";
  const cookieName = `${isHttps ? "__Secure-" : ""}authjs.session-token`;

  (await cookies()).set(cookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isHttps,
    expires,
  });

  redirect("/board");
}
