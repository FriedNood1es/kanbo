"use client";

import { useRef, useState, useTransition } from "react";
import type { Application } from "@/generated/prisma";
import { createApplication, updateApplicationDetails } from "@/actions/applications";

function toDateInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

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
        className="w-full max-w-md rounded-lg p-0 backdrop:bg-black/40"
        onClose={() => setError(null)}
      >
        <form action={handleSubmit} className="flex flex-col gap-3 p-5">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit application" : "Add application"}
          </h2>

          <label className="flex flex-col gap-1 text-sm">
            Company
            <input
              name="company"
              required
              defaultValue={application?.company}
              className="rounded-md border px-3 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Role
            <input
              name="role"
              required
              defaultValue={application?.role}
              className="rounded-md border px-3 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Job URL
            <input
              name="jobUrl"
              type="text"
              placeholder="facebook.com/jobs/…"
              defaultValue={application?.jobUrl ?? ""}
              className="rounded-md border px-3 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Applied on
            <input
              name="appliedAt"
              type="date"
              defaultValue={toDateInputValue(application?.appliedAt)}
              className="rounded-md border px-3 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Notes
            <textarea
              name="notes"
              rows={3}
              defaultValue={application?.notes ?? ""}
              className="rounded-md border px-3 py-1.5"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
