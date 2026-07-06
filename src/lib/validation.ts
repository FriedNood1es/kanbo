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
  notes: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
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
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;

export const moveApplicationSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(applicationStages),
  position: z.number().optional(),
});

export type MoveApplicationInput = z.infer<typeof moveApplicationSchema>;
