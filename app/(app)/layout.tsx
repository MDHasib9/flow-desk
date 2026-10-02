import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { WorkspaceShell } from '@/components/workspace-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/dashboard')
  const { data: memberships } = await supabase.from('organization_members').select('role, organizations(id,name,slug)').limit(1)
  const first = memberships?.[0] as { role: string; organizations: { id: string; name: string; slug: string } } | undefined
  if (!first) redirect('/onboarding')
  return <WorkspaceShell user={{ email: user.email ?? '', name: user.user_metadata.full_name ?? user.email?.split('@')[0] ?? 'Account' }} organization={first.organizations} role={first.role}>{children}</WorkspaceShell>
}
