import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { stageMeta } from "@/lib/stages";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const user = await requireUser();

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: [{ stage: "asc" }, { position: "asc" }],
  });

  const header = [
    "Company",
    "Role",
    "Stage",
    "Job URL",
    "Applied on",
    "Follow up on",
    "Notes",
    "Created at",
  ];

  const rows = applications.map((a) => [
    a.company,
    a.role,
    stageMeta[a.stage].label,
    a.jobUrl ?? "",
    a.appliedAt.toISOString().slice(0, 10),
    a.followUpAt ? a.followUpAt.toISOString().slice(0, 10) : "",
    a.notes ?? "",
    a.createdAt.toISOString().slice(0, 10),
  ]);

  const csv = toCsv([header, ...rows]);
  const filename = `kanbo-applications-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
