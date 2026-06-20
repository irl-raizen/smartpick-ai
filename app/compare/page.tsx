import type { Metadata } from "next";
import { Suspense } from "react";
import { supabase, getPhones } from "@/src/lib/supabase";
import { CompareCatalog } from "./CompareCatalog";

export const revalidate = 1800; // ISR - Revalidate every 30 minutes

interface PageProps {
  searchParams: Promise<{ phone1?: string; phone2?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const p1Id = params.phone1;
  const p2Id = params.phone2;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartpickai.vercel.app";
  
  // Construct absolute canonical URL with comparison parameters if present
  const queryParams = new URLSearchParams();
  if (p1Id) queryParams.set("phone1", p1Id);
  if (p2Id) queryParams.set("phone2", p2Id);
  const canonicalUrl = `${baseUrl}/compare${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

  let title = "Compare Smartphones";
  let description = "Compare specifications, performance ratings, and features of the latest smartphones side-by-side.";

  if (p1Id || p2Id) {
    try {
      const ids: number[] = [];
      if (p1Id) {
        const id1 = parseInt(p1Id, 10);
        if (!isNaN(id1)) ids.push(id1);
      }
      if (p2Id) {
        const id2 = parseInt(p2Id, 10);
        if (!isNaN(id2)) ids.push(id2);
      }

      if (ids.length > 0) {
        const { data: phones } = await (supabase.from("phones") as any)
          .select("id, brand, model")
          .in("id", ids);

        if (phones && phones.length > 0) {
          const phone1Obj = p1Id ? phones.find((p: any) => String(p.id) === p1Id) : null;
          const phone2Obj = p2Id ? phones.find((p: any) => String(p.id) === p2Id) : null;

          if (phone1Obj && phone2Obj) {
            title = `${phone1Obj.brand} ${phone1Obj.model} vs ${phone2Obj.brand} ${phone2Obj.model} Comparison`;
            description = `Side-by-side specifications comparison for ${phone1Obj.brand} ${phone1Obj.model} and ${phone2Obj.brand} ${phone2Obj.model}. Check winner metrics for camera, gaming performance, battery, and price.`;
          } else if (phone1Obj) {
            title = `Compare ${phone1Obj.brand} ${phone1Obj.model}`;
            description = `Compare specifications, ratings, and features of ${phone1Obj.brand} ${phone1Obj.model} side-by-side with other popular smartphones.`;
          } else if (phone2Obj) {
            title = `Compare ${phone2Obj.brand} ${phone2Obj.model}`;
            description = `Compare specifications, ratings, and features of ${phone2Obj.brand} ${phone2Obj.model} side-by-side with other popular smartphones.`;
          }
        }
      }
    } catch (e) {
      console.error("Failed to generate metadata for compare page:", e);
    }
  }

  const titleText = `${title} | SmartPick AI`;

  return {
    title: titleText,
    description: description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: titleText,
      description: description,
      url: canonicalUrl,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: titleText,
      description: description,
    }
  };
}

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
