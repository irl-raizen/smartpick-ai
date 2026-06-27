import type { Metadata } from "next";
import Link from "next/link";
import { getPhones, supabase, generatePhoneSlug } from "@/src/lib/supabase";
import type { Phone } from "@/src/types/phone";
import { 
  Sparkles, 
  Flame, 
  Battery, 
  Cpu, 
  Camera, 
  Star, 
  ShoppingBag, 
  ArrowRight,
  TrendingDown,
  Layers,
  ChevronRight,
  ShieldCheck,
  Tag,
  CheckCircle2,
  AlertCircle,
  Trophy
} from "lucide-react";

export const revalidate = 1800; // ISR - Revalidate every 30 minutes

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartpickai.vercel.app";

export const metadata: Metadata = {
  title: "Best Mobile Deals in India | SmartPick AI",
  description: "Check live Amazon and Flipkart prices, biggest price drops, availability, and best deals under budget categories for top smartphones.",
  alternates: {
    canonical: `${baseUrl}/best-deals`,
  },
  openGraph: {
    title: "Best Mobile Deals in India | SmartPick AI",
    description: "Check live Amazon and Flipkart prices, biggest price drops, availability, and best deals under budget categories for top smartphones.",
    url: `${baseUrl}/best-deals`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Mobile Deals in India | SmartPick AI",
    description: "Check live Amazon and Flipkart prices, biggest price drops, availability, and best deals under budget categories for top smartphones.",
  }
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function getPerformanceScore(phone: Phone) {
  return phone.score_camera + phone.score_gaming + phone.score_battery;
}

export default async function BestDealsPage() {
  const allPhones = await getPhones();
  const activePhones = allPhones.filter((phone) => phone.active !== false);

  // 1. Biggest Price Drops
  let biggestPriceDrops: any[] = [];
  try {
    const { data: history } = await (supabase.from("price_history") as any)
      .select("phone_id, old_price, new_price, changed_at, store_name")
      .order("changed_at", { ascending: false });

    if (history && history.length > 0) {
      const drops = history
        .filter((h: any) => h.old_price > h.new_price)
        .map((h: any) => {
          const phone = activePhones.find((p) => String(p.id) === String(h.phone_id));
          return {
            ...h,
            phone,
            dropAmount: h.old_price - h.new_price,
            dropPercent: Math.round(((h.old_price - h.new_price) / h.old_price) * 100),
          };
        })
        .filter((h: any) => h.phone !== undefined);

      // Deduplicate: keep only the latest drop per phone
      const uniqueDropsMap = new Map<string, any>();
      for (const drop of drops) {
        const key = String(drop.phone_id);
        if (!uniqueDropsMap.has(key)) {
          uniqueDropsMap.set(key, drop);
        }
      }

      biggestPriceDrops = Array.from(uniqueDropsMap.values())
        .sort((a, b) => b.dropAmount - a.dropAmount)
        .slice(0, 6);
    }
  } catch (error) {
    console.error("Failed to query price history for best deals:", error);
  }

  // 2. Lowest Prices Today
  const lowestPricesToday = [...activePhones]
    .sort((a, b) => a.price - b.price)
    .slice(0, 6);

  // 3. Recently Back In Stock
  const recentlyBackInStock = activePhones
    .filter((p) => p.market_status === "ACTIVE" && p.prices_last_scraped)
    .sort((a, b) => {
      const dateA = a.prices_last_scraped ? new Date(a.prices_last_scraped).getTime() : 0;
      const dateB = b.prices_last_scraped ? new Date(b.prices_last_scraped).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 6);

  // 4. Best Deals Under Tiers (₹20k, ₹30k, ₹50k)
  const under20k = activePhones
    .filter((p) => p.price <= 20000)
    .sort((a, b) => getPerformanceScore(b) - getPerformanceScore(a))
    .slice(0, 6);

  const under30k = activePhones
    .filter((p) => p.price <= 30000)
    .sort((a, b) => getPerformanceScore(b) - getPerformanceScore(a))
    .slice(0, 6);

  const under50k = activePhones
    .filter((p) => p.price <= 50000)
    .sort((a, b) => getPerformanceScore(b) - getPerformanceScore(a))
    .slice(0, 6);

  // JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${baseUrl}/best-deals/#webpage`,
        "url": `${baseUrl}/best-deals`,
        "name": "Best Smartphone Deals & Discounts | SmartPick AI",
        "description": "Find the best deals, live prices, discount estimates, and active price drops on top smartphones from Amazon and Flipkart.",
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": baseUrl
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Best Deals",
              "item": `${baseUrl}/best-deals`
            }
          ]
        }
      },
      {
        "@type": "ItemList",
        "@id": `${baseUrl}/best-deals/#itemlist`,
        "name": "Top Smartphone Deals in India Today",
        "numberOfItems": lowestPricesToday.length,
        "itemListElement": lowestPricesToday.map((phone, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Product",
            "name": `${phone.brand} ${phone.model}`,
            "image": phone.image_url,
            "description": `Check live Amazon and Flipkart prices, availability, and AI review for ${phone.brand} ${phone.model}.`,
            "offers": {
              "@type": "Offer",
              "price": phone.price,
              "priceCurrency": "INR",
              "availability": phone.market_status === "ACTIVE" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              "url": `${baseUrl}/phones/${generatePhoneSlug(phone.brand, phone.model)}`
            }
          }
        }))
      }
    ]
  };

  return (
    <div className="min-h-screen bg-zinc-955 text-zinc-100 overflow-x-hidden relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Decorative Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 h-[35rem] w-[45rem] -translate-x-1/2 rounded-full bg-radial-gradient from-violet-600/10 via-transparent to-transparent blur-3xl" />
        <div className="absolute top-1/3 -left-36 h-[25rem] w-[25rem] rounded-full bg-fuchsia-600/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 h-[35rem] w-[35rem] rounded-full bg-indigo-600/5 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb */}
        <nav className="mb-8 flex items-center justify-between border-b border-zinc-900 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-violet-350"
          >
            ← Back to Home
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
            <span>Deals</span>
            <span>/</span>
            <span className="text-zinc-300">Live Dashboard</span>
          </div>
        </nav>

        {/* Header */}
        <section className="mx-auto max-w-3xl text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/25 bg-rose-500/10 px-4.5 py-1.5 text-xs font-bold text-rose-300 uppercase tracking-widest animate-pulse">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Live Deals Dashboard
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            Smart Smartphone Deals
          </h1>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-zinc-450 leading-relaxed font-medium">
            Real-time tracking of price cuts, value champions, and back-in-stock alerts synced directly from Amazon and Flipkart.
          </p>
        </section>

        {/* 1. Biggest Price Drops */}
        <section className="mb-20 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4.5">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-rose-400 leading-none">
                <TrendingDown className="h-4 w-4" />
                Price cuts
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">Biggest Price Drops</h2>
            </div>
            <span className="text-[10px] font-bold text-zinc-550 uppercase bg-zinc-900 px-3 py-1 rounded-full border border-zinc-850">Recently updated</span>
          </div>

          {biggestPriceDrops.length === 0 ? (
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-12 text-center text-zinc-550 text-xs">
              No recent price drops recorded on our databases. Check back later!
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {biggestPriceDrops.map((drop) => {
                const ratingValue = ((drop.phone.score_camera + drop.phone.score_gaming + drop.phone.score_battery) / 3).toFixed(1);
                return (
                  <Link
                    key={drop.phone.id}
                    href={`/phones/${drop.phone.slug || generatePhoneSlug(drop.phone.brand, drop.phone.model)}`}
                    className="group relative rounded-3xl border border-zinc-900 bg-zinc-900/15 p-6 backdrop-blur-sm hover:border-zinc-800 transition duration-300 flex flex-col justify-between"
                  >
                    <span className="absolute -top-3 -right-2 z-10 inline-flex items-center rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-zinc-950 shadow-md">
                      Save {formatPrice(drop.dropAmount)} (-{drop.dropPercent}%)
                    </span>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400 block leading-none mb-1">
                          {drop.phone.brand} • Drop on {drop.store_name}
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-violet-200 transition">
                          {drop.phone.model}
                        </h3>
                      </div>

                      {drop.phone.image_url && (
                        <div className="h-40 w-full relative flex items-center justify-center p-3 bg-zinc-950/40 rounded-2xl border border-zinc-900/50 group-hover:scale-[1.03] transition duration-500">
                          <img src={drop.phone.image_url} alt="" className="h-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-900/80 pt-4 mt-4">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-550 uppercase block mb-0.5">Original price</span>
                        <span className="text-xs text-zinc-500 line-through leading-none block">{formatPrice(drop.old_price)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-0.5">Live price</span>
                        <span className="text-base font-black text-white leading-none block">{formatPrice(drop.new_price)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. Recently Back in Stock */}
        <section className="mb-20 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4.5">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-violet-400 leading-none">
                <CheckCircle2 className="h-4 w-4 text-violet-400" />
                Availability Check
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">Recently Back In Stock</h2>
            </div>
            <span className="text-[10px] font-bold text-emerald-450 uppercase bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">In stock</span>
          </div>

          {recentlyBackInStock.length === 0 ? (
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-12 text-center text-zinc-550 text-xs">
              All tracked listings are currently in standard stock status.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recentlyBackInStock.map((phone) => {
                const ratingValue = ((phone.score_camera + phone.score_gaming + phone.score_battery) / 3).toFixed(1);
                return (
                  <Link
                    key={phone.id}
                    href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                    className="group relative rounded-3xl border border-zinc-900 bg-zinc-900/15 p-6 backdrop-blur-sm hover:border-zinc-800 transition duration-300 flex flex-col justify-between"
                  >
                    <span className="absolute -top-3 -right-2 z-10 inline-flex items-center rounded-full bg-violet-650 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-md">
                      Back In Stock
                    </span>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 block leading-none mb-1">
                          {phone.brand}
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-violet-200 transition">
                          {phone.model}
                        </h3>
                      </div>

                      {phone.image_url && (
                        <div className="h-40 w-full relative flex items-center justify-center p-3 bg-zinc-950/40 rounded-2xl border border-zinc-900/50 group-hover:scale-[1.03] transition duration-500">
                          <img src={phone.image_url} alt="" className="h-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-900/80 pt-4 mt-4">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-450 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                        Rating: {(phone.rating || 4.2).toFixed(1)}
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-zinc-550 block mb-0.5">Live price</span>
                        <span className="text-base font-black text-white leading-none block">{formatPrice(phone.price)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Lowest Prices Today */}
        <section className="mb-20 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4.5">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-400 leading-none">
                <Tag className="h-4 w-4 text-amber-400" />
                Price Filter
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">Lowest Prices Today</h2>
            </div>
            <span className="text-[10px] font-bold text-zinc-550 uppercase bg-zinc-900 px-3 py-1 rounded-full border border-zinc-850">Sorted by budget</span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lowestPricesToday.map((phone) => {
              const ratingValue = ((phone.score_camera + phone.score_gaming + phone.score_battery) / 3).toFixed(1);
              return (
                <Link
                  key={phone.id}
                  href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                  className="group relative rounded-3xl border border-zinc-900 bg-zinc-900/15 p-6 backdrop-blur-sm hover:border-zinc-800 transition duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 block leading-none mb-1">
                        {phone.brand}
                      </span>
                      <h3 className="text-base font-bold text-white group-hover:text-violet-200 transition">
                        {phone.model}
                      </h3>
                    </div>

                    {phone.image_url && (
                      <div className="h-40 w-full relative flex items-center justify-center p-3 bg-zinc-950/40 rounded-2xl border border-zinc-900/50 group-hover:scale-[1.03] transition duration-500">
                        <img src={phone.image_url} alt="" className="h-full object-contain" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-900/80 pt-4 mt-4">
                    <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded">
                      Great Value
                    </span>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-zinc-555 block mb-0.5">Live price</span>
                      <span className="text-base font-black text-emerald-400 leading-none block">{formatPrice(phone.price)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4. Value Champions by Budget Tier */}
        <section className="space-y-16">
          <div className="border-b border-zinc-900 pb-5">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-violet-455" />
              <h2 className="text-2xl font-black text-white tracking-tight">Value Champions by Budget</h2>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Top phones in each price bracket, ranked by their AI performance scores (Camera + Gaming + Battery).
            </p>
          </div>

          {/* Under 20k Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
              <span>Budget Champions: Under ₹20,000</span>
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {under20k.map((phone) => {
                const ratingValue = ((phone.score_camera + phone.score_gaming + phone.score_battery) / 3).toFixed(1);
                return (
                  <Link
                    key={phone.id}
                    href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                    className="group relative rounded-3xl border border-zinc-900 bg-zinc-900/15 p-6 backdrop-blur-sm hover:border-zinc-800 transition duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 block leading-none mb-1">
                          {phone.brand}
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-violet-200 transition">
                          {phone.model}
                        </h3>
                      </div>

                      {phone.image_url && (
                        <div className="h-40 w-full relative flex items-center justify-center p-3 bg-zinc-950/40 rounded-2xl border border-zinc-900/50 group-hover:scale-[1.03] transition duration-500">
                          <img src={phone.image_url} alt="" className="h-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-900/80 pt-4 mt-4">
                      <span className="text-xs font-bold text-zinc-300">{formatPrice(phone.price)}</span>
                      <span className="text-xs font-black text-fuchsia-350">Score: {ratingValue}/10</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Under 30k Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
              <span>Mid-Range Champions: Under ₹30,000</span>
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {under30k.map((phone) => {
                const ratingValue = ((phone.score_camera + phone.score_gaming + phone.score_battery) / 3).toFixed(1);
                return (
                  <Link
                    key={phone.id}
                    href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                    className="group relative rounded-3xl border border-zinc-900 bg-zinc-900/15 p-6 backdrop-blur-sm hover:border-zinc-800 transition duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 block leading-none mb-1">
                          {phone.brand}
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-violet-200 transition">
                          {phone.model}
                        </h3>
                      </div>

                      {phone.image_url && (
                        <div className="h-40 w-full relative flex items-center justify-center p-3 bg-zinc-950/40 rounded-2xl border border-zinc-900/50 group-hover:scale-[1.03] transition duration-500">
                          <img src={phone.image_url} alt="" className="h-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-900/80 pt-4 mt-4">
                      <span className="text-xs font-bold text-zinc-300">{formatPrice(phone.price)}</span>
                      <span className="text-xs font-black text-fuchsia-350">Score: {ratingValue}/10</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Under 50k Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
              <span>Premium Mid-Range: Under ₹50,000</span>
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {under50k.map((phone) => {
                const ratingValue = ((phone.score_camera + phone.score_gaming + phone.score_battery) / 3).toFixed(1);
                return (
                  <Link
                    key={phone.id}
                    href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                    className="group relative rounded-3xl border border-zinc-900 bg-zinc-900/15 p-6 backdrop-blur-sm hover:border-zinc-800 transition duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 block leading-none mb-1">
                          {phone.brand}
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-violet-200 transition">
                          {phone.model}
                        </h3>
                      </div>

                      {phone.image_url && (
                        <div className="h-40 w-full relative flex items-center justify-center p-3 bg-zinc-950/40 rounded-2xl border border-zinc-900/50 group-hover:scale-[1.03] transition duration-500">
                          <img src={phone.image_url} alt="" className="h-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-900/80 pt-4 mt-4">
                      <span className="text-xs font-bold text-zinc-300">{formatPrice(phone.price)}</span>
                      <span className="text-xs font-black text-fuchsia-350">Score: {ratingValue}/10</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
