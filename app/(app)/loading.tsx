export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
