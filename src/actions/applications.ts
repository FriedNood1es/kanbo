"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import type { ApplicationStage } from "@/generated/prisma";
import {
  applicationInputSchema,
  applicationStages,
  createApplicationSchema,
} from "@/lib/validation";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

// Everything undo needs to rebuild a deleted row bit-for-bit (new id, same
// position, same stage history) — handed back by deleteApplication.
export type ApplicationSnapshot = {
  company: string;
  role: string | null;
  jobUrl: string | null;
  notes: string | null;
  stage: ApplicationStage;
  position: number;
  appliedAt: Date;
  followUpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  transitions: {
    fromStage: ApplicationStage | null;
    toStage: ApplicationStage;
    createdAt: Date;
  }[];
};

export type DeleteApplicationResult =
  | { success: true; snapshot: ApplicationSnapshot }
  | { success: false; error: string };

export async function createApplication(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = createApplicationSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: {
        ...parsed.data,
        userId: user.id,
      },
    });

    // Seeds the stage-history log the funnel stats page reads from — every
    // application needs at least this one row, or it never shows up in any
    // conversion-rate math.
    await tx.stageTransition.create({
      data: { applicationId: application.id, fromStage: null, toStage: application.stage },
    });
  });

  revalidatePath("/board");
  return { success: true };
}

export async function updateApplicationDetails(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = applicationInputSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // updateMany (not update) so ownership is enforced by the where clause —
  // a mismatched userId is a silent no-op, not a leaked row.
  const result = await prisma.application.updateMany({
    where: { id, userId: user.id },
    data: parsed.data,
  });

  if (result.count === 0) {
    return { success: false, error: "Application not found" };
  }

  revalidatePath("/board");
  return { success: true };
}

export async function deleteApplication(id: string): Promise<DeleteApplicationResult> {
  const user = await requireUser();

  // Read before deleting so a successful delete can hand back everything
  // undo needs — the row plus its full stage history, keeping funnel stats
  // intact across a delete/undo round-trip.
  const existing = await prisma.application.findFirst({
    where: { id, userId: user.id },
    include: { transitions: { orderBy: { createdAt: "asc" } } },
  });

  if (!existing) {
    return { success: false, error: "Application not found" };
  }

  const result = await prisma.application.deleteMany({
    where: { id, userId: user.id },
  });

  if (result.count === 0) {
    return { success: false, error: "Application not found" };
  }

  revalidatePath("/board");
  return {
    success: true,
    snapshot: {
      company: existing.company,
      role: existing.role,
      jobUrl: existing.jobUrl,
      notes: existing.notes,
      stage: existing.stage,
      position: existing.position,
      appliedAt: existing.appliedAt,
      followUpAt: existing.followUpAt,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
      transitions: existing.transitions.map((t) => ({
        fromStage: t.fromStage,
        toStage: t.toStage,
        createdAt: t.createdAt,
      })),
    },
  };
}

const restoreSnapshotSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().max(200).nullable(),
  jobUrl: z.string().nullable(),
  notes: z.string().max(4000).nullable(),
  stage: z.enum(applicationStages),
  position: z.number(),
  appliedAt: z.coerce.date(),
  followUpAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  transitions: z
    .array(
      z.object({
        fromStage: z.enum(applicationStages).nullable(),
        toStage: z.enum(applicationStages),
        createdAt: z.coerce.date(),
      }),
    )
    .min(1),
});

// Restore a deleteApplication snapshot under a new id: same fields, same
// position (ordering restores exactly), same transition history (funnel
// stats never notice the round-trip). Single nested write, no explicit
// transaction — one query, implicitly atomic.
export async function restoreApplication(snapshot: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = restoreSnapshotSchema.safeParse(snapshot);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { transitions, ...fields } = parsed.data;
  await prisma.application.create({
    data: { ...fields, userId: user.id, transitions: { create: transitions } },
  });

  revalidatePath("/board");
  revalidatePath("/stats");
  return { success: true };
}
