import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  FolderKanban,
  Layers3,
  ListTodo,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { createClient, throwIfSupabaseError } from "@/lib/server";

export const metadata: Metadata = {
  title: "FlowDesk — work flows better together",
  description:
    "Keep customer relationships, projects, tasks, invoices, and your team in one clear workspace.",
};

const features = [
  {
    title: "One workspace",
    description:
      "Keep customers, projects, tasks, files, and invoices connected.",
    icon: Layers3,
  },
  {
    title: "Built for teams",
    description:
      "Invite teammates and manage workspace access from one place.",
    icon: ShieldCheck,
  },
  {
    title: "Focus on the work",
    description:
      "See project progress, keep tasks moving, and follow up on invoices.",
    icon: Sparkles,
  },
];

const workflow = [
  "Create your company workspace and invite your team.",
  "Turn customer needs into projects and owned tasks.",
  "Track delivery and invoices alongside the work.",
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  throwIfSupabaseError("Unable to check your session", error);

  const primaryHref = user ? "/dashboard" : "/auth/sign-up";
  const primaryLabel = user ? "Open your workspace" : "Create your workspace";

  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-950 selection:bg-indigo-200">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-zinc-950 text-white">
            <Layers3 size={16} />
          </span>
          FlowDesk
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-zinc-500 sm:block">
                Signed in as {user.email}
              </span>
              <Link
                href="/dashboard"
                className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                Open workspace
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden text-sm font-medium text-zinc-600 sm:block"
              >
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 pb-24 pt-20 text-center sm:pt-28">
        <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
          <Sparkles size={13} className="text-indigo-600" />
          A clearer way to run your work
        </div>
        <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
          Manage your business workflow in one place.
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-zinc-600">
          FlowDesk brings customers, projects, tasks, and invoices together—so
          your team can focus on what comes next.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={primaryHref}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500"
          >
            {primaryLabel}
            <ArrowRight size={16} />
          </Link>
          <a
            href="#how-it-works"
            className="rounded-lg border border-zinc-200 bg-white px-5 py-3 text-sm font-medium shadow-sm transition hover:bg-zinc-50"
          >
            See how it works
          </a>
        </div>

        <div className="mx-auto mt-16 max-w-5xl rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-2xl shadow-zinc-200/70 sm:p-7">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-5">
            <div className="flex items-center gap-2 font-semibold">
              <span className="grid size-7 place-items-center rounded-md bg-zinc-950 text-white">
                <Layers3 size={14} />
              </span>
              Your workspace
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              Work, connected
            </span>
          </div>
          <div className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Customers", "Keep every relationship in view", Users],
              ["Projects", "Connect clients to delivery", FolderKanban],
              ["Tasks", "Make the next step clear", ListTodo],
              ["Invoices", "Keep billing with the work", CircleDollarSign],
            ].map(([title, description, Icon]) => {
              const FeatureIcon = Icon as typeof Users;
              return (
                <div
                  key={title as string}
                  className="rounded-xl bg-zinc-50 p-4"
                >
                  <FeatureIcon size={18} className="text-indigo-600" />
                  <h2 className="mt-4 text-sm font-semibold">
                    {title as string}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {description as string}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-sm font-medium text-zinc-500">
            EVERYTHING YOUR TEAM NEEDS TO STAY IN SYNC
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-xl border border-zinc-200 p-6"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon size={19} />
                </span>
                <h2 className="mt-5 text-lg font-semibold">{title}</h2>
                <p className="mt-2 leading-7 text-zinc-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-2"
      >
        <div>
          <p className="text-sm font-semibold text-indigo-600">HOW IT WORKS</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight">
            From a new lead to work delivered.
          </h2>
          <p className="mt-4 leading-7 text-zinc-600">
            Keep the details and next steps together instead of stitching your
            workflow across separate tools.
          </p>
        </div>
        <ol className="space-y-7">
          {workflow.map((step, index) => (
            <li key={step} className="flex gap-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-zinc-950 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <p className="pt-0.5 text-zinc-600">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-zinc-950 px-6 py-24 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-indigo-300">
            READY WHEN YOU ARE
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight">
            Give your team one place to move work forward.
          </h2>
          <p className="mt-4 text-zinc-400">
            You can create a workspace without setting up billing.
          </p>
          <Link
            href={primaryHref}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-100"
          >
            {primaryLabel}
            <Check size={16} className="text-emerald-600" />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-zinc-500">
        <span>© {new Date().getFullYear()} FlowDesk</span>
        <span>Work flows better together.</span>
      </footer>
    </main>
  );
}
