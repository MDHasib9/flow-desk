'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient, throwIfSupabaseError } from '@/lib/server'
import { activeWorkspaceCookie, getWorkspaceContext } from '@/lib/workspace'
import { ActionResult, currentMembership, requireAuth, requireMembership, validateInput } from '@/lib/action-helpers'

const organizationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only'),
})

const profileSchema = z.object({
  full_name: z.string().trim().min(1).max(160),
})

const orgSchema = z.object({
  name: z.string().trim().min(2).max(160),
})

/**
 * Switch the active workspace for the current user
 */
export async function switchWorkspace(organizationId: unknown): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(organizationId)
  if (!parsed.success) return { ok: false, message: 'Invalid workspace.' }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  throwIfSupabaseError('Unable to verify session', userError)
  if (!user) return { ok: false, message: 'Sign in to switch workspaces.' }

  const { data: membership, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('organization_id', parsed.data)
    .maybeSingle()
  if (error) throw new Error(`Unable to verify workspace access: ${error.message}`)
  if (!membership) return { ok: false, message: 'You do not belong to that workspace.' }

  const cookieStore = await cookies()
  cookieStore.set(activeWorkspaceCookie, parsed.data, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Workspace switched.' }
}

/**
 * Create a new organization for the current user
 */
export async function createOrganization(input: unknown): Promise<ActionResult> {
  const validation = validateInput(organizationSchema, input, 'Invalid workspace details.')
  if (!validation.success) return validation

  const { user, membership } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck

  if (membership) {
    return { ok: false, message: 'Your account already belongs to a workspace.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('organizations').insert(validation.data)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

/**
 * Update the current user's profile
 */
export async function updateProfile(input: unknown): Promise<ActionResult> {
  const validation = validateInput(profileSchema, input, 'Enter your name.')
  if (!validation.success) return validation

  const { supabase, user } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck

  const { error } = await supabase.from('profiles').update({ full_name: validation.data.full_name }).eq('id', user.id)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'Profile saved.' }
}

/**
 * Update the current organization
 */
export async function updateOrganization(input: unknown): Promise<ActionResult> {
  const validation = validateInput(orgSchema, input, 'Enter an organization name.')
  if (!validation.success) return validation

  const { supabase, user, membership } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck
  const membershipCheck = requireMembership(membership)
  if (!membershipCheck.ok) return membershipCheck

  const { error } = await supabase
    .from('organizations')
    .update({ name: validation.data.name })
    .eq('id', membership.organization_id)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'Organization saved.' }
}
