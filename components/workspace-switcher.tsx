'use client'

import { useState, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { switchWorkspace } from '@/app/(app)/actions'

type Workspace = { id: string; name: string; slug: string }

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: Workspace[]
  activeWorkspaceId: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (workspaces.length === 1) {
    return (
      <div className="mt-6 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <b className="block truncate text-sm">{workspaces[0].name}</b>
        <small className="text-zinc-500">{workspaces[0].slug}</small>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <label className="sr-only" htmlFor="active-workspace">
        Switch workspace
      </label>
      <div className="relative">
        <select
          id="active-workspace"
          value={activeWorkspaceId}
          disabled={isPending}
          onChange={(event) => {
            const workspaceId = event.target.value
            setError(null)
            startTransition(async () => {
              const result = await switchWorkspace(workspaceId)
              if (!result.ok) {
                setError(result.message)
                return
              }
              router.push('/dashboard')
              router.refresh()
            })
          }}
          className="w-full appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-9 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-950"
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
