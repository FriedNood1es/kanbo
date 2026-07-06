import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";
import KanbanBoard from "@/components/board/KanbanBoard";

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
          <h1 className="text-xl font-semibold">Job Tracker</h1>
          <p className="text-sm text-neutral-500">
            Signed in as {user.email ?? user.name}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/sign-in" });
          }}
        >
          <button type="submit" className="text-sm underline">
            Sign out
          </button>
        </form>
      </header>

      <KanbanBoard applications={applications} />
    </div>
  );
}
