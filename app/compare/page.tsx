import type { Metadata } from "next";
import { Suspense } from "react";
import { getPhones } from "@/src/lib/supabase";
import { CompareCatalog } from "./CompareCatalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare Smartphones",
  description: "Compare specifications, performance ratings, and features of the latest smartphones side-by-side.",
  alternates: {
    canonical: "/compare",
  },
  openGraph: {
    title: "Compare Smartphones - SmartPick AI",
    description: "Compare specifications, performance ratings, and features of the latest smartphones side-by-side.",
    url: "/compare",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Compare Smartphones - SmartPick AI",
    description: "Compare specifications, performance ratings, and features of the latest smartphones side-by-side.",
  }
};

export default async function ComparePage() {
  const phones = await getPhones();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl text-center mb-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-200">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            Comparison Engine
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Compare Smartphones
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-400 leading-relaxed">
            Select two smartphones to compare their full specifications side by side and see winners in key performance metrics.
          </p>
        </section>

        <Suspense fallback={
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-16 text-center backdrop-blur-sm">
            <p className="text-sm text-zinc-500">Loading comparison details...</p>
          </div>
        }>
          <CompareCatalog phones={phones} />
        </Suspense>
      </main>
    </div>
  );
}
