import { WorkspacePage } from "@/components/workspace-page";
import { createClient } from "@/lib/server";
import { requireActiveWorkspace } from "@/lib/workspace";

export default async function Page() {
  const supabase = await createClient();
  const workspace = await requireActiveWorkspace(supabase);
  const [
    { data: projects, error: projectsError },
    { data: customers, error: customersError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,status,deadline,customers(name),project_members(id)")
      .eq("organization_id", workspace.organization_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id,name")
      .eq("organization_id", workspace.organization_id)
      .order("name"),
  ]);

  if (projectsError) {
    throw new Error(`Unable to load projects: ${projectsError.message}`);
  }
  if (customersError) {
    throw new Error(`Unable to load project customers: ${customersError.message}`);
  }

  return (
    <WorkspacePage
      kind="projects"
      data={{ projects: projects ?? [], customers: customers ?? [] }}
    />
  );
}
