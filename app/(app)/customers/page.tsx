import { WorkspacePage } from "@/components/workspace-page";
import { createClient, throwIfSupabaseError } from "@/lib/server";
import { requireActiveWorkspace } from "@/lib/workspace";
export default async function Page() {
  const supabase = await createClient();
  const workspace = await requireActiveWorkspace(supabase);
  const { data, error } = await supabase
    .from("customers")
    .select("id,name,email,company,status")
    .eq("organization_id", workspace.organization_id)
    .order("created_at", { ascending: false });
  throwIfSupabaseError("Unable to load customers", error);
  return <WorkspacePage kind="customers" data={data ?? []} />;
}
