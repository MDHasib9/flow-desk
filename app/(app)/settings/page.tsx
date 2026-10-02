import { createClient } from '@/lib/server'
import { throwIfSupabaseError } from '@/lib/server'
import { SettingsForms } from '@/components/settings-forms'
import { requireActiveWorkspace } from '@/lib/workspace'
export default async function Page(){const supabase=await createClient();const workspace=await requireActiveWorkspace(supabase);const [{data:{user},error:userError},{data:profile,error:profileError}]=await Promise.all([supabase.auth.getUser(),supabase.from('profiles').select('full_name').maybeSingle()]);throwIfSupabaseError('Unable to load account', userError);throwIfSupabaseError('Unable to load profile', profileError);const org=workspace.organizations;const organization=Array.isArray(org)?org[0]:org;return <SettingsForms name={profile?.full_name || user?.email?.split('@')[0] || ''} organizationName={organization?.name || ''}/>}
