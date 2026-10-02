import { createClient, throwIfSupabaseError } from "@/lib/server";
import { NotificationList } from "@/components/notification-list";
import { requireActiveWorkspace } from "@/lib/workspace";
export default async function Page() {
  const supabase = await createClient();
  const workspace = await requireActiveWorkspace(supabase);
  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,message,type,read_at,created_at")
    .eq("organization_id", workspace.organization_id)
    .order("created_at", { ascending: false });
  throwIfSupabaseError("Unable to load notifications", error);
  return <NotificationList notifications={data ?? []} />;
}
