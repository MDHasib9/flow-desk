'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ActionResult, currentMembership, requireAuth, requireMembership, validateInput } from '@/lib/action-helpers'

const customerSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().optional().or(z.literal('')),
  company: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(20).optional(),
})

/**
 * Create a new customer in the active organization
 */
export async function createCustomer(input: unknown): Promise<ActionResult> {
  const validation = validateInput(customerSchema, input, 'Please provide a valid customer name and email.')
  if (!validation.ok) return validation
  const customer = validation.data!

  const { supabase, user, membership } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck
  const membershipCheck = requireMembership(membership)
  if (!membershipCheck.ok) return membershipCheck

  const activeMembership = membership
  if (!activeMembership) {
    return { ok: false, message: 'You must belong to an organization.' }
  }

  const { error } = await supabase.from('customers').insert({
    organization_id: activeMembership.organization_id,
    name: customer.name,
    email: customer.email || null,
    company: customer.company || null,
    phone: customer.phone || null,
  })
  if (error) return { ok: false, message: error.message }

  revalidatePath('/customers')
  return { ok: true, message: 'Customer created successfully.' }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(id: string, input: unknown): Promise<ActionResult> {
  const idValidation = z.string().uuid().safeParse(id)
  const bodyValidation = validateInput(customerSchema, input, 'Invalid customer details.')

  if (!idValidation.success || !bodyValidation.ok) {
    return { ok: false, message: 'Invalid customer details.' }
  }
  const customer = bodyValidation.data!

  const { supabase, user, membership } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck
  const membershipCheck = requireMembership(membership)
  if (!membershipCheck.ok) return membershipCheck

  const activeMembership = membership
  if (!activeMembership) {
    return { ok: false, message: 'You must belong to an organization.' }
  }

  const { error } = await supabase
    .from('customers')
    .update({
      name: customer.name,
      email: customer.email || null,
      company: customer.company || null,
      phone: customer.phone || null,
    })
    .eq('id', idValidation.data)
    .eq('organization_id', activeMembership.organization_id)

  if (error) return { ok: false, message: error.message }

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  return { ok: true, message: 'Customer updated.' }
}
