'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ActionResult, currentMembership, requireAuth, requireMembership, validateInput } from '@/lib/action-helpers'

const invoiceSchema = z.object({
  customer_id: z.string().uuid(),
  subtotal: z.coerce.number().finite().min(0).max(999_999_999_999.99),
  tax: z.coerce.number().finite().min(0).max(999_999_999_999.99),
  total: z.coerce.number().finite().min(0).max(999_999_999_999.99),
  due_date: z.string().datetime().optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional(),
})

const invoiceStatusSchema = z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'])

const invoiceItemSchema = z.object({
  invoice_id: z.string().uuid(),
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().finite().positive().max(1_000_000),
  unit_price: z.coerce.number().finite().min(0).max(1_000_000),
})

/**
 * Create a new invoice in the active organization
 */
export async function createInvoice(input: unknown): Promise<ActionResult> {
  const validation = validateInput(invoiceSchema, input, 'Enter a customer and valid amounts.')
  if (!validation.success) return validation

  const { supabase, user, membership } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck
  const membershipCheck = requireMembership(membership)
  if (!membershipCheck.ok) return membershipCheck

  const invoiceNumber = `INV-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const { error } = await supabase.from('invoices').insert({
    organization_id: membership.organization_id,
    customer_id: validation.data.customer_id,
    invoice_number: invoiceNumber,
    subtotal: validation.data.subtotal,
    tax: validation.data.tax,
    total: validation.data.total,
    due_date: validation.data.due_date || null,
    description: validation.data.description || null,
    status: 'DRAFT',
  })

  if (error) return { ok: false, message: error.message }

  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  return { ok: true, message: 'Invoice created successfully.' }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(id: string, status: unknown): Promise<ActionResult> {
  const idValidation = z.string().uuid().safeParse(id)
  const statusValidation = invoiceStatusSchema.safeParse(status)

  if (!idValidation.success || !statusValidation.success) {
    return { ok: false, message: 'Invalid invoice update.' }
  }

  const { supabase, user, membership } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck
  const membershipCheck = requireMembership(membership)
  if (!membershipCheck.ok) return membershipCheck

  const { error } = await supabase
    .from('invoices')
    .update({ status: statusValidation.data })
    .eq('id', idValidation.data)
    .eq('organization_id', membership.organization_id)

  if (error) return { ok: false, message: error.message }

  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  return { ok: true, message: 'Invoice updated.' }
}

/**
 * Add a line item to an invoice
 */
export async function addInvoiceItem(input: unknown): Promise<ActionResult> {
  const validation = validateInput(invoiceItemSchema, input, 'Enter a valid line item.')
  if (!validation.success) return validation

  const { supabase, user, membership } = await currentMembership()
  const authCheck = requireAuth(user)
  if (!authCheck.ok) return authCheck
  const membershipCheck = requireMembership(membership)
  if (!membershipCheck.ok) return membershipCheck

  const { error } = await supabase.from('invoice_items').insert({
    invoice_id: validation.data.invoice_id,
    description: validation.data.description,
    quantity: validation.data.quantity,
    unit_price: validation.data.unit_price,
    organization_id: membership.organization_id,
  })

  if (error) return { ok: false, message: error.message }

  revalidatePath('/invoices')
  return { ok: true, message: 'Line item added.' }
}
