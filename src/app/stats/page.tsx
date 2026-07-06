import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { computeFunnelStats } from "@/lib/funnel";
import { applicationStages, type Stage } from "@/lib/stages";
import StatTile from "@/components/stats/StatTile";
import FunnelChart from "@/components/stats/FunnelChart";
import Button from "@/components/ui/Button";
import KanboMark from "@/components/ui/KanboMark";
import AccountMenu from "@/components/board/AccountMenu";
import ThemeToggle from "@/components/ui/ThemeToggle";

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function formatDays(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}d`;
}

export default async function StatsPage() {
  const user = await requireUser();

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: { transitions: { select: { toStage: true, createdAt: true } } },
  });

  const stageCounts = Object.fromEntries(
    applicationStages.map((stage) => [
      stage,
      applications.filter((a) => a.stage === stage).length,
    ]),
  ) as Record<Stage, number>;

  const stats = computeFunnelStats(applications, stageCounts);

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/sign-in" });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-card px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-2">
          <KanboMark className="h-8 w-8" />
          <span className="label-stamp text-xl font-semibold text-ink">Stats</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/board">
            <Button type="button" variant="secondary">
              ← Back to board
            </Button>
          </Link>
          <ThemeToggle />
          <AccountMenu
            image={user.image}
            label={user.email ?? user.name ?? "Account"}
            onSignOut={handleSignOut}
          />
        </div>
      </header>

      <div className="flex flex-col gap-8 p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Total applications" value={String(stats.total)} />
          <StatTile
            label="Interview rate"
            value={formatPercent(stats.interviewRate)}
            hint={`${stats.reachedInterviewing} of ${stats.total}`}
          />
          <StatTile
            label="Offer rate"
            value={formatPercent(stats.offerRate)}
            hint={`${stats.reachedOffer} of ${stats.reachedInterviewing}`}
          />
          <StatTile label="Avg. days to interview" value={formatDays(stats.avgDaysToInterview)} />
          <StatTile label="Avg. days to offer" value={formatDays(stats.avgDaysToOffer)} />
        </div>

        <div className="rounded-lg border border-line bg-ground-raised p-4 shadow-[inset_0_1px_3px_rgba(43,38,34,0.06)]">
          <h2 className="label-stamp mb-4 text-sm font-semibold text-ink-dim">Current pipeline</h2>
          <FunnelChart counts={stats.stageCounts} />
        </div>
      </div>
    </div>
  );
}
