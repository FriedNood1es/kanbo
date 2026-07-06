"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
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

export async function seedDemoApplications(): Promise<ActionResult> {
  const user = await requireUser();
  const stagePositions: Partial<Record<ApplicationStage, number>> = {};

  await prisma.$transaction(async (tx) => {
    for (const demo of demoApplications) {
      const currentStage = demo.history[demo.history.length - 1].stage;
      const position = stagePositions[currentStage] ?? 0;
      stagePositions[currentStage] = position + 1;

      const application = await tx.application.create({
        data: {
          userId: user.id,
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

  revalidatePath("/board");
  revalidatePath("/stats");
  return { success: true };
}
