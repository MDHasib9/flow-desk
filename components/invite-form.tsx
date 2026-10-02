"use client";
import { useState } from "react";
import { inviteMember } from "@/app/(app)/actions";
export function InviteForm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
      >
        Invite member
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
          <form
            action={async (f) => {
              const result = await inviteMember({
                email: f.get("email"),
                role: f.get("role"),
              });
              setMessage(result.message);
              if (result.ok) setTimeout(() => setOpen(false), 900);
            }}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900"
          >
            <h2 className="font-semibold">Invite a teammate</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Create a secure, expiring invitation for your workspace.
            </p>
            <div className="mt-5 grid gap-3">
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="teammate@company.com"
                className="rounded-lg border px-3 py-2 dark:bg-zinc-950"
              />
              <select
                name="role"
                className="rounded-lg border px-3 py-2 dark:bg-zinc-950"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
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
                Create invitation
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
