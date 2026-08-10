"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { moveApplicationSchema } from "@/lib/validation";
import { decideStageChange } from "@/lib/transitions";
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
      // A drag back to the stage the current one came from (Applied ->
      // Interviewing -> Applied, e.g. a mistake) is an undo: delete the
      // forward transition so the funnel stats revert instead of still
      // counting the card as having reached Interviewing.
      const last = await tx.stageTransition.findFirst({
        where: { applicationId: id },
        orderBy: { createdAt: "desc" },
      });

      const decision = decideStageChange(
        last ? { fromStage: last.fromStage, toStage: last.toStage } : null,
        current.stage,
        stage,
      );

      if (decision.kind === "revert") {
        await tx.stageTransition.delete({ where: { id: last!.id } });
      } else {
        await tx.stageTransition.create({
          data: { applicationId: id, fromStage: current.stage, toStage: stage },
        });
      }
    }
  });

  revalidatePath("/board");
  return { success: true };
}
