import { WorkspacePage } from '@/components/workspace-page'
import { createClient } from '@/lib/server'
export default async function Page() { const supabase=await createClient(); const {data}=await supabase.from('projects').select('id,name,status,deadline,customers(name),project_members(user_id)').order('created_at',{ascending:false}); return <WorkspacePage kind="projects" data={data ?? []}/> }
