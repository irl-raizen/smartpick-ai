import type { Metadata } from "next";
import Link from "next/link";

import { getPhones } from "@/src/lib/supabase";
import { PhonesCatalog } from "./PhonesCatalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse Smartphone Catalog",
  description: "Explore the full database of popular smartphones, specifications, prices, and performance ratings in India.",
  alternates: {
    canonical: "/phones",
  },
  openGraph: {
    title: "Browse Smartphone Catalog - SmartPick AI",
    description: "Explore the full database of popular smartphones, specifications, prices, and performance ratings in India.",
    url: "/phones",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Smartphone Catalog - SmartPick AI",
    description: "Explore the full database of popular smartphones, specifications, prices, and performance ratings in India.",
  }
};

export default async function PhonesPage() {
  const phones = await getPhones();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <section className="mx-auto max-w-3xl text-center">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-violet-300"
          >
            ← Back to home
          </Link>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-200">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            Phone Catalog
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Browse Smartphones
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Explore our full lineup of phones powered by live Supabase data.
          </p>
        </section>

        <PhonesCatalog initialPhones={phones} />
      </main>
    </div>
  );
}
