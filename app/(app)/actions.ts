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
const profileSchema = z.object({ full_name: z.string().trim().min(1).max(160) })
const orgSchema = z.object({ name: z.string().trim().min(2).max(160) })

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
  const { data: project, error } = await supabase.from('projects').insert({ organization_id: membership.organization_id, name: parsed.data.name, description: parsed.data.description || null, customer_id: parsed.data.customer_id || null, deadline: parsed.data.deadline || null, created_by: user.id, status: 'PLANNING' }).select('id').single()
  if (error) return { ok: false, message: error.message }
  const { error: memberError } = await supabase.from('project_members').insert({ project_id: project.id, user_id: user.id })
  if (memberError) return { ok: false, message: memberError.message }
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

export async function markNotificationRead(id: string) {
  const parsed=z.string().uuid().safeParse(id); if(!parsed.success)return {ok:false,message:'Invalid notification.'}
  const {supabase,user}=await currentMembership(); if(!user)return {ok:false,message:'You must be signed in.'}
  const {error}=await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',parsed.data)
  if(error)return {ok:false,message:error.message}; revalidatePath('/notifications'); return {ok:true,message:'Marked as read.'}
}
export async function updateProfile(input: unknown) {
  const parsed=profileSchema.safeParse(input); if(!parsed.success)return {ok:false,message:'Enter your name.'}
  const {supabase,user}=await currentMembership();if(!user)return {ok:false,message:'You must be signed in.'}
  const {error}=await supabase.from('profiles').update({full_name:parsed.data.full_name}).eq('id',user.id)
  if(error)return {ok:false,message:error.message}; revalidatePath('/', 'layout');return {ok:true,message:'Profile saved.'}
}
export async function updateOrganization(input: unknown) {
  const parsed=orgSchema.safeParse(input);if(!parsed.success)return {ok:false,message:'Enter an organization name.'}
  const {supabase,user,membership}=await currentMembership();if(!user||!membership)return {ok:false,message:'You must belong to an organization.'}
  const {error}=await supabase.from('organizations').update({name:parsed.data.name}).eq('id',membership.organization_id)
  if(error)return {ok:false,message:error.message};revalidatePath('/', 'layout');return {ok:true,message:'Organization saved.'}
}

export async function updateCustomer(id: string, input: unknown) {
  const parsed=z.string().uuid().safeParse(id);const body=customerSchema.safeParse(input);if(!parsed.success||!body.success)return {ok:false,message:'Invalid customer details.'}
  const {supabase,user}=await currentMembership();if(!user)return {ok:false,message:'You must be signed in.'}
  const {error}=await supabase.from('customers').update({name:body.data.name,email:body.data.email||null,company:body.data.company||null,phone:body.data.phone||null}).eq('id',parsed.data)
  if(error)return {ok:false,message:error.message};revalidatePath('/customers');revalidatePath(`/customers/${id}`);return {ok:true,message:'Customer updated.'}
}
export async function updateInvoiceStatus(id:string,status:'DRAFT'|'SENT'|'PAID'|'OVERDUE'|'CANCELLED'){
  const parsed=z.string().uuid().safeParse(id);if(!parsed.success)return {ok:false,message:'Invalid invoice.'};const {supabase,user}=await currentMembership();if(!user)return {ok:false,message:'You must be signed in.'};const {error}=await supabase.from('invoices').update({status}).eq('id',parsed.data);if(error)return {ok:false,message:error.message};revalidatePath('/invoices');revalidatePath(`/invoices/${id}`);revalidatePath('/dashboard');return {ok:true,message:'Invoice status updated.'}
}
export async function addInvoiceItem(input:unknown){const schema=z.object({invoice_id:z.string().uuid(),description:z.string().trim().min(1).max(500),quantity:z.coerce.number().positive(),unit_price:z.coerce.number().nonnegative()});const parsed=schema.safeParse(input);if(!parsed.success)return {ok:false,message:'Enter a valid line item.'};const {supabase,user}=await currentMembership();if(!user)return {ok:false,message:'You must be signed in.'};const {error}=await supabase.from('invoice_items').insert(parsed.data);if(error)return {ok:false,message:error.message};revalidatePath(`/invoices/${parsed.data.invoice_id}`);return {ok:true,message:'Item added.'}}
export async function addTaskComment(input:unknown){const schema=z.object({task_id:z.string().uuid(),content:z.string().trim().min(1).max(4000)});const parsed=schema.safeParse(input);const {supabase,user}=await currentMembership();if(!parsed.success||!user)return {ok:false,message:'Enter a comment.'};const {error}=await supabase.from('task_comments').insert({...parsed.data,user_id:user.id});if(error)return {ok:false,message:error.message};revalidatePath('/tasks');return {ok:true,message:'Comment added.'}}
export async function inviteMember(input:unknown){const schema=z.object({email:z.string().email(),role:z.enum(['ADMIN','MEMBER'])});const parsed=schema.safeParse(input);const {supabase,user,membership}=await currentMembership();if(!parsed.success||!user||!membership)return {ok:false,message:'Enter a valid invitation.'};const {error}=await supabase.from('invitations').insert({organization_id:membership.organization_id,email:parsed.data.email,role:parsed.data.role,invited_by:user.id});if(error)return {ok:false,message:error.message};revalidatePath('/team');return {ok:true,message:'Invitation created. Share it from the Invitations list.'}}
export async function acceptInvitation(token:string){const parsed=z.string().uuid().safeParse(token);if(!parsed.success)return {ok:false,message:'Invalid invitation.'};const {supabase,user}=await currentMembership();if(!user)return {ok:false,message:'Sign in before accepting an invitation.'};const {error}=await supabase.rpc('accept_invitation',{p_token:parsed.data});if(error)return {ok:false,message:error.message};revalidatePath('/', 'layout');return {ok:true,message:'Invitation accepted.'}}
export async function changeMemberRole(id:string,role:'ADMIN'|'MEMBER') {const parsed=z.string().uuid().safeParse(id);if(!parsed.success)return {ok:false,message:'Invalid member.'};const {supabase,user}=await currentMembership();if(!user)return {ok:false,message:'Sign in required.'};const {error}=await supabase.from('organization_members').update({role}).eq('id',id);if(error)return {ok:false,message:error.message};revalidatePath('/team');return {ok:true,message:'Role updated.'}}
export async function removeMember(id:string){const parsed=z.string().uuid().safeParse(id);if(!parsed.success)return {ok:false,message:'Invalid member.'};const {supabase,user}=await currentMembership();if(!user)return {ok:false,message:'Sign in required.'};const {error}=await supabase.from('organization_members').delete().eq('id',id);if(error)return {ok:false,message:error.message};revalidatePath('/team');return {ok:true,message:'Member removed.'}}
export async function updateProject(id:string,input:unknown){const schema=z.object({name:z.string().trim().min(1).max(160),description:z.string().trim().max(2000).optional(),status:z.enum(['PLANNING','ACTIVE','ON_HOLD','COMPLETED','CANCELLED']),deadline:z.string().date().optional().or(z.literal(''))});const parsed=schema.safeParse(input);if(!z.string().uuid().safeParse(id).success||!parsed.success)return {ok:false,message:'Invalid project.'};const {supabase,user}=await currentMembership();if(!user)return {ok:false,message:'Sign in required.'};const {error}=await supabase.from('projects').update({...parsed.data,description:parsed.data.description||null,deadline:parsed.data.deadline||null}).eq('id',id);if(error)return {ok:false,message:error.message};revalidatePath('/projects');revalidatePath(`/projects/${id}`);return {ok:true,message:'Project updated.'}}
export async function assignTask(taskId:string,assignedTo:string|null){if(!z.string().uuid().safeParse(taskId).success||(assignedTo!==null&&!z.string().uuid().safeParse(assignedTo).success))return {ok:false,message:'Invalid assignment.'};const {supabase,user}=await currentMembership();if(!user)return {ok:false,message:'Sign in required.'};const {error}=await supabase.from('tasks').update({assigned_to:assignedTo}).eq('id',taskId);if(error)return {ok:false,message:error.message};revalidatePath('/tasks');revalidatePath(`/tasks/${taskId}`);return {ok:true,message:'Task assignment updated.'}}
export async function saveProjectFile(input:unknown){const schema=z.object({project_id:z.string().uuid(),file_name:z.string().min(1).max(500),file_path:z.string().min(1),file_type:z.string().max(200).nullable(),file_size:z.coerce.number().int().nonnegative().max(104857600)});const parsed=schema.safeParse(input);const {supabase,user,membership}=await currentMembership();if(!parsed.success||!user||!membership)return {ok:false,message:'Invalid file metadata.'};const {error}=await supabase.from('project_files').insert({organization_id:membership.organization_id,uploaded_by:user.id,...parsed.data});if(error)return {ok:false,message:error.message};revalidatePath(`/projects/${parsed.data.project_id}`);return {ok:true,message:'File uploaded.'}}
