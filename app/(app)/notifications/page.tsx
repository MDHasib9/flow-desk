import { createClient } from '@/lib/server'
import { NotificationList } from '@/components/notification-list'
export default async function Page(){const supabase=await createClient();const {data}=await supabase.from('notifications').select('id,title,message,type,read_at,created_at').order('created_at',{ascending:false});return <NotificationList notifications={data ?? []}/>}
