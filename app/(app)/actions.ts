'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/server'

const customerSchema = z.object({ name: z.string().trim().min(1).max(160), email: z.string().trim().email().optional().or(z.literal('')), company: z.string().trim().max(160).optional(), phone: z.string().trim().max(50).optional() })
const organizationSchema = z.object({ name: z.string().trim().min(2).max(160), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens.').min(3).max(80) })
const projectSchema = z.object({ name: z.string().trim().min(1).max(160), description: z.string().trim().max(2000).optional(), customer_id: z.string().uuid().optional().or(z.literal('')), deadline: z.string().date().optional().or(z.literal('')) })
const taskSchema = z.object({ title: z.string().trim().min(1).max(280), project_id: z.string().uuid(), priority: z.enum(['LOW','MEDIUM','HIGH','URGENT']).default('MEDIUM') })
const invoiceSchema = z.object({ customer_id: z.string().uuid(), subtotal: z.coerce.number().nonnegative(), tax: z.coerce.number().nonnegative().default(0), due_date: z.string().date().optional().or(z.literal('')), notes: z.string().max(2000).optional() })

async function currentMembership() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, membership: null }
  const { data: membership } = await supabase.from('organization_members').select('organization_id, role').limit(1).maybeSingle()
  return { supabase, user, membership }
}

export async function createOrganization(input: unknown) {
  const parsed = organizationSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid workspace details.' }
  const { supabase, user } = await currentMembership()
  if (!user) return { ok: false, message: 'You must be signed in.' }
  const { error } = await supabase.from('organizations').insert(parsed.data)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function createCustomer(input: unknown) {
  const parsed = customerSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Please provide a valid customer name and email.' }
  const { supabase, user, membership } = await currentMembership()
  if (!user) return { ok: false, message: 'You must be signed in.' }
  // The organization is resolved from the authenticated RLS context, never supplied by the browser.
  if (!membership) return { ok: false, message: 'Create or join an organization first.' }
  const { error } = await supabase.from('customers').insert({ organization_id: membership.organization_id, name: parsed.data.name, email: parsed.data.email || null, company: parsed.data.company || null, phone: parsed.data.phone || null })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/customers')
  return { ok: true, message: 'Customer created successfully.' }
}

export async function createProject(input: unknown) {
  const parsed = projectSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Please enter a valid project.' }
  const { supabase, user, membership } = await currentMembership()
  if (!user || !membership) return { ok: false, message: 'You must belong to an organization.' }
  const { error } = await supabase.from('projects').insert({ organization_id: membership.organization_id, name: parsed.data.name, description: parsed.data.description || null, customer_id: parsed.data.customer_id || null, deadline: parsed.data.deadline || null, created_by: user.id, status: 'PLANNING' })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/projects'); revalidatePath('/dashboard')
  return { ok: true, message: 'Project created successfully.' }
}

export async function createTask(input: unknown) {
  const parsed = taskSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Please enter a valid task.' }
  const { supabase, user, membership } = await currentMembership()
  if (!user || !membership) return { ok: false, message: 'You must belong to an organization.' }
  const { error } = await supabase.from('tasks').insert({ organization_id: membership.organization_id, project_id: parsed.data.project_id, title: parsed.data.title, priority: parsed.data.priority, created_by: user.id })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/tasks'); revalidatePath('/projects'); revalidatePath('/dashboard')
  return { ok: true, message: 'Task created successfully.' }
}

export async function moveTask(taskId: string, status: 'TODO'|'IN_PROGRESS'|'REVIEW'|'DONE') {
  const id = z.string().uuid().safeParse(taskId)
  if (!id.success) return { ok: false, message: 'Invalid task.' }
  const { supabase, user } = await currentMembership()
  if (!user) return { ok: false, message: 'You must be signed in.' }
  const { error } = await supabase.from('tasks').update({ status }).eq('id', id.data)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/tasks'); revalidatePath('/dashboard')
  return { ok: true, message: 'Task updated.' }
}

export async function createInvoice(input: unknown) {
  const parsed = invoiceSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Enter a customer and valid amounts.' }
  const { supabase, user, membership } = await currentMembership()
  if (!user || !membership) return { ok: false, message: 'You must belong to an organization.' }
  const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
  const { error } = await supabase.from('invoices').insert({ organization_id: membership.organization_id, customer_id: parsed.data.customer_id, invoice_number: invoiceNumber, subtotal: parsed.data.subtotal, tax: parsed.data.tax, due_date: parsed.data.due_date || null, notes: parsed.data.notes || null, created_by: user.id })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/invoices'); revalidatePath('/dashboard')
  return { ok: true, message: 'Invoice created successfully.' }
}
