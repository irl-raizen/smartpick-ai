"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function PhonesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-rose-600/10 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <div className="rounded-3xl border border-rose-500/20 bg-zinc-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-10">
          <div className="mx-auto mb-6 inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-1.5 text-sm text-rose-200">
            Failed to load phones
          </div>

          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Something went wrong
          </h1>

          <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base">
            {error.message ||
              "We could not fetch phones from Supabase. Check your environment variables and table setup."}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={reset}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-violet-500 hover:to-fuchsia-500"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
