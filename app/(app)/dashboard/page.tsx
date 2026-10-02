import { WorkspacePage } from "@/components/workspace-page";
import { createClient } from "@/lib/server";
import { requireActiveWorkspace } from "@/lib/workspace";
export default async function Page() {
  const supabase = await createClient();
  const workspace = await requireActiveWorkspace(supabase);
  const [customers, projects, tasks, invoices] = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("organization_id", workspace.organization_id),
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", workspace.organization_id)
      .eq("status", "ACTIVE"),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", workspace.organization_id)
      .neq("status", "DONE"),
    supabase.from("invoices").select("total,status,issue_date").eq("organization_id", workspace.organization_id),
  ]);

  const queryError = [customers.error, projects.error, tasks.error, invoices.error].find(
    (error) => error !== null,
  );
  if (queryError) throw new Error(`Unable to load dashboard: ${queryError.message}`);

  const rows = invoices.data ?? [];
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 5 + index);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      month: date.toLocaleString("en-US", { month: "short" }),
    };
  });
  const revenueByMonth = months.map(({ key, month }) => ({
    month,
    revenue: rows
      .filter((invoice) => invoice.status === "PAID" && invoice.issue_date.startsWith(key))
      .reduce((total, invoice) => total + Number(invoice.total), 0),
  }));

  return (
    <WorkspacePage
      kind="dashboard"
      data={{
        customers: customers.count ?? 0,
        projects: projects.count ?? 0,
        tasks: tasks.count ?? 0,
        revenue: rows
          .filter((i) => i.status === "PAID")
          .reduce((n, i) => n + Number(i.total), 0),
        outstanding: rows
          .filter((i) => ["SENT", "OVERDUE"].includes(i.status))
          .reduce((n, i) => n + Number(i.total), 0),
        revenueByMonth,
      }}
    />
  );
}
