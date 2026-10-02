"use client";
import { useState } from "react";
import { changeMemberRole, removeMember } from "@/app/(app)/actions";
export function MemberControls({ id, role }: { id: string; role: string }) {
  const [message, setMessage] = useState("");
  if (role === "OWNER")
    return <span className="text-xs text-zinc-500">Owner</span>;
  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={role}
        onChange={async (e) =>
          setMessage(
            (await changeMemberRole(id, e.target.value as "ADMIN" | "MEMBER"))
              .message,
          )
        }
        className="rounded border bg-transparent px-2 py-1 text-xs"
      >
        <option>MEMBER</option>
        <option>ADMIN</option>
      </select>
      <button
        onClick={async () => {
          if (confirm("Remove this member from the workspace?"))
            setMessage((await removeMember(id)).message);
        }}
        className="text-xs text-red-600"
      >
        Remove
      </button>
      {message && (
        <span className="hidden text-xs text-zinc-500 lg:inline">
          {message}
        </span>
      )}
    </div>
  );
}
