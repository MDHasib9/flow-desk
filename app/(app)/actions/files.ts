'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ActionResult, currentMembership, requireAuth, requireMembership, validateInput } from '@/lib/action-helpers'

const saveProjectFileSchema = z.object({
  project_id: z.string().uuid(),
  file_name: z.string().min(1).max(500),
  file_path: z.string().min(1),
  file_type: z.string().max(50),
  file_size: z.coerce.number().finite().positive(),
})

/**
 * Save a project file reference in the database
 */
export async function saveProjectFile(input: unknown): Promise<ActionResult> {
  const validation = validateInput(saveProjectFileSchema, input, 'Invalid file details.')
  if (!validation.success) return validation

  const { supabase, user, membership } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck
  const membershipCheck = requireMembership(membership)
  if (!membershipCheck.ok) return membershipCheck

  const { error } = await supabase.from('project_files').insert({
    organization_id: membership.organization_id,
    project_id: validation.data.project_id,
    file_name: validation.data.file_name,
    file_path: validation.data.file_path,
    file_type: validation.data.file_type,
    file_size: validation.data.file_size,
    uploaded_by: user.id,
  })

  if (error) return { ok: false, message: error.message }

  revalidatePath('/projects')
  return { ok: true, message: 'File saved.' }
}

/**
 * Get a signed download URL for a project file
 */
export async function getProjectFileDownloadUrl(id: string): Promise<ActionResult<{ url: string }>> {
  const validation = validateInput(z.string().uuid(), id, 'Invalid file.')
  if (!validation.success) return validation

  const { supabase, user, membership } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck
  const membershipCheck = requireMembership(membership)
  if (!membershipCheck.ok) return membershipCheck

  const { data: file, error } = await supabase
    .from('project_files')
    .select('file_path,file_name')
    .eq('id', validation.data)
    .eq('organization_id', membership.organization_id)
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  if (!file) return { ok: false, message: 'File not found in the active workspace.' }

  const { data, error: urlError } = await supabase.storage
    .from('flowdesk-project-files')
    .createSignedUrl(file.file_path, 60, { download: file.file_name })

  if (urlError) return { ok: false, message: urlError.message }

  return { ok: true, message: 'Download URL generated.', data: { url: data.signedUrl } }
}
