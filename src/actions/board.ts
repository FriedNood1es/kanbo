"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { moveApplicationSchema } from "@/lib/validation";
import type { ActionResult } from "./applications";

// Narrowly scoped so the drag path (Phase C) stays fast — full-field edits
// go through updateApplicationDetails instead. Position is optional: the
// stage dropdown (Phase B) omits it and the card is appended to the end of
// the target column; drag-and-drop (Phase C) passes an explicit fractional
// position computed from the drop location.
export async function moveApplication(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = moveApplicationSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let { position } = parsed.data;
  const { id, stage } = parsed.data;

  const current = await prisma.application.findFirst({
    where: { id, userId: user.id },
  });

  if (!current) {
    return { success: false, error: "Application not found" };
  }

  if (position === undefined) {
    const last = await prisma.application.findFirst({
      where: { userId: user.id, stage },
      orderBy: { position: "desc" },
    });
    position = (last?.position ?? 0) + 1;
  }

  const stageChanged = current.stage !== stage;

  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id },
      data: { stage, position },
    });

    if (stageChanged) {
      await tx.stageTransition.create({
        data: { applicationId: id, fromStage: current.stage, toStage: stage },
      });
    }
  });

  revalidatePath("/board");
  return { success: true };
}
