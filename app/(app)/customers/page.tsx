import { WorkspacePage } from '@/components/workspace-page'
import { createClient } from '@/lib/server'
export default async function Page() { const supabase=await createClient(); const {data}=await supabase.from('customers').select('id,name,email,company,status').order('created_at',{ascending:false}); return <WorkspacePage kind="customers" data={data ?? []}/> }
