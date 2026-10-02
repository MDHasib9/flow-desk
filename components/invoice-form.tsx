"use client";
import { useState } from "react";
import { createInvoice } from "@/app/(app)/actions";
export function InvoiceForm({
  customers,
}: {
  customers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  if (!customers.length)
    return (
      <span className="text-sm text-zinc-500">
        Add a customer before invoicing.
      </span>
    );
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
      >
        + Create invoice
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
          <form
            action={async (f) => {
              const r = await createInvoice({
                customer_id: f.get("customer_id"),
                subtotal: f.get("subtotal"),
                tax: f.get("tax"),
                due_date: f.get("due_date"),
                notes: f.get("notes"),
              });
              setMessage(r.message);
              if (r.ok) setTimeout(() => setOpen(false), 600);
            }}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
          >
            <h2 className="font-semibold">Create invoice</h2>
            <div className="mt-5 grid gap-4">
              <select
                name="customer_id"
                className="rounded-lg border px-3 py-2 dark:bg-zinc-950"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <label className="grid gap-1 text-sm">
                Subtotal
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  name="subtotal"
                  className="rounded-lg border px-3 py-2 dark:bg-zinc-950"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Tax
                <input
                  defaultValue="0"
                  min="0"
                  step="0.01"
                  type="number"
                  name="tax"
                  className="rounded-lg border px-3 py-2 dark:bg-zinc-950"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Due date
                <input
                  type="date"
                  name="due_date"
                  className="rounded-lg border px-3 py-2 dark:bg-zinc-950"
                />
              </label>
            </div>
            {message && <p className="mt-3 text-sm">{message}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">
                Create invoice
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
