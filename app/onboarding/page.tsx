import { redirect } from "next/navigation";
import { createClient, throwIfSupabaseError } from "@/lib/server";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  throwIfSupabaseError("Unable to verify session", userError);
  if (!user) redirect("/auth/login?next=/onboarding");
  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  throwIfSupabaseError("Unable to load workspace membership", error);
  if (membership) redirect("/dashboard");
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 p-5 dark:bg-zinc-950">
      <OnboardingForm email={user.email ?? ""} />
    </main>
  );
}
