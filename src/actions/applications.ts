"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { applicationInputSchema } from "@/lib/validation";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function createApplication(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = applicationInputSchema.safeParse(input);

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

export async function deleteApplication(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const result = await prisma.application.deleteMany({
    where: { id, userId: user.id },
  });

  if (result.count === 0) {
    return { success: false, error: "Application not found" };
  }

  revalidatePath("/board");
  return { success: true };
}
