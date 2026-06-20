import type { Metadata } from "next";
import { Suspense } from "react";
import { getPhones } from "@/src/lib/supabase";
import { CompareCatalog } from "@/app/compare/CompareCatalog";

export const revalidate = 1800; // ISR - Revalidate every 30 minutes

export function generatePhoneSlug(brand: string, model: string): string {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const phones = await getPhones();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartpickai.vercel.app";
  const canonicalUrl = `${baseUrl}/compare/${slug}`;

  let title = "Compare Smartphones";
  let description = "Compare specifications, performance ratings, and features of the latest smartphones side-by-side.";

  const parts = slug.split("-vs-");
  const phone1 = phones.find(p => generatePhoneSlug(p.brand, p.model) === parts[0]);
  const phone2 = parts[1] ? phones.find(p => generatePhoneSlug(p.brand, p.model) === parts[1]) : null;

  if (phone1 && phone2) {
    title = `${phone1.brand} ${phone1.model} vs ${phone2.brand} ${phone2.model} Comparison`;
    description = `Compare ${phone1.brand} ${phone1.model} vs ${phone2.brand} ${phone2.model} prices in India, specs, battery capacity, camera configuration, and AI ratings.`;
  } else if (phone1) {
    title = `Compare ${phone1.brand} ${phone1.model}`;
    description = `Compare specifications, performance scores, and live prices of ${phone1.brand} ${phone1.model} side-by-side.`;
  }

  const titleText = `${title} | SmartPick AI`;

  return {
    title: titleText,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: titleText,
      description,
      url: canonicalUrl,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: titleText,
      description,
    }
  };
}

export default async function CompareSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const phones = await getPhones();

  const parts = slug.split("-vs-");
  const phone1 = phones.find(p => generatePhoneSlug(p.brand, p.model) === parts[0]);
  const phone2 = parts[1] ? phones.find(p => generatePhoneSlug(p.brand, p.model) === parts[1]) : null;

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
          <CompareCatalog 
            phones={phones} 
            initialPhone1Id={phone1 ? String(phone1.id) : undefined}
            initialPhone2Id={phone2 ? String(phone2.id) : undefined}
          />
        </Suspense>
      </main>
    </div>
  );
}
