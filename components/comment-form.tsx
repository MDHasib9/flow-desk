"use client";
import { useState } from "react";
import { addTaskComment } from "@/app/(app)/actions";
export function CommentForm({ taskId }: { taskId: string }) {
  const [message, setMessage] = useState("");
  return (
    <form
      action={async (f) => {
        const result = await addTaskComment({
          task_id: taskId,
          content: f.get("content"),
        });
        setMessage(result.message);
      }}
      className="mt-5"
    >
      <textarea
        name="content"
        required
        maxLength={4000}
        placeholder="Write a comment…"
        className="min-h-24 w-full rounded-lg border bg-white p-3 text-sm dark:bg-zinc-950"
      />
      <div className="mt-2 flex justify-between">
        <p className="text-xs text-zinc-500">{message}</p>
        <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
          Add comment
        </button>
      </div>
    </form>
  );
}
