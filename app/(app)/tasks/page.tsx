import { WorkspacePage } from '@/components/workspace-page'
import { createClient } from '@/lib/server'
export default async function Page() { const supabase=await createClient(); const [{data:tasks},{data:projects}]=await Promise.all([supabase.from('tasks').select('id,title,status,priority,due_date,project_id').order('created_at',{ascending:false}),supabase.from('projects').select('id,name').order('name')]); return <WorkspacePage kind="tasks" data={{tasks:tasks ?? [],projects:projects ?? []}}/> }
