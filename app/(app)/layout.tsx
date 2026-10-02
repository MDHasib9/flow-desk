import { redirect } from 'next/navigation'
import { createClient, throwIfSupabaseError } from '@/lib/server'
import { WorkspaceShell } from '@/components/workspace-shell'
import { getWorkspaceContext } from '@/lib/workspace'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  throwIfSupabaseError('Unable to verify session', userError)
  if (!user) redirect('/auth/login?next=/dashboard')
  const [{ memberships, current }, { data: profile, error: profileError }] =
    await Promise.all([
      getWorkspaceContext(supabase, user.id),
      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    ])
  throwIfSupabaseError('Unable to load profile', profileError)
  if (!current) redirect('/onboarding')
  const organization = Array.isArray(current.organizations)
    ? current.organizations[0]
    : current.organizations
  if (!organization) throw new Error('The active workspace could not be loaded.')
  const workspaces = memberships.flatMap((membership) => {
    const item = Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations
    return item ? [{ ...item, id: membership.organization_id }] : []
  })
  return (
    <WorkspaceShell
      user={{
        email: user.email ?? '',
        name:
          profile?.full_name ||
          user.user_metadata.full_name ||
          user.email?.split('@')[0] ||
          'Account',
      }}
      organization={organization}
      role={current.role}
      workspaces={workspaces}
      activeWorkspaceId={current.organization_id}
    >
      {children}
    </WorkspaceShell>
  )
}
