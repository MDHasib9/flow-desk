import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { User } from '@supabase/supabase-js'
import { createClient, throwIfSupabaseError } from '@/lib/server'
import { getWorkspaceContext } from '@/lib/workspace'

/**
 * Type-safe action response wrapper
 * Ensures consistent error handling across all server actions
 */
export type ActionResult<T = never> = 
  | { ok: true; message: string; data?: T }
  | { ok: false; message: string }

/**
 * Get the current user's membership context
 * Returns supabase client, user, and active membership
 */
export async function currentMembership() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  throwIfSupabaseError('Unable to verify session', userError)
  if (!user) return { supabase, user: null, membership: null }
  
  const { current } = await getWorkspaceContext(supabase, user.id)
  return {
    supabase,
    user,
    membership: current
      ? { organization_id: current.organization_id, role: current.role }
      : null,
  }
}

/**
 * Safely parse and validate input with zod schema
 * Returns validation error message if parsing fails
 */
export function validateInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
  errorMessage: string,
): ActionResult<T> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? errorMessage }
  }

  return { ok: true, message: '', data: parsed.data }
}

/**
 * Require user to be authenticated
 */
export function requireAuth(user: User | null): ActionResult {
  if (!user) {
    return { ok: false, message: 'You must be signed in.' }
  }
  return { ok: true, message: '' }
}

/**
 * Require user to have an active organization membership
 */
export function requireMembership(
  membership: { organization_id: string; role: string } | null,
): ActionResult {
  if (!membership) {
    return { ok: false, message: 'You must belong to an organization.' }
  }
  return { ok: true, message: '' }
}

/**
 * Revalidate multiple paths at once
 */
export async function revalidatePaths(paths: string[]) {
  for (const path of paths) {
    revalidatePath(path)
  }
}
