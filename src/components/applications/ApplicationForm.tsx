"use client";

import { useRef, useState, useTransition } from "react";
import type { Application } from "@/generated/prisma";
import { createApplication, updateApplicationDetails } from "@/actions/applications";
import Button from "@/components/ui/Button";

function toDateInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

const fieldClass =
  "rounded-md border border-line bg-ground px-3 py-2 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const labelClass = "label-stamp flex flex-col gap-1 text-sm text-ink-dim";
const hintClass = "-mt-0.5 font-sans text-xs normal-case tracking-normal text-ink-faint";

export default function ApplicationForm({
  application,
  trigger,
}: {
  application?: Application;
  trigger: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEditing = !!application;

  function close() {
    dialogRef.current?.close();
    setError(null);
  }

  function handleSubmit(formData: FormData) {
    const input = {
      company: String(formData.get("company") ?? ""),
      role: String(formData.get("role") ?? ""),
      jobUrl: String(formData.get("jobUrl") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      appliedAt: formData.get("appliedAt") ? String(formData.get("appliedAt")) : undefined,
      followUpAt: String(formData.get("followUpAt") ?? ""),
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateApplicationDetails(application.id, input)
        : await createApplication(input);

      if (!result.success) {
        setError(result.error);
        return;
      }

      close();
    });
  }

  return (
    <>
      <span onClick={() => dialogRef.current?.showModal()}>{trigger}</span>
      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-lg border border-line bg-card p-0 text-ink backdrop:bg-ink/30"
        onClose={() => setError(null)}
      >
        <form action={handleSubmit} className="flex flex-col gap-3 p-5">
          <h2 className="text-lg font-semibold text-ink">
            {isEditing ? "Edit application" : "Add application"}
          </h2>

          <label className={labelClass}>
            Company
            <input
              name="company"
              required
              defaultValue={application?.company}
              className={`${fieldClass} font-sans text-[0.95rem] normal-case tracking-normal`}
            />
          </label>

          <label className={labelClass}>
            Role
            <input
              name="role"
              required
              defaultValue={application?.role}
              className={`${fieldClass} font-sans text-[0.95rem] normal-case tracking-normal`}
            />
          </label>

          <label className={labelClass}>
            Job URL
            <input
              name="jobUrl"
              type="text"
              placeholder="facebook.com/jobs/…"
              defaultValue={application?.jobUrl ?? ""}
              className={`${fieldClass} font-sans text-[0.95rem] normal-case tracking-normal`}
            />
            <p className={hintClass}>
              We&rsquo;ll try to show the company&rsquo;s logo automatically from this.
            </p>
          </label>

          <label className={labelClass}>
            Applied on
            <input
              name="appliedAt"
              type="date"
              defaultValue={toDateInputValue(application?.appliedAt)}
              className={`${fieldClass} font-sans text-[0.95rem] normal-case tracking-normal`}
            />
          </label>

          <label className={labelClass}>
            Follow up on
            <input
              name="followUpAt"
              type="date"
              defaultValue={toDateInputValue(application?.followUpAt)}
              className={`${fieldClass} font-sans text-[0.95rem] normal-case tracking-normal`}
            />
            <p className={hintClass}>
              We&rsquo;ll flag this card if the date passes without an update.
            </p>
          </label>

          <label className={labelClass}>
            Notes
            <textarea
              name="notes"
              rows={3}
              defaultValue={application?.notes ?? ""}
              className={`${fieldClass} font-sans text-[0.95rem] normal-case tracking-normal`}
            />
          </label>

          {error && <p className="text-sm text-stage-rejected">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
