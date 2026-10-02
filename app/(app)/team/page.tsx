import { createClient, throwIfSupabaseError } from '@/lib/server'
import { InviteForm } from '@/components/invite-form'
import { MemberControls } from '@/components/member-controls'
import Link from 'next/link'
import { requireActiveWorkspace } from '@/lib/workspace'

export default async function Page() {
  const supabase = await createClient()
  const workspace = await requireActiveWorkspace(supabase)
  const [
    { data: members, error: membersError },
    { data: invitations, error: invitationsError },
  ] = await Promise.all([
    supabase.from('organization_members').select('id, user_id, role, created_at').eq('organization_id', workspace.organization_id).order('created_at'),
    supabase.from('invitations').select('id, email, role, token, expires_at').eq('organization_id', workspace.organization_id).is('accepted_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }),
  ])
  throwIfSupabaseError('Unable to load workspace members', membersError)
  throwIfSupabaseError('Unable to load invitations', invitationsError)
  const memberIds = (members ?? []).map((member) => member.user_id)
  const { data: profiles, error: profilesError } = memberIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', memberIds)
    : { data: [], error: null }
  throwIfSupabaseError('Unable to load member profiles', profilesError)
  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  )
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="mt-1 text-sm text-zinc-500">
            People with access to this workspace.
          </p>
        </div>
        <InviteForm />
      </div>
      <section className="mt-7 overflow-hidden rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {members?.length ? (
          members.map((member) => {
            const profile = profilesById.get(member.user_id)
            return (
              <div
                className="flex items-center justify-between border-b p-4 last:border-0 dark:border-zinc-800"
                key={member.id}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                    {profile?.full_name?.slice(0, 2).toUpperCase() ?? 'US'}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {profile?.full_name || profile?.username || 'Team member'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <MemberControls id={member.id} role={member.role} />
              </div>
            )
          })
        ) : (
          <p className="p-8 text-center text-sm text-zinc-500">
            No members found.
          </p>
        )}
      </section>
      <h2 className="mt-8 text-lg font-semibold">Pending invitations</h2>
      <section className="mt-3 overflow-hidden rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {invitations?.length ? (
          invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between border-b p-4 last:border-0 dark:border-zinc-800"
            >
              <div>
                <p className="text-sm font-medium">{invitation.email}</p>
                <p className="text-xs text-zinc-500">
                  {invitation.role} · expires{' '}
                  {new Date(invitation.expires_at).toLocaleDateString()}
                </p>
              </div>
              <Link
                href={`/invite/${invitation.token}`}
                className="text-xs font-medium text-indigo-600"
              >
                Open invite →
              </Link>
            </div>
          ))
        ) : (
          <p className="p-5 text-sm text-zinc-500">No pending invitations.</p>
        )}
      </section>
    </div>
  )
}
