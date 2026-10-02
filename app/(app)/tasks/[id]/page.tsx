import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient, throwIfSupabaseError } from '@/lib/server'
import { CommentForm } from '@/components/comment-form'
import { requireActiveWorkspace } from '@/lib/workspace'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const workspace = await requireActiveWorkspace(supabase);
  const [
    { data: task, error: taskError },
    { data: comments, error: commentsError },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id,title,description,status,priority,due_date,projects(name)")
      .eq("organization_id", workspace.organization_id)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("task_comments")
      .select("id,content,created_at,user_id")
      .eq("task_id", id)
      .order("created_at"),
  ]);
  throwIfSupabaseError("Unable to load task", taskError);
  throwIfSupabaseError("Unable to load task comments", commentsError);
  if (!task) notFound();
  const commenterIds = [...new Set((comments ?? []).map((comment) => comment.user_id))];
  const { data: profiles, error: profilesError } = commenterIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", commenterIds)
    : { data: [], error: null };
  throwIfSupabaseError("Unable to load commenter profiles", profilesError);
  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

  const project = Array.isArray(task.projects)
    ? task.projects[0]
    : task.projects;

  return (
    <div>
      <Link
        href="/tasks"
        className="inline-flex items-center gap-2 text-sm text-zinc-500"
      >
        <ArrowLeft size={15} />
        Tasks
      </Link>
      <section className="mt-6 max-w-3xl rounded-xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
          {task.status.replace("_", " ")}
        </span>
        <h1 className="mt-4 text-2xl font-semibold">{task.title}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {project?.name} · {task.priority} priority ·{" "}
          {task.due_date ?? "No due date"}
        </p>
        {task.description && (
          <p className="mt-5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {task.description}
          </p>
        )}
        <h2 className="mt-8 font-semibold">Comments</h2>
        <div className="mt-4 space-y-3">
          {comments?.length ? (
            comments.map((comment) => {
              const profile = profilesById.get(comment.user_id);
              return (
                <article
                  key={comment.id}
                  className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-950"
                >
                  <p>{comment.content}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {profile?.full_name || "Team member"} ·{" "}
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                </article>
              );
            })
          ) : (
            <p className="text-sm text-zinc-500">No comments yet.</p>
          )}
        </div>
        <CommentForm taskId={id} />
      </section>
    </div>
  );
}
