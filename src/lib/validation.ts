import { z } from "zod";

export const applicationStages = [
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
] as const;

export const applicationInputSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(200),
  role: z.string().trim().min(1, "Role is required").max(200),
  jobUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      // Most people type a bare domain ("facebook.com"); a URL requires a
      // scheme, so add one rather than rejecting otherwise-fine input.
      return /^https?:\/\//i.test(value) ? value : `https://${value}`;
    })
    .refine((value) => value === undefined || z.url().safeParse(value).success, {
      message: "Enter a valid URL",
    }),
  // Empty maps to `null`, not `undefined`, for the same reason as `followUpAt`
  // below: clearing the notes field in the edit form must actually erase an
  // existing note. Prisma treats `undefined` as "leave this field alone," so
  // returning `undefined` here would silently keep the old note.
  notes: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((v) => (v ? v : null)),
  appliedAt: z.coerce.date().optional(),
  // Explicitly nullable (not just optional) so clearing the field in the
  // edit form actually removes an existing follow-up date rather than
  // leaving the old one in place — Prisma treats `undefined` as "don't
  // touch this field" but `null` as "clear it."
  followUpAt: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : null))
    .refine((value) => value === null || !isNaN(value.getTime()), {
      message: "Enter a valid follow-up date",
    }),
}).refine((data) => data.appliedAt === undefined || data.appliedAt <= startOfTomorrowUtc(), {
  path: ["appliedAt"],
  message: "Applied date can't be in the future",
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// One day past start-of-today (UTC), used as an inclusive upper bound so the
// check never falsely rejects a user whose local "today" is a day ahead of
// UTC — the client's `max` on the date input does the exact local-time
// enforcement; this is only a backstop against clearly-future dates.
function startOfTomorrowUtc(): Date {
  const t = startOfTodayUtc();
  t.setUTCDate(t.getUTCDate() + 1);
  return t;
}

// Creating an application: a follow-up reminder can't be scheduled in the
// past. This lives on the create schema only, not the shared one — editing an
// application whose follow-up date has since passed must still work, and the
// overdue badge relies on those past dates continuing to exist.
export const createApplicationSchema = applicationInputSchema.refine(
  (data) => data.followUpAt === null || data.followUpAt >= startOfTodayUtc(),
  { path: ["followUpAt"], message: "Follow-up date can't be in the past" },
);

export const moveApplicationSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(applicationStages),
  position: z.number().optional(),
});

export type MoveApplicationInput = z.infer<typeof moveApplicationSchema>;
