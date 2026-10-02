import { WorkspacePage } from '@/components/workspace-page'
import { createClient } from '@/lib/server'
export default async function Page() { const supabase=await createClient(); const [{data:invoices},{data:customers}]=await Promise.all([supabase.from('invoices').select('id,invoice_number,status,total,due_date,customers(name)').order('created_at',{ascending:false}),supabase.from('customers').select('id,name').order('name')]); return <WorkspacePage kind="invoices" data={{invoices:invoices ?? [],customers:customers ?? []}}/> }
