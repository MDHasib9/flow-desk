import 'server-only'

import { cookies } from 'next/headers'
import { createClient, throwIfSupabaseError } from '@/lib/server'

export const activeWorkspaceCookie = 'flowdesk-active-workspace'

export async function getWorkspaceContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId?: string,
) {
  let currentUserId = userId
  if (!currentUserId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    throwIfSupabaseError('Unable to verify workspace user', userError)
    currentUserId = user?.id
  }

  if (!currentUserId) {
    return { memberships: [], current: null }
  }

  const [{ data, error }, cookieStore] = await Promise.all([
    supabase
      .from('organization_members')
      .select('id, organization_id, role, organizations(id, name, slug)')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: true }),
    cookies(),
  ])

  throwIfSupabaseError('Unable to load workspace memberships', error)

  const memberships = data ?? []
  const selectedId = cookieStore.get(activeWorkspaceCookie)?.value
  const current =
    memberships.find((membership) => membership.organization_id === selectedId) ??
    memberships[0] ??
    null

  return { memberships, current }
}

export async function requireActiveWorkspace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId?: string,
) {
  const { current } = await getWorkspaceContext(supabase, userId)
  if (!current) throw new Error('No workspace is available for this account.')
  return current
}
