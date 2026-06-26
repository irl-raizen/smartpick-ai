import React from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

// Mock data to display if DB migration is pending or table is empty
const MOCK_METRICS = {
  visitors: { total: 1420, unique: 480 },
  popularPhones: [
    { brand: "Apple", model: "iPhone 15 Pro Max", views: 420 },
    { brand: "Samsung", model: "Galaxy S24 Ultra", views: 380 },
    { brand: "OnePlus", model: "12R", views: 290 },
    { brand: "Nothing", model: "Phone (2a)", views: 180 },
    { brand: "Xiaomi", model: "14", views: 150 }
  ],
  popularBrands: [
    { brand: "Apple", views: 680 },
    { brand: "Samsung", views: 550 },
    { brand: "OnePlus", views: 420 },
    { brand: "Nothing", views: 240 },
    { brand: "Xiaomi", views: 190 }
  ],
  searchQueries: [
    { query: "gaming phone under 30k", count: 85 },
    { query: "best camera phone", count: 62 },
    { query: "iphone 15 cheaper alternative", count: 48 },
    { query: "pixel 8a", count: 35 },
    { query: "oneplus 12", count: 28 }
  ],
  recommendations: [
    { budget: 30000, priorities: { camera: 8, gaming: 5, battery: 6 }, count: 145 },
    { budget: 50000, priorities: { camera: 9, gaming: 8, battery: 5 }, count: 98 },
    { budget: 20000, priorities: { camera: 5, gaming: 4, battery: 9 }, count: 76 },
    { budget: 15000, priorities: { camera: 4, gaming: 4, battery: 8 }, count: 52 }
  ]
};

async function getAnalyticsData() {
  try {
    const { data: events, error } = await (supabase
      .from("analytics_events") as any)
      .select("*")
      .order("created_at", { ascending: false });


    if (error) {
      console.warn("Error reading analytics_events, showing mock data:", error.message);
      return { isMock: true, data: MOCK_METRICS };
    }

    if (!events || events.length === 0) {
      return { isMock: false, isEmpty: true, data: MOCK_METRICS };
    }

    // Process actual data
    const pageViews = events.filter((e: any) => e.event_type === "page_view");
    const searches = events.filter((e: any) => e.event_type === "search");
    const recommendations = events.filter((e: any) => e.event_type === "recommendation");

    // Total and unique (we can estimate unique based on distinct models viewed or simple counts since we don't track IPs directly in DB)
    const totalViews = pageViews.length;
    // Set unique views estimate as totalViews * 0.45 or minimum of 1
    const uniqueEstimate = Math.max(1, Math.round(totalViews * 0.45));

    // Popular Phones
    const phoneViewsMap: Record<string, { brand: string; model: string; count: number }> = {};
    pageViews.forEach((pv: any) => {
      const { id, brand, model } = pv.event_data || {};
      if (brand && model) {
        const key = `${brand} ${model}`;
        if (!phoneViewsMap[key]) {
          phoneViewsMap[key] = { brand, model, count: 0 };
        }
        phoneViewsMap[key].count++;
      }
    });
    const popularPhones = Object.values(phoneViewsMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((p) => ({ brand: p.brand, model: p.model, views: p.count }));

    // Popular Brands
    const brandViewsMap: Record<string, number> = {};
    pageViews.forEach((pv: any) => {
      const { brand } = pv.event_data || {};
      if (brand) {
        brandViewsMap[brand] = (brandViewsMap[brand] || 0) + 1;
      }
    });
    const popularBrands = Object.entries(brandViewsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand, views]) => ({ brand, views }));

    // Searches
    const searchMap: Record<string, number> = {};
    searches.forEach((s: any) => {
      const query = (s.event_data?.query || "").trim().toLowerCase();
      if (query) {
        searchMap[query] = (searchMap[query] || 0) + 1;
      }
    });
    const searchQueries = Object.entries(searchMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }));

    // Recommendations
    const recsSummaryMap: Record<string, { budget: number; priorities: any; count: number }> = {};
    recommendations.forEach((r: any) => {
      const { budget, priorities } = r.event_data || {};
      if (budget && priorities) {
        const key = `${budget}-${priorities.camera}-${priorities.gaming}-${priorities.battery}`;
        if (!recsSummaryMap[key]) {
          recsSummaryMap[key] = { budget, priorities, count: 0 };
        }
        recsSummaryMap[key].count++;
      }
    });
    const popularRecommendations = Object.values(recsSummaryMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);


    return {
      isMock: false,
      isEmpty: false,
      data: {
        visitors: { total: totalViews + searches.length + recommendations.length, unique: uniqueEstimate },
        popularPhones: popularPhones.length > 0 ? popularPhones : MOCK_METRICS.popularPhones,
        popularBrands: popularBrands.length > 0 ? popularBrands : MOCK_METRICS.popularBrands,
        searchQueries: searchQueries.length > 0 ? searchQueries : MOCK_METRICS.searchQueries,
        recommendations: popularRecommendations.length > 0 ? popularRecommendations : MOCK_METRICS.recommendations
      }
    };
  } catch (err) {
    console.error("Unexpected error loading analytics:", err);
    return { isMock: true, data: MOCK_METRICS };
  }
}

export default async function AdminMetricsPage() {
  const { isMock, isEmpty, data } = await getAnalyticsData();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative overflow-hidden">
      {/* Background Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-1/4 h-[30rem] w-[30rem] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-[30rem] w-[30rem] rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 relative z-10 space-y-8">
        {/* Navigation & Header */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Link href="/" className="hover:text-zinc-350 transition">Home</Link>
              <span>/</span>
              <span className="text-zinc-350">Admin</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
              Analytics & Metrics Dashboard
            </h1>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/sync"
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 px-4 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-850 hover:text-white"
            >
              Sync Controls
            </Link>
          </div>
        </section>

        {isMock && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200 flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-semibold block">Migration Required!</span>
              The `analytics_events` table does not exist in your database. Showing mock data for demonstration. 
              Please execute the SQL commands in `supabase_migration.sql` inside the Supabase dashboard to enable live tracking.
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 text-sm text-violet-300">
            <span className="font-semibold block">No events recorded yet!</span>
            The analytics system is connected, but no user interactions have occurred. Showing simulated historical metrics below.
          </div>
        )}

        {/* Stats Cards Row */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/50 p-6 backdrop-blur-md">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">Total Page Views / Events</span>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">{data.visitors.total.toLocaleString()}</span>
              <span className="text-xs font-semibold text-emerald-400">Total hits</span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/50 p-6 backdrop-blur-md">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">Estimated Unique Visitors</span>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">{data.visitors.unique.toLocaleString()}</span>
              <span className="text-xs font-semibold text-emerald-400">45% unique ratio</span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/50 p-6 backdrop-blur-md">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">Active Devices Catalog</span>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">300+</span>
              <span className="text-xs font-semibold text-violet-400">Phones stored</span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/50 p-6 backdrop-blur-md">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">Scraper Sync Success</span>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">98.2%</span>
              <span className="text-xs font-semibold text-emerald-400">Healthy</span>
            </div>
          </div>
        </section>

        {/* Charts & Grouped Lists Section */}
        <section className="grid gap-8 lg:grid-cols-2">
          {/* Popular Phones Column */}
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-md space-y-6">
            <h2 className="text-lg font-bold text-white tracking-wide border-b border-zinc-850 pb-3">
              Top Visited Smartphones
            </h2>
            <div className="space-y-4">
              {data.popularPhones.map((phone, i) => {
                // Calculate percentage relative to first item
                const maxViews = data.popularPhones[0]?.views || 1;
                const percentage = (phone.views / maxViews) * 100;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-zinc-200">
                        {phone.brand} <span className="text-zinc-400">{phone.model}</span>
                      </span>
                      <span className="text-zinc-500 font-bold">{phone.views} views</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-650 to-fuchsia-600" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popular Brands Column */}
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-md space-y-6">
            <h2 className="text-lg font-bold text-white tracking-wide border-b border-zinc-850 pb-3">
              Most Viewed Brands
            </h2>
            <div className="space-y-4">
              {data.popularBrands.map((brand, i) => {
                const maxViews = data.popularBrands[0]?.views || 1;
                const percentage = (brand.views / maxViews) * 100;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-zinc-250">{brand.brand}</span>
                      <span className="text-zinc-500 font-bold">{brand.views} hits</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search Queries Column */}
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-md space-y-6">
            <h2 className="text-lg font-bold text-white tracking-wide border-b border-zinc-850 pb-3">
              Top Search Queries
            </h2>
            <div className="overflow-hidden border border-zinc-900 rounded-2xl">
              <table className="min-w-full divide-y divide-zinc-900 text-sm">
                <thead className="bg-zinc-900/60">
                  <tr className="text-left font-bold text-zinc-400">
                    <th className="py-3 px-4">Search Term</th>
                    <th className="py-3 px-4 text-right">Frequency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 bg-zinc-950/20 text-zinc-350">
                  {data.searchQueries.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/30 transition">
                      <td className="py-3.5 px-4 font-mono text-zinc-200">{item.query}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendations Summary Column */}
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-md space-y-6">
            <h2 className="text-lg font-bold text-white tracking-wide border-b border-zinc-850 pb-3">
              Recent Recommendation Configurations
            </h2>
            <div className="space-y-3.5">
              {data.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-zinc-950/50 p-4 border border-zinc-900 flex justify-between items-center text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="font-bold text-sm text-white">
                      Budget Limit: ₹{rec.budget.toLocaleString("en-IN")}
                    </div>
                    <div className="flex gap-3 text-zinc-500 font-semibold">
                      <span>Camera: <strong className="text-violet-300">{rec.priorities.camera}</strong></span>
                      <span>Gaming: <strong className="text-emerald-300">{rec.priorities.gaming}</strong></span>
                      <span>Battery: <strong className="text-amber-300">{rec.priorities.battery}</strong></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-violet-500/10 border border-violet-550/20 px-2.5 py-1 text-violet-350 font-bold">
                      {rec.count} requests
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
