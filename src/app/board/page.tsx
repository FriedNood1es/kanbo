import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { isDemoEmail } from "@/lib/demo-user";
import { latestStageEntry } from "@/lib/transitions";
import { REJECTED_COLLAPSE_DAYS, daysSince, isGhosted } from "@/lib/staleness";
import BoardShell from "@/components/board/BoardShell";

export default async function BoardPage() {
  const user = await requireUser();

  const isDemo = isDemoEmail(user.email);

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { position: "asc" },
    include: { transitions: { select: { toStage: true, createdAt: true } } },
  });

  // Rejected cards old enough to collapse, with their age in days for the
  // "Rejected 2 mo ago" stamp — computed from each card's latest entry into
  // REJECTED, so an old rejection stays collapsed even if the card was edited
  // since. Cards with no REJECTED transition stay visible (fail-open, never
  // fail-hidden).
  const olderRejected = applications.flatMap((a) => {
    if (a.stage !== "REJECTED") return [];
    const rejectedAt = latestStageEntry(a.transitions, "REJECTED");
    if (rejectedAt === null) return [];
    const daysAgo = daysSince(rejectedAt);
    return daysAgo >= REJECTED_COLLAPSE_DAYS ? [{ id: a.id, daysAgo }] : [];
  });

  // Ghosted cards tuck behind their own toggle for the same reason — same
  // rule as the badge (untracked silence only), so the two can never
  // disagree about which cards are ghosts.
  const ghostedIds = applications
    .filter((a) => a.followUpAt === null && isGhosted(a.stage, a.updatedAt))
    .map((a) => a.id);

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/sign-in" });
  }

  return (
    <BoardShell
      applications={applications}
      olderRejected={olderRejected}
      ghostedIds={ghostedIds}
      userImage={user.image}
      userLabel={isDemo ? "Demo Visitor" : user.email ?? user.name ?? "Account"}
      isDemo={isDemo}
      onSignOut={handleSignOut}
    />
  );
}
