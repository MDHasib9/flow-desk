"use client";

import { useState } from "react";
import { z } from "zod";
import { updateCustomer, updateProject } from "@/app/(app)/actions";

const customerRecordSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  status: z.string().optional(),
});

const customerFormSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().or(z.literal("")),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
});

const projectRecordSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]),
  deadline: z.string().nullable().optional(),
});

const projectFormSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]),
  deadline: z.string().date().optional().or(z.literal("")),
});

export type CustomerRecord = z.infer<typeof customerRecordSchema>;
export type ProjectRecord = z.infer<typeof projectRecordSchema>;

export function CustomerEditor({ customer }: { customer: CustomerRecord }) {
  const record = customerRecordSchema.parse(customer);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const fields = [
    ["name", "Name"],
    ["email", "Email"],
    ["company", "Company"],
    ["phone", "Phone"],
  ] as const;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border px-3 py-2 text-sm"
      >
        Edit customer
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
          <form
            action={async (f) => {
              const values = customerFormSchema.parse({
                name: String(f.get("name") ?? ""),
                email: String(f.get("email") ?? ""),
                company: String(f.get("company") ?? ""),
                phone: String(f.get("phone") ?? ""),
              });
              setMessage((await updateCustomer(record.id, values)).message);
            }}
            className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-zinc-900"
          >
            <h2 className="font-semibold">Edit customer</h2>
            <div className="mt-4 grid gap-3">
              {fields.map(([key, label]) => (
                <label key={key} className="grid gap-1 text-sm">
                  {label}
                  <input
                    name={key}
                    defaultValue={record[key] ?? ""}
                    className="rounded-lg border px-3 py-2 dark:bg-zinc-950"
                  />
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">{message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-sm"
              >
                Close
              </button>
              <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function ProjectEditor({ project }: { project: ProjectRecord }) {
  const record = projectRecordSchema.parse(project);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border px-3 py-2 text-sm"
      >
        Edit project
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
          <form
            action={async (f) => {
              const values = projectFormSchema.parse({
                name: String(f.get("name") ?? ""),
                description: String(f.get("description") ?? ""),
                status: String(f.get("status") ?? "PLANNING"),
                deadline: String(f.get("deadline") ?? ""),
              });
              setMessage((await updateProject(record.id, values)).message);
            }}
            className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-zinc-900"
          >
            <h2 className="font-semibold">Edit project</h2>
            <div className="mt-4 grid gap-3">
              <input
                name="name"
                defaultValue={record.name}
                className="rounded-lg border px-3 py-2 dark:bg-zinc-950"
              />
              <textarea
                name="description"
                defaultValue={record.description ?? ""}
                className="min-h-24 rounded-lg border px-3 py-2 dark:bg-zinc-950"
              />
              <select
                name="status"
                defaultValue={record.status}
                className="rounded-lg border px-3 py-2 dark:bg-zinc-950"
              >
                {[
                  "PLANNING",
                  "ACTIVE",
                  "ON_HOLD",
                  "COMPLETED",
                  "CANCELLED",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <input
                type="date"
                name="deadline"
                defaultValue={record.deadline ?? ""}
                className="rounded-lg border px-3 py-2 dark:bg-zinc-950"
              />
            </div>
            <p className="mt-3 text-xs text-zinc-500">{message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-sm"
              >
                Close
              </button>
              <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
