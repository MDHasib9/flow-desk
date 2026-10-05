'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ActionResult, currentMembership, requireAuth, requireMembership, validateInput } from '@/lib/action-helpers'

const taskSchema = z.object({
  title: z.string().trim().min(1).max(280),
  project_id: z.string().uuid(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
})

const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'])

const taskCommentSchema = z.object({
  task_id: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
})

/**
 * Create a new task in the active organization
 */
export async function createTask(input: unknown): Promise<ActionResult> {
  const validation = validateInput(taskSchema, input, 'Please enter a valid task.')
  if (!validation.success) return validation

  const { supabase, user, membership } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck
  const membershipCheck = requireMembership(membership)
  if (!membershipCheck.ok) return membershipCheck

  const { error } = await supabase.from('tasks').insert({
    organization_id: membership.organization_id,
    project_id: validation.data.project_id,
    title: validation.data.title,
    priority: validation.data.priority,
    status: 'TODO',
  })
  if (error) return { ok: false, message: error.message }

  revalidatePath('/tasks')
  revalidatePath('/projects')
  revalidatePath('/dashboard')
  return { ok: true, message: 'Task created successfully.' }
}

/**
 * Update task status (move to different column)
 */
export async function moveTask(taskId: string, status: unknown): Promise<ActionResult> {
  const idValidation = z.string().uuid().safeParse(taskId)
  const statusValidation = taskStatusSchema.safeParse(status)

  if (!idValidation.success || !statusValidation.success) {
    return { ok: false, message: 'Invalid task update.' }
  }

  const { supabase, user, membership } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck
  const membershipCheck = requireMembership(membership)
  if (!membershipCheck.ok) return membershipCheck

  const { error } = await supabase
    .from('tasks')
    .update({ status: statusValidation.data })
    .eq('organization_id', membership.organization_id)
    .eq('id', idValidation.data)

  if (error) return { ok: false, message: error.message }

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { ok: true, message: 'Task updated.' }
}

/**
 * Assign a task to a user
 */
export async function assignTask(taskId: string, assignedTo: string | null): Promise<ActionResult> {
  const taskIdValidation = z.string().uuid().safeParse(taskId)
  const assigneeValidation = assignedTo === null ? { success: true, data: null } : z.string().uuid().safeParse(assignedTo)

  if (!taskIdValidation.success || !assigneeValidation.success) {
    return { ok: false, message: 'Invalid task or assignee.' }
  }

  const { supabase, user, membership } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck
  const membershipCheck = requireMembership(membership)
  if (!membershipCheck.ok) return membershipCheck

  const { error } = await supabase
    .from('tasks')
    .update({ assigned_to: assigneeValidation.data })
    .eq('organization_id', membership.organization_id)
    .eq('id', taskIdValidation.data)

  if (error) return { ok: false, message: error.message }

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { ok: true, message: 'Task assigned.' }
}

/**
 * Add a comment to a task
 */
export async function addTaskComment(input: unknown): Promise<ActionResult> {
  const validation = validateInput(taskCommentSchema, input, 'Enter a valid comment.')
  if (!validation.success) return validation

  const { supabase, user, membership } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck
  const membershipCheck = requireMembership(membership)
  if (!membershipCheck.ok) return membershipCheck

  const { error } = await supabase.from('task_comments').insert({
    task_id: validation.data.task_id,
    user_id: user.id,
    content: validation.data.content,
    organization_id: membership.organization_id,
  })

  if (error) return { ok: false, message: error.message }

  revalidatePath('/tasks')
  return { ok: true, message: 'Comment added.' }
}
