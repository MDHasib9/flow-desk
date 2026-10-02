"use client";

import { useState } from "react";
import { getProjectFileDownloadUrl } from "@/app/(app)/actions";

export function ProjectFileDownload({
  id,
  fileName,
}: {
  id: string;
  fileName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const result = await getProjectFileDownloadUrl(id);
            if (!result.ok || !result.url) {
              setError(result.message ?? "The file could not be opened.");
              return;
            }
            window.location.assign(result.url);
          } catch (downloadError) {
            setError(
              downloadError instanceof Error
                ? downloadError.message
                : "The file could not be opened.",
            );
          } finally {
            setBusy(false);
          }
        }}
        className="max-w-full truncate text-left text-sm text-indigo-700 underline-offset-2 hover:underline disabled:opacity-50 dark:text-indigo-300"
      >
        {busy ? "Preparing download…" : fileName}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
