"use client";
import { useState } from "react";
import { updateOrganization, updateProfile } from "@/app/(app)/actions";
export function SettingsForms({
  name,
  organizationName,
}: {
  name: string;
  organizationName: string;
}) {
  const [message, setMessage] = useState("");
  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Manage your workspace and personal preferences.
      </p>
      <div className="mt-7 grid max-w-2xl gap-5">
        <form
          action={async (f) =>
            setMessage(
              (await updateOrganization({ name: f.get("organization_name") }))
                .message,
            )
          }
          className="rounded-xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="font-medium">Organization profile</h2>
          <label className="mt-4 grid gap-1.5 text-sm">
            Organization name
            <input
              name="organization_name"
              defaultValue={organizationName}
              required
              className="rounded-lg border px-3 py-2 dark:bg-zinc-950"
            />
          </label>
          <button className="mt-4 rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-950">
            Save organization
          </button>
        </form>
        <form
          action={async (f) =>
            setMessage(
              (await updateProfile({ full_name: f.get("full_name") })).message,
            )
          }
          className="rounded-xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="font-medium">Profile</h2>
          <label className="mt-4 grid gap-1.5 text-sm">
            Full name
            <input
              name="full_name"
              defaultValue={name}
              required
              className="rounded-lg border px-3 py-2 dark:bg-zinc-950"
            />
          </label>
          <button className="mt-4 rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-950">
            Save profile
          </button>
        </form>
        {message && <p className="text-sm text-emerald-600">{message}</p>}
      </div>
    </div>
  );
}
