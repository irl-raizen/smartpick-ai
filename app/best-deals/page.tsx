import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPhones, supabase, generatePhoneSlug } from "@/src/lib/supabase";
import type { Phone } from "@/src/types/phone";

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Schema Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Decorative Blur Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl text-center mb-16">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-violet-300"
          >
            ← Back to home
          </Link>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-200">
            <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
            Live Deals Dashboard
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Best Smartphone Deals
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Real-time tracking of price drops, lowest prices, and back-in-stock alerts across Amazon and Flipkart.
          </p>
        </section>

        {/* 1. Biggest Price Drops Section */}
        <section className="mb-20">
          <div className="mb-6 flex items-center justify-between border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <h2 className="text-2xl font-bold text-white">Biggest Price Drops</h2>
            </div>
            <span className="text-xs text-zinc-500">Updated recently</span>
          </div>

          {biggestPriceDrops.length === 0 ? (
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-12 text-center text-zinc-500">
              No recent price drops recorded. Check back later!
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {biggestPriceDrops.map((drop) => (
                <Link
                  key={drop.phone.id}
                  href={`/phones/${generatePhoneSlug(drop.phone.brand, drop.phone.model)}`}
                  className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-emerald-950/10"
                >
                  <span className="absolute -top-3 -right-3 z-10 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-zinc-950 shadow-md">
                    Save {formatPrice(drop.dropAmount)} ({drop.dropPercent}%)
                  </span>

                  <div className="mb-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
                      {drop.phone.brand} • Price Drop on {drop.store_name}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white group-hover:text-violet-200 transition-colors">
                      {drop.phone.model}
                    </h3>
                  </div>

                  {drop.phone.image_url && (
                    <div className="relative w-full h-36 mb-4 rounded-xl overflow-hidden bg-zinc-950/40 p-2">
                      <Image
                        src={drop.phone.image_url}
                        alt={`${drop.phone.brand} ${drop.phone.model}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 250px"
                        className="object-contain p-2 transition duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                    <div className="text-xs text-zinc-500">
                      Was <span className="line-through">{formatPrice(drop.old_price)}</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {formatPrice(drop.new_price)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 2. Recently Back in Stock Section */}
        <section className="mb-20">
          <div className="mb-6 flex items-center justify-between border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <h2 className="text-2xl font-bold text-white">Recently Back In Stock</h2>
            </div>
            <span className="text-xs text-zinc-500 font-medium text-emerald-400">In Stock Now</span>
          </div>

          {recentlyBackInStock.length === 0 ? (
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-12 text-center text-zinc-500">
              No recently back-in-stock items detected.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recentlyBackInStock.map((phone) => (
                <Link
                  key={phone.id}
                  href={`/phones/${generatePhoneSlug(phone.brand, phone.model)}`}
                  className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-violet-950/10"
                >
                  <span className="absolute -top-3 -right-3 z-10 flex h-6 items-center justify-center rounded-full bg-indigo-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md animate-pulse">
                    Back in Stock
                  </span>

                  <div className="mb-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-violet-400">
                      {phone.brand}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white group-hover:text-violet-200 transition-colors">
                      {phone.model}
                    </h3>
                  </div>

                  {phone.image_url && (
                    <div className="relative w-full h-36 mb-4 rounded-xl overflow-hidden bg-zinc-950/40 p-2">
                      <Image
                        src={phone.image_url}
                        alt={`${phone.brand} ${phone.model}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 250px"
                        className="object-contain p-2 transition duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                    <span className="text-xs text-zinc-500">Live Price</span>
                    <span className="text-lg font-bold text-white">
                      {formatPrice(phone.price)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 3. Lowest Prices Today */}
        <section className="mb-20">
          <div className="mb-6 flex items-center justify-between border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <h2 className="text-2xl font-bold text-white">Lowest Prices Today</h2>
            </div>
            <span className="text-xs text-zinc-500">Sorted by budget</span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lowestPricesToday.map((phone) => (
              <Link
                key={phone.id}
                href={`/phones/${generatePhoneSlug(phone.brand, phone.model)}`}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-violet-950/10"
              >
                <div className="mb-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {phone.brand}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white group-hover:text-violet-200 transition-colors">
                    {phone.model}
                  </h3>
                </div>

                {phone.image_url && (
                  <div className="relative w-full h-36 mb-4 rounded-xl overflow-hidden bg-zinc-950/40 p-2">
                    <Image
                      src={phone.image_url}
                      alt={`${phone.brand} ${phone.model}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 250px"
                      className="object-contain p-2 transition duration-300 group-hover:scale-105"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                  <span className="text-xs text-zinc-500">Best Value</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {formatPrice(phone.price)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Value Champions by Budget Tier */}
        <section className="mb-10">
          <div className="mb-8 border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <h2 className="text-2xl font-bold text-white">Value Champions by Budget</h2>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Top phones in each price bracket, ranked by their AI performance scores (Camera + Gaming + Battery).
            </p>
          </div>

          <div className="space-y-16">
            {/* Under 20k */}
            <div>
              <h3 className="text-lg font-semibold text-amber-300 mb-4 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-xs">
                Budget Champions: Under ₹20,000
              </h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {under20k.map((phone) => (
                  <Link
                    key={phone.id}
                    href={`/phones/${generatePhoneSlug(phone.brand, phone.model)}`}
                    className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-violet-950/10"
                  >
                    <div className="mb-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                        {phone.brand}
                      </p>
                      <h4 className="mt-1 text-base font-semibold text-white group-hover:text-violet-200 transition-colors">
                        {phone.model}
                      </h4>
                    </div>

                    {phone.image_url && (
                      <div className="relative w-full h-32 mb-4 rounded-xl overflow-hidden bg-zinc-950/40 p-2">
                        <Image
                          src={phone.image_url}
                          alt={`${phone.brand} ${phone.model}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 200px"
                          className="object-contain p-2 transition duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                      <div className="text-xs text-zinc-450">
                        Score: <span className="font-semibold text-violet-300">{getPerformanceScore(phone)}/30</span>
                      </div>
                      <span className="text-sm font-bold text-white">
                        {formatPrice(phone.price)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Under 30k */}
            <div>
              <h3 className="text-lg font-semibold text-emerald-300 mb-4 inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-xs">
                Mid-Range Powerhouses: Under ₹30,000
              </h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {under30k.map((phone) => (
                  <Link
                    key={phone.id}
                    href={`/phones/${generatePhoneSlug(phone.brand, phone.model)}`}
                    className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-violet-950/10"
                  >
                    <div className="mb-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                        {phone.brand}
                      </p>
                      <h4 className="mt-1 text-base font-semibold text-white group-hover:text-violet-200 transition-colors">
                        {phone.model}
                      </h4>
                    </div>

                    {phone.image_url && (
                      <div className="relative w-full h-32 mb-4 rounded-xl overflow-hidden bg-zinc-950/40 p-2">
                        <Image
                          src={phone.image_url}
                          alt={`${phone.brand} ${phone.model}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 200px"
                          className="object-contain p-2 transition duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                      <div className="text-xs text-zinc-450">
                        Score: <span className="font-semibold text-violet-300">{getPerformanceScore(phone)}/30</span>
                      </div>
                      <span className="text-sm font-bold text-white">
                        {formatPrice(phone.price)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Under 50k */}
            <div>
              <h3 className="text-lg font-semibold text-violet-300 mb-4 inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full text-xs">
                Premium Flagships: Under ₹50,000
              </h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {under50k.map((phone) => (
                  <Link
                    key={phone.id}
                    href={`/phones/${generatePhoneSlug(phone.brand, phone.model)}`}
                    className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-violet-950/10"
                  >
                    <div className="mb-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                        {phone.brand}
                      </p>
                      <h4 className="mt-1 text-base font-semibold text-white group-hover:text-violet-200 transition-colors">
                        {phone.model}
                      </h4>
                    </div>

                    {phone.image_url && (
                      <div className="relative w-full h-32 mb-4 rounded-xl overflow-hidden bg-zinc-950/40 p-2">
                        <Image
                          src={phone.image_url}
                          alt={`${phone.brand} ${phone.model}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 200px"
                          className="object-contain p-2 transition duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                      <div className="text-xs text-zinc-450">
                        Score: <span className="font-semibold text-violet-300">{getPerformanceScore(phone)}/30</span>
                      </div>
                      <span className="text-sm font-bold text-white">
                        {formatPrice(phone.price)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
