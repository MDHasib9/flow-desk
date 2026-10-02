"use client";

import { useState } from "react";
import { z } from "zod";
import { markNotificationRead } from "@/app/(app)/actions";

const notificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  created_at: z.string(),
  read_at: z.string().nullable().optional(),
});

export type NotificationItem = z.infer<typeof notificationSchema>;

export function NotificationList({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  const [items, setItems] = useState(
    notificationSchema.array().parse(notifications),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  return (
    <div>
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Updates relevant to you and your work.
      </p>
      <section className="mt-7 overflow-hidden rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {items.length ? (
          items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start justify-between gap-4 border-b p-4 last:border-0 dark:border-zinc-800 ${!n.read_at ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""}`}
            >
              <div>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-1 text-sm text-zinc-500">{n.message}</p>
                <p className="mt-2 text-xs text-zinc-400">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read_at && (
                <button
                  onClick={async () => {
                    const previous = items;
                    const readAt = new Date().toISOString();
                    setItems((x) =>
                      x.map((i) =>
                        i.id === n.id ? { ...i, read_at: readAt } : i,
                      ),
                    );
                    const result = await markNotificationRead(n.id);
                    if (!result.ok) {
                      setItems(previous);
                      setActionError(result.message);
                    } else {
                      setActionError(null);
                    }
                  }}
                  className="shrink-0 text-xs font-medium text-indigo-600"
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="p-8 text-center text-sm text-zinc-500">
            You’re all caught up.
          </p>
        )}
      </section>
      {actionError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {actionError}
        </p>
      )}
    </div>
  );
}
