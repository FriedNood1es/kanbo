import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";
import KanbanBoard from "@/components/board/KanbanBoard";
import Button from "@/components/ui/Button";
import KanboMark from "@/components/ui/KanboMark";

export default async function BoardPage() {
  const user = await requireUser();

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { position: "asc" },
  });

  return (
    <div className="min-h-screen p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1">
            <KanboMark className="h-6 w-6" />
            <h1 className="label-stamp text-xl font-semibold text-ink">Kanbo</h1>
          </div>
          <p className="text-sm text-ink-dim">Signed in as {user.email ?? user.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/stats">
            <Button type="button" variant="secondary" size="sm">
              Stats
            </Button>
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/sign-in" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <KanbanBoard applications={applications} />
    </div>
  );
}
