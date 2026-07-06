import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";
import BoardShell from "@/components/board/BoardShell";

export default async function BoardPage() {
  const user = await requireUser();

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { position: "asc" },
  });

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/sign-in" });
  }

  return (
    <BoardShell
      applications={applications}
      userImage={user.image}
      userLabel={user.email ?? user.name ?? "Account"}
      onSignOut={handleSignOut}
    />
  );
}
