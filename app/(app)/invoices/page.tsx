import { WorkspacePage } from "@/components/workspace-page";
import { createClient, throwIfSupabaseError } from "@/lib/server";
import { requireActiveWorkspace } from "@/lib/workspace";
export default async function Page() {
  const supabase = await createClient();
  const workspace = await requireActiveWorkspace(supabase);
  const [
    { data: invoices, error: invoicesError },
    { data: customers, error: customersError },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("id,invoice_number,status,total,due_date,customers(name)")
      .eq("organization_id", workspace.organization_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id,name")
      .eq("organization_id", workspace.organization_id)
      .order("name"),
  ]);
  throwIfSupabaseError("Unable to load invoices", invoicesError);
  throwIfSupabaseError("Unable to load invoice customers", customersError);
  return (
    <WorkspacePage
      kind="invoices"
      data={{ invoices: invoices ?? [], customers: customers ?? [] }}
    />
  );
}
