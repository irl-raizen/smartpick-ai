import type { Metadata } from "next";
import Link from "next/link";
import { getPhones } from "@/src/lib/supabase";
import { PhonesCatalog } from "@/app/phones/PhonesCatalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Best Smartphone Deals & Discounts | SmartPick AI",
  description: "Find the best deals, live prices, discount estimates, and active price drops on top smartphones from Amazon and Flipkart.",
  alternates: {
    canonical: "/best-deals",
  },
  openGraph: {
    title: "Best Smartphone Deals & Discounts | SmartPick AI",
    description: "Find the best deals, live prices, discount estimates, and active price drops on top smartphones from Amazon and Flipkart.",
    url: "/best-deals",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Smartphone Deals & Discounts | SmartPick AI",
    description: "Find the best deals, live prices, discount estimates, and active price drops on top smartphones from Amazon and Flipkart.",
  }
};

export default async function BestDealsPage() {
  const phones = await getPhones();

  // Sort phones by lowest price to represent "deals"
  const sortedPhones = [...phones].sort((a, b) => a.price - b.price);

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
            Active Deals
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Best Smartphone Deals
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Discover the best value smartphones, live prices, and active discounts on Amazon and Flipkart.
          </p>
        </section>

        <PhonesCatalog initialPhones={sortedPhones} />
      </main>
    </div>
  );
}
