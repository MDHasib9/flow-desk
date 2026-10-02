import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { OnboardingForm } from '@/components/onboarding-form'

export default async function OnboardingPage() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/auth/login?next=/onboarding'); const { data: membership } = await supabase.from('organization_members').select('id').limit(1).maybeSingle(); if (membership) redirect('/dashboard'); return <main className="grid min-h-screen place-items-center bg-zinc-50 p-5 dark:bg-zinc-950"><OnboardingForm email={user.email ?? ''}/></main> }
