import Link from "next/link";
import { getPhones, generatePhoneSlug, supabase } from "@/src/lib/supabase";
import { HomeSearchBar } from "@/src/components/HomeSearchBar";
import { HomeRecommendationForm } from "@/src/components/HomeRecommendationForm";
import { 
  Sparkles, 
  Flame, 
  Star, 
  Cpu, 
  Camera, 
  Battery, 
  BadgePercent, 
  History, 
  Smartphone, 
  CalendarDays, 
  ArrowUpRight,
  ArrowRight,
  TrendingDown,
  Layers,
  ChevronRight,
  ShieldCheck,
  Send
} from "lucide-react";
import type { Phone } from "@/src/types/phone";

export const dynamic = "force-dynamic";

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

export default async function Home() {
  const allPhones = await getPhones();
  const activePhones = allPhones.filter(p => p.active !== false);

  // 1. Trending Phones (Sleekest flagships)
  const trendingPhones = [...activePhones]
    .filter(p => p.rating && p.rating >= 4.5)
    .slice(0, 6);

  // 2. Top Rated Phones (Sorted by rating)
  const topRatedPhones = [...activePhones]
    .filter(p => typeof p.rating === "number")
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6);

  // 3. Newest Launches (Filtered by year if present)
  const newestLaunches = [...activePhones]
    .sort((a, b) => (b.launch_year || 2024) - (a.launch_year || 2024))
    .slice(0, 6);

  // 4. Best Deals (Highest price cuts)
  const bestDealsToday = [...activePhones]
    .filter(p => p.amazon_price && p.price > p.amazon_price)
    .sort((a, b) => (b.price - (b.amazon_price ?? 0)) - (a.price - (a.amazon_price ?? 0)))
    .slice(0, 6);

  // 5. Best Camera (score_camera >= 8)
  const bestCameraPhones = [...activePhones]
    .sort((a, b) => b.score_camera - a.score_camera)
    .slice(0, 6);

  // 6. Best Gaming (score_gaming >= 8)
  const bestGamingPhones = [...activePhones]
    .sort((a, b) => b.score_gaming - a.score_gaming)
    .slice(0, 6);

  // 7. Best Battery (score_battery >= 8)
  const bestBatteryPhones = [...activePhones]
    .sort((a, b) => b.score_battery - a.score_battery)
    .slice(0, 6);

  // 8. Budget Champions (Price <= 15000)
  const budgetChampions = [...activePhones]
    .filter(p => p.price <= 15000)
    .sort((a, b) => getPerformanceScore(b) - getPerformanceScore(a))
    .slice(0, 6);

  // 9. Brands count extraction
  const brandCounts = allPhones.reduce((acc: Record<string, number>, phone) => {
    acc[phone.brand] = (acc[phone.brand] || 0) + 1;
    return acc;
  }, {});

  const popularBrands = Object.entries(brandCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // 10. Latest price history changes
  let recentPriceDrops: any[] = [];
  try {
    const { data } = await (supabase.from("price_history") as any)
      .select("phone_id, old_price, new_price, changed_at, store_name")
      .order("changed_at", { ascending: false })
      .limit(4);
    
    if (data) {
      recentPriceDrops = data.map((h: any) => {
        const phone = allPhones.find(p => String(p.id) === String(h.phone_id));
        return { ...h, phone };
      }).filter((h: any) => h.phone !== undefined);
    }
  } catch (e) {
    console.error("Failed to query price drops", e);
  }

  // 11. Hero featured slider (3 prominent flagships)
  const heroFeatured = activePhones
    .filter(p => p.model.includes("Pro Max") || p.model.includes("Ultra") || p.model.includes("Fold"))
    .slice(0, 3);

  return (
    <div className="relative min-h-screen bg-zinc-955 text-zinc-100 overflow-x-hidden">
      
      {/* Background Grids & Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 h-[45rem] w-[50rem] -translate-x-1/2 rounded-full bg-radial-gradient from-violet-600/15 via-transparent to-transparent blur-3xl" />
        <div className="absolute top-1/4 -left-36 h-[30rem] w-[30rem] rounded-full bg-fuchsia-600/5 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-[40rem] w-[40rem] rounded-full bg-indigo-600/5 blur-3xl" />
      </div>

      {/* 1. HERO SECTION */}
      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pt-16 pb-24 sm:px-6 lg:px-8 text-center space-y-12">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4.5 py-1.5 text-xs font-bold text-violet-300 uppercase tracking-widest animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            Artificial Intelligence Matcher
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-none">
            Find Your Next Phone with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400">
              AI Insight
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-zinc-400 leading-relaxed font-medium">
            SmartPick AI analyzes specs, camera quality, gaming capabilities, and live Amazon & Flipkart prices to matching you with the perfect smartphone.
          </p>
        </div>

        {/* Instant Search Component */}
        <HomeSearchBar phones={allPhones} />

        {/* Hero CTA & Stats Panel */}
        <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-4 text-xs font-bold uppercase tracking-wider pt-2">
          <a href="/phones" className="inline-flex items-center gap-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-5 py-3.5 text-zinc-200 hover:text-white transition">
            Browse Catalog
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <a href="/compare" className="inline-flex items-center gap-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-5 py-3.5 text-zinc-200 hover:text-white transition">
            Compare Specs
            <Layers className="h-3.5 w-3.5" />
          </a>
          <a href="#ai-matcher" className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3.5 text-white transition hover:shadow-lg hover:shadow-violet-950/20">
            Start Matcher
            <Sparkles className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Hero Mini Carousel Showcase */}
        {heroFeatured.length > 0 && (
          <div className="relative max-w-4xl mx-auto pt-10">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-550 block mb-6">Featured Premium flagships</span>
            <div className="grid gap-6 sm:grid-cols-3">
              {heroFeatured.map((phone) => (
                <Link
                  key={phone.id}
                  href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                  className="group relative rounded-3xl border border-zinc-900 bg-zinc-900/10 p-5 backdrop-blur-sm hover:border-zinc-800 transition duration-300 flex flex-col items-center text-center overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition">
                    <ArrowUpRight className="h-4.5 w-4.5 text-zinc-500 hover:text-white" />
                  </div>
                  {phone.image_url && (
                    <div className="h-28 w-28 relative flex items-center justify-center mb-4 transition duration-500 group-hover:scale-108 group-hover:-rotate-1">
                      <img src={phone.image_url} alt="" className="h-full object-contain" />
                    </div>
                  )}
                  <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 mb-1 leading-none">{phone.brand}</span>
                  <h4 className="text-sm font-bold text-white leading-tight">{phone.model}</h4>
                  <span className="text-xs font-semibold text-zinc-450 mt-2">{formatPrice(phone.price)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 2. BRANDS LOGO GRID */}
      <section className="border-y border-zinc-900/60 bg-zinc-950/40 py-10 relative z-10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-sm font-extrabold uppercase tracking-widest text-zinc-400">Popular Brands</h4>
              <p className="text-xs text-zinc-550">Click on any brand to browse specifications instantly</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {popularBrands.map((brand) => (
                <Link
                  key={brand.name}
                  href={`/phones?brand=${brand.name}`}
                  className="rounded-2xl border border-zinc-900 bg-zinc-900/25 px-5 py-3 hover:bg-zinc-900 hover:border-zinc-800 hover:scale-[1.03] transition duration-300 flex items-center gap-2.5"
                >
                  <Smartphone className="h-4 w-4 text-violet-450" />
                  <span className="text-xs font-bold text-zinc-200">{brand.name}</span>
                  <span className="text-[10px] font-bold text-zinc-550 bg-zinc-950/80 px-2 py-0.5 rounded-md border border-zinc-850">
                    {brand.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. LATEST PRICE DROPS & DEALS CONTAINER */}
      <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:px-8 relative z-10">
        <div className="grid gap-12 lg:grid-cols-12 items-start">
          {/* Left: Latest price drops (col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-rose-400 mb-2">
                <TrendingDown className="h-3.5 w-3.5" />
                Live Price Drops
              </span>
              <h3 className="text-3xl font-black text-white tracking-tight">Recent Smart Deals</h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Real-time price drops tracked on major retail stores. Select to check availability.
              </p>
            </div>

            {recentPriceDrops.length === 0 ? (
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-8 text-center text-zinc-500 text-xs">
                No recent price drops logged in last 24h. Check back soon!
              </div>
            ) : (
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/15 p-5 space-y-4 backdrop-blur-sm">
                {recentPriceDrops.map((drop) => {
                  const dropAmt = drop.old_price - drop.new_price;
                  const dropPct = Math.round((dropAmt / drop.old_price) * 100);
                  return (
                    <Link
                      key={drop.phone_id + drop.changed_at}
                      href={`/phones/${drop.phone.slug || generatePhoneSlug(drop.phone.brand, drop.phone.model)}`}
                      className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/40 border border-zinc-900/80 hover:border-zinc-800 transition duration-300 group"
                    >
                      <div className="flex items-center gap-3">
                        {drop.phone.image_url && (
                          <div className="h-10 w-10 relative rounded-lg bg-zinc-950 p-1 flex items-center justify-center shrink-0 border border-zinc-850">
                            <img src={drop.phone.image_url} alt="" className="h-full object-contain" />
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase leading-none block mb-0.5">{drop.phone.brand}</span>
                          <span className="text-sm font-bold text-white block">{drop.phone.model}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-zinc-500 line-through">{formatPrice(drop.old_price)}</span>
                          <span className="text-sm font-black text-rose-400">{formatPrice(drop.new_price)}</span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-rose-400 bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.5 rounded mt-1.5">
                          -{dropPct}% Down
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            
            <Link
              href="/best-deals"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300 transition duration-300"
            >
              View all live deals dashboard
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Right: Best Deals grid (col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-violet-400 mb-2">
                  <BadgePercent className="h-3.5 w-3.5" />
                  Best Discounts Today
                </span>
                <h3 className="text-3xl font-black text-white tracking-tight">Best Deals Today</h3>
              </div>
              <Link href="/best-deals" className="text-xs font-bold text-zinc-400 hover:text-white transition">View All</Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {bestDealsToday.slice(0, 4).map((phone) => {
                const diff = phone.price - (phone.amazon_price ?? 0);
                const pct = Math.round((diff / phone.price) * 100);
                return (
                  <Link
                    key={phone.id}
                    href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                    className="group relative rounded-3xl border border-zinc-900 bg-zinc-900/20 p-5 backdrop-blur-sm hover:border-zinc-800 transition duration-300 flex items-center justify-between"
                  >
                    <div className="space-y-2">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 block leading-none">{phone.brand}</span>
                      <h4 className="text-sm font-bold text-white group-hover:text-violet-200 transition">{phone.model}</h4>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-black text-white">{formatPrice(phone.amazon_price || phone.price)}</span>
                        <span className="text-xs text-zinc-500 line-through">{formatPrice(phone.price)}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      {phone.image_url && (
                        <div className="h-14 w-14 relative flex items-center justify-center p-1 bg-zinc-950 rounded-xl border border-zinc-850 group-hover:scale-105 transition">
                          <img src={phone.image_url} alt="" className="h-full object-contain" />
                        </div>
                      )}
                      <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded">
                        Save {formatPrice(diff)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 4. SWIPEABLE SHOWCASE SECTIONS (TRENDING & TOP RATED) */}
      <section className="border-t border-zinc-900 bg-zinc-950/20 py-20 relative z-10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* Section: Trending Smartphones */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-violet-450 mb-2">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  Hottest Choices
                </span>
                <h3 className="text-3xl font-black text-white tracking-tight">Trending smartphones</h3>
              </div>
              <Link href="/phones" className="text-xs font-bold text-zinc-400 hover:text-white transition">View Catalog</Link>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-4 snap-x scrollbar-thin scrollbar-thumb-zinc-850">
              {trendingPhones.map((phone) => (
                <div key={phone.id} className="min-w-[280px] sm:min-w-[320px] snap-start">
                  <Link
                    href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                    className="group block rounded-3xl border border-zinc-900 bg-zinc-900/15 p-5 backdrop-blur-sm hover:border-zinc-800 transition duration-300"
                  >
                    {phone.image_url && (
                      <div className="h-44 w-full relative flex items-center justify-center p-4 bg-zinc-950/40 rounded-2xl border border-zinc-900/50 mb-4 group-hover:scale-105 transition duration-500">
                        <img src={phone.image_url} alt="" className="h-full object-contain" />
                      </div>
                    )}
                    <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 mb-1 leading-none block">{phone.brand}</span>
                    <h4 className="text-base font-bold text-white leading-tight group-hover:text-violet-200 transition">{phone.model}</h4>
                    
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-900/80">
                      <span className="text-sm font-black text-white">{formatPrice(phone.price)}</span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-450">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                        <span>{(phone.rating || 4.2).toFixed(1)} / 5</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Top Rated Smartphones */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-400 mb-2">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  Expert Rating Winners
                </span>
                <h3 className="text-3xl font-black text-white tracking-tight">Top Rated Smartphones</h3>
              </div>
              <Link href="/phones" className="text-xs font-bold text-zinc-400 hover:text-white transition">View Catalog</Link>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-4 snap-x scrollbar-thin scrollbar-thumb-zinc-850">
              {topRatedPhones.map((phone) => (
                <div key={phone.id} className="min-w-[280px] sm:min-w-[320px] snap-start">
                  <Link
                    href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                    className="group block rounded-3xl border border-zinc-900 bg-zinc-900/15 p-5 backdrop-blur-sm hover:border-zinc-800 transition duration-300"
                  >
                    {phone.image_url && (
                      <div className="h-44 w-full relative flex items-center justify-center p-4 bg-zinc-950/40 rounded-2xl border border-zinc-900/50 mb-4 group-hover:scale-105 transition duration-500">
                        <img src={phone.image_url} alt="" className="h-full object-contain" />
                      </div>
                    )}
                    <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 mb-1 leading-none block">{phone.brand}</span>
                    <h4 className="text-base font-bold text-white leading-tight group-hover:text-violet-200 transition">{phone.model}</h4>
                    
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-900/80">
                      <span className="text-sm font-black text-white">{formatPrice(phone.price)}</span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-455 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                        <span>{(phone.rating || 4.2).toFixed(1)} / 5</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. SPEC-FOCUS HIGHLIGHT SECTIONS */}
      <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:px-8 space-y-20 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-455">Find by Specialization</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Browse by Your Priorities</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Direct access to smartphone line-ups optimized specifically for photography, raw speed, or battery stamina.
          </p>
        </div>

        {/* 3 Categories Columns */}
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Best Camera Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-900">
              <Camera className="h-5 w-5 text-violet-400" />
              <h3 className="text-lg font-bold text-white">Best Camera Phones</h3>
            </div>
            <div className="space-y-3">
              {bestCameraPhones.slice(0, 3).map((phone) => (
                <Link
                  key={phone.id}
                  href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/10 border border-zinc-900/60 hover:border-zinc-800 transition duration-300"
                >
                  {phone.image_url && (
                    <div className="h-10 w-10 relative flex items-center justify-center shrink-0 bg-zinc-950 rounded-lg p-1">
                      <img src={phone.image_url} alt="" className="h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-xs font-extrabold text-white line-clamp-1">{phone.model}</h4>
                    <span className="text-[10px] text-zinc-500 block leading-tight mt-0.5">{phone.camera}</span>
                  </div>
                  <span className="text-[10px] font-black text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">{phone.score_camera}/10</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Best Gaming Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-900">
              <Cpu className="h-5 w-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Best Gaming & Speed</h3>
            </div>
            <div className="space-y-3">
              {bestGamingPhones.slice(0, 3).map((phone) => (
                <Link
                  key={phone.id}
                  href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/10 border border-zinc-900/60 hover:border-zinc-800 transition duration-300"
                >
                  {phone.image_url && (
                    <div className="h-10 w-10 relative flex items-center justify-center shrink-0 bg-zinc-950 rounded-lg p-1">
                      <img src={phone.image_url} alt="" className="h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-xs font-extrabold text-white line-clamp-1">{phone.model}</h4>
                    <span className="text-[10px] text-zinc-500 block leading-tight mt-0.5">{phone.processor || phone.chipset}</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{phone.score_gaming}/10</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Best Battery Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-900">
              <Battery className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Best Battery Life</h3>
            </div>
            <div className="space-y-3">
              {bestBatteryPhones.slice(0, 3).map((phone) => (
                <Link
                  key={phone.id}
                  href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/10 border border-zinc-900/60 hover:border-zinc-800 transition duration-300"
                >
                  {phone.image_url && (
                    <div className="h-10 w-10 relative flex items-center justify-center shrink-0 bg-zinc-950 rounded-lg p-1">
                      <img src={phone.image_url} alt="" className="h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-xs font-extrabold text-white line-clamp-1">{phone.model}</h4>
                    <span className="text-[10px] text-zinc-500 block leading-tight mt-0.5">{phone.battery} mAh Battery</span>
                  </div>
                  <span className="text-[10px] font-black text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{phone.score_battery}/10</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 6. BUDGET CHAMPIONS & NEWEST LAUNCHES */}
      <section className="border-t border-zinc-900 bg-zinc-950/20 py-20 relative z-10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* Section: Budget Champions */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-emerald-450 mb-2">
                  <BadgePercent className="h-3.5 w-3.5 text-emerald-450" />
                  Elite Choices under ₹15,000
                </span>
                <h3 className="text-3xl font-black text-white tracking-tight">Budget Champions</h3>
              </div>
              <Link href="/phones" className="text-xs font-bold text-zinc-400 hover:text-white transition">View Catalog</Link>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-4 snap-x scrollbar-thin scrollbar-thumb-zinc-850">
              {budgetChampions.map((phone) => (
                <div key={phone.id} className="min-w-[280px] sm:min-w-[320px] snap-start">
                  <Link
                    href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                    className="group block rounded-3xl border border-zinc-900 bg-zinc-900/15 p-5 backdrop-blur-sm hover:border-zinc-800 transition duration-300"
                  >
                    {phone.image_url && (
                      <div className="h-44 w-full relative flex items-center justify-center p-4 bg-zinc-950/40 rounded-2xl border border-zinc-900/50 mb-4 group-hover:scale-105 transition duration-500">
                        <img src={phone.image_url} alt="" className="h-full object-contain" />
                      </div>
                    )}
                    <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 mb-1 leading-none block">{phone.brand}</span>
                    <h4 className="text-base font-bold text-white leading-tight group-hover:text-violet-200 transition">{phone.model}</h4>
                    
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-900/80">
                      <span className="text-sm font-black text-white">{formatPrice(phone.price)}</span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-450 bg-zinc-955 px-2 py-0.5 rounded border border-zinc-900">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                        <span>{(phone.rating || 4.1).toFixed(1)} / 5</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Newest Launches */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 mb-2">
                  <CalendarDays className="h-3.5 w-3.5 text-cyan-400" />
                  Latest Additions
                </span>
                <h3 className="text-3xl font-black text-white tracking-tight">Newest Launches</h3>
              </div>
              <Link href="/phones" className="text-xs font-bold text-zinc-400 hover:text-white transition">View Catalog</Link>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-4 snap-x scrollbar-thin scrollbar-thumb-zinc-850">
              {newestLaunches.map((phone) => (
                <div key={phone.id} className="min-w-[280px] sm:min-w-[320px] snap-start">
                  <Link
                    href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                    className="group block rounded-3xl border border-zinc-900 bg-zinc-900/15 p-5 backdrop-blur-sm hover:border-zinc-800 transition duration-300"
                  >
                    {phone.image_url && (
                      <div className="h-44 w-full relative flex items-center justify-center p-4 bg-zinc-950/40 rounded-2xl border border-zinc-900/50 mb-4 group-hover:scale-105 transition duration-500">
                        <img src={phone.image_url} alt="" className="h-full object-contain" />
                      </div>
                    )}
                    <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 mb-1 leading-none block">{phone.brand}</span>
                    <h4 className="text-base font-bold text-white leading-tight group-hover:text-violet-200 transition">{phone.model}</h4>
                    
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-900/80">
                      <span className="text-sm font-black text-white">{formatPrice(phone.price)}</span>
                      <span className="text-[9px] font-black uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 px-1.5 py-0.5 rounded">
                        {phone.launch_year || 2024}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. INTERACTIVE AI RECOMMENDATION CTA BANNER */}
      <section className="bg-gradient-to-r from-violet-900/40 via-indigo-900/20 to-fuchsia-900/30 border-y border-zinc-900 py-16 relative z-10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-300">Struggling to Decide?</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Let Our AI Matcher Pick For You</h2>
          <p className="mx-auto max-w-xl text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Answer a few simple questions regarding your budget constraints and feature weights, and we'll compute side-by-side compatibility matches.
          </p>
          <div>
            <a
              href="#ai-matcher"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-6 py-4.5 text-xs font-black text-zinc-950 shadow-xl hover:scale-[1.03] transition duration-300"
            >
              Start Matching Engine
              <Sparkles className="h-4.5 w-4.5 text-violet-600 animate-pulse" />
            </a>
          </div>
        </div>
      </section>

      {/* 8. INTERACTIVE RECOMMENDATION CONTAINER */}
      <section id="ai-matcher" className="mx-auto max-w-[1400px] px-4 py-24 sm:px-6 lg:px-8 relative z-10 scroll-mt-10">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-455">Smart Pick Tool</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">AI Matching Engine</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Adjust budget and priority sliders to matching you with the ideal smartphone from our 322 phones catalog.
          </p>
        </div>
        
        {/* Render Form */}
        <HomeRecommendationForm phones={allPhones} />
      </section>

      {/* 9. NEWSLETTER SUBSCRIPTION PANEL */}
      <section className="border-t border-zinc-900/60 bg-zinc-950/40 py-20 relative z-10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl border border-zinc-900 bg-zinc-900/10 p-8 sm:p-12 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-md">
            <div className="absolute top-0 left-0 -ml-16 -mt-16 h-36 w-36 rounded-full bg-violet-600/5 blur-2xl" />
            
            <div className="space-y-2 max-w-lg">
              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-violet-400">
                <ShieldCheck className="h-4 w-4" />
                Never Miss a Price Cut
              </span>
              <h3 className="text-2xl font-black text-white tracking-tight">Subscribe to Smart Deals Digest</h3>
              <p className="text-xs text-zinc-450 leading-relaxed">
                Join our newsletter list to get weekly summaries of the biggest price cuts, trending recommendations, and newly scraped catalog models.
              </p>
            </div>

            <div className="w-full md:max-w-md">
              <form onSubmit={(e) => { e.preventDefault(); alert('Subscribed successfully!'); }} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500 transition duration-300"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-violet-600 hover:bg-violet-550 px-6 py-3.5 text-xs font-black text-white flex items-center justify-center gap-1.5 transition duration-300 hover:shadow-lg hover:shadow-violet-900/20 shrink-0"
                >
                  Subscribe
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
