import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 px-6 text-center dark:bg-zinc-950">
      <div className="max-w-md">
        <p className="text-sm font-semibold text-indigo-600">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          We couldn’t find that page.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          The link may be out of date, or the page may have moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
        >
          <ArrowLeft size={15} />
          Back to FlowDesk
        </Link>
      </div>
    </main>
  );
}
