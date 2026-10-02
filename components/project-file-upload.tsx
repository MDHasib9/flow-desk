"use client";

import { useState } from "react";
import { createClient } from "@/lib/client";
import { saveProjectFile } from "@/app/(app)/actions";

const maxFileSize = 100 * 1024 * 1024;

export function ProjectFileUpload({
  organizationId,
  projectId,
}: {
  organizationId: string;
  projectId: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-3">
      <label className="inline-flex cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium">
        <input
          type="file"
          className="hidden"
          disabled={busy}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.xlsx"
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            setMessage("");

            if (file.size > maxFileSize) {
              setMessage("Files must be 100 MB or smaller.");
              input.value = "";
              return;
            }

            setBusy(true);
            const key = `${organizationId}/${projectId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const supabase = createClient();
            let uploaded = false;

            try {
              const { error: uploadError } = await supabase.storage
                .from("flowdesk-project-files")
                .upload(key, file, { contentType: file.type });

              if (uploadError) throw new Error(uploadError.message);
              uploaded = true;

              const result = await saveProjectFile({
                project_id: projectId,
                file_name: file.name,
                file_path: key,
                file_type: file.type || null,
                file_size: file.size,
              });

              if (!result.ok) {
                const { error: cleanupError } = await supabase.storage
                  .from("flowdesk-project-files")
                  .remove([key]);
                uploaded = Boolean(cleanupError);
                setMessage(
                  cleanupError
                    ? `${result.message} The uploaded file could not be removed: ${cleanupError.message}`
                    : result.message,
                );
                return;
              }

              uploaded = false;
              setMessage(result.message);
            } catch (error) {
              let cleanupMessage = "";
              if (uploaded) {
                try {
                  const { error: cleanupError } = await supabase.storage
                    .from("flowdesk-project-files")
                    .remove([key]);
                  if (cleanupError) {
                    cleanupMessage = ` The uploaded file could not be removed: ${cleanupError.message}`;
                  }
                } catch (cleanupError) {
                  cleanupMessage = ` The uploaded file could not be removed: ${
                    cleanupError instanceof Error
                      ? cleanupError.message
                      : "unknown error"
                  }`;
                }
              }
              setMessage(
                `${
                  error instanceof Error
                    ? error.message
                    : "The file could not be uploaded."
                }${cleanupMessage}`,
              );
            } finally {
              setBusy(false);
              input.value = "";
            }
          }}
        />{" "}
        {busy ? "Uploading…" : "Upload file"}
      </label>
      {message && (
        <p role="status" className="mt-2 text-xs text-zinc-500">
          {message}
        </p>
      )}
    </div>
  );
}
