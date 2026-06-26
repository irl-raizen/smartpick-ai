import { Metadata } from "next";
import Link from "next/link";
import { getPhones, supabase } from "@/src/lib/supabase";
import { SyncControls } from "./SyncControls";
import { SyncCharts } from "./SyncCharts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Scraper & Sync Dashboard | SmartPick AI",
  description: "Monitor and trigger catalog scraping and price synchronization processes.",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    source?: string;
    status?: string;
  }>;
}

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "Never";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch (e) {
    return "Unknown";
  }
}

function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms)) return "-";
  return `${(ms / 1000).toFixed(1)}s`;
}

export default async function SyncDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentPage = params.page ? parseInt(params.page, 10) : 1;
  const currentSource = params.source || "all";
  const currentStatus = params.status || "all";

  const logsPerPage = 10;
  const fromLog = (currentPage - 1) * logsPerPage;
  const toLog = fromLog + logsPerPage - 1;

  // 1. Fetch general catalog status
  const phones = await getPhones();
  const totalPhones = phones.length;
  const activePhones = phones.filter((p) => p.active !== false).length;
  const outOfStockPhones = totalPhones - activePhones;
  const imagesAvailable = phones.filter((p) => p.image_url && p.image_url.trim() !== "").length;

  // 2. Fetch Last Successful and Last Failed Sync Logs
  let lastSuccessTimeStr: string | null = null;
  let lastFailedTimeStr: string | null = null;
  let lastFailedError: string | null = null;

  try {
    const { data: lastSuccess } = await (supabase.from("sync_logs") as any)
      .select("started_at, finished_at")
      .eq("status", "success")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastSuccess) {
      lastSuccessTimeStr = lastSuccess.finished_at || lastSuccess.started_at;
    }

    const { data: lastFailed } = await (supabase.from("sync_logs") as any)
      .select("started_at, finished_at, error_message")
      .eq("status", "failed")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastFailed) {
      lastFailedTimeStr = lastFailed.finished_at || lastFailed.started_at;
      lastFailedError = lastFailed.error_message;
    }
  } catch (err) {
    console.error("Failed to query last success/failure sync logs:", err);
  }

  // 3. Fetch all logs for calculating scraper metrics & charts (past 200 logs)
  let allLogs: any[] = [];
  try {
    const { data } = await (supabase.from("sync_logs") as any)
      .select("source, status, started_at, duration_ms, phones_processed, phones_updated, phones_inserted")
      .order("started_at", { ascending: false })
      .limit(200);
    allLogs = data ?? [];
  } catch (err) {
    console.error("Failed to fetch all logs for scraper stats:", err);
  }

  // Calculate stats for each scraper source
  const getScraperStats = (sourceName: string) => {
    // Filter runs of this scraper
    const scraperLogs = allLogs.filter((log) =>
      log.source && log.source.toLowerCase().startsWith(sourceName.toLowerCase())
    );

    const totalRuns = scraperLogs.length;
    const successfulRuns = scraperLogs.filter((log) => log.status === "success").length;
    const failedRuns = scraperLogs.filter((log) => log.status === "failed").length;
    
    const latestRun = scraperLogs[0];
    const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 100;
    const totalProcessed = scraperLogs.reduce((sum, log) => sum + (log.phones_processed || 0), 0);

    return {
      status: latestRun ? latestRun.status : "idle",
      lastRunTime: latestRun ? latestRun.started_at : null,
      duration: latestRun ? latestRun.duration_ms : null,
      successRate,
      failureCount: failedRuns,
      phonesProcessed: totalProcessed,
    };
  };

  const gsmStats = getScraperStats("gsmarena");
  const amazonStats = getScraperStats("amazon");
  const flipkartStats = getScraperStats("flipkart");

  // 4. Fetch price history for charts
  let priceHistoryList: any[] = [];
  try {
    const { data } = await (supabase.from("price_history") as any)
      .select("changed_at")
      .order("changed_at", { ascending: false })
      .limit(500);
    priceHistoryList = data ?? [];
  } catch (err) {
    console.error("Failed to query price history:", err);
  }

  // 5. Fetch paginated/filtered Recent Sync Logs
  let logsQuery = (supabase.from("sync_logs") as any).select("*", { count: "exact" });

  if (currentSource !== "all") {
    // Check if source matches start of logs' source name (like "amazon" matching "amazon (dry run)")
    logsQuery = logsQuery.ilike("source", `${currentSource}%`);
  }
  if (currentStatus !== "all") {
    logsQuery = logsQuery.eq("status", currentStatus);
  }

  const { data: paginatedLogs, count: totalLogsCount } = await logsQuery
    .order("started_at", { ascending: false })
    .range(fromLog, toLog);

  const displayLogs = paginatedLogs ?? [];
  const totalLogs = totalLogsCount ?? 0;
  const totalPages = Math.ceil(totalLogs / logsPerPage);

  const getPageLink = (p: number, src: string = currentSource, stat: string = currentStatus) => {
    const query = new URLSearchParams();
    if (p > 1) query.set("page", String(p));
    if (src !== "all") query.set("source", src);
    if (stat !== "all") query.set("status", stat);
    const queryStr = query.toString();
    return `/admin/sync${queryStr ? `?${queryStr}` : ""}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative">
      {/* Background Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute top-1/4 right-0 h-96 w-96 rounded-full bg-fuchsia-600/5 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <nav className="mb-8 flex items-center justify-between">
          <Link
            href="/phones"
            className="inline-flex items-center gap-2 text-sm text-zinc-450 transition hover:text-zinc-200"
          >
            ← Back to Catalog
          </Link>
          <div className="rounded-full bg-violet-500/10 border border-violet-500/20 px-3.5 py-1 text-xs font-semibold text-violet-300">
            System Administration
          </div>
        </nav>

        {/* Header */}
        <header className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Scraper & Sync Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Monitor real-time synchronization metrics, track crawler health, and manually trigger job runs.
          </p>
        </header>

        {/* Metrics Grid */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-10">
          {/* Card 1: Total Phones */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-5 backdrop-blur-sm shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">Total Phones</span>
              <span className="text-2xl font-black text-white mt-1 block">{totalPhones}</span>
            </div>
            <span className="text-[10px] text-zinc-450 mt-4 block">Registered in database</span>
          </div>

          {/* Card 2: Active Phones */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-5 backdrop-blur-sm shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">Active Phones</span>
              <span className="text-2xl font-black text-emerald-450 mt-1 block">{activePhones}</span>
            </div>
            <span className="text-[10px] text-emerald-500/80 mt-4 block">Available across stores</span>
          </div>

          {/* Card 3: Out of Stock */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-5 backdrop-blur-sm shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">Out of Stock</span>
              <span className="text-2xl font-black text-rose-450 mt-1 block">{outOfStockPhones}</span>
            </div>
            <span className="text-[10px] text-rose-500/80 mt-4 block">Unavailable everywhere</span>
          </div>

          {/* Card 4: Images Available */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-5 backdrop-blur-sm shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">Images Available</span>
              <span className="text-2xl font-black text-violet-400 mt-1 block">{imagesAvailable}</span>
            </div>
            <span className="text-[10px] text-zinc-450 mt-4 block">
              {totalPhones > 0 ? Math.round((imagesAvailable / totalPhones) * 100) : 0}% coverage
            </span>
          </div>

          {/* Card 5: Last Successful Sync */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-5 backdrop-blur-sm shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">Last Success Sync</span>
              <span className="text-sm font-bold text-emerald-400 mt-1 block truncate">
                {formatRelativeTime(lastSuccessTimeStr)}
              </span>
            </div>
            <span className="text-[10px] text-zinc-450 mt-4 block truncate">
              {lastSuccessTimeStr ? new Date(lastSuccessTimeStr).toLocaleTimeString("en-IN") : "No success log"}
            </span>
          </div>

          {/* Card 6: Last Failed Sync */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-5 backdrop-blur-sm shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">Last Failed Sync</span>
              <span className={`text-sm font-bold mt-1 block truncate ${lastFailedTimeStr ? "text-rose-400" : "text-zinc-500"}`}>
                {formatRelativeTime(lastFailedTimeStr)}
              </span>
            </div>
            <span 
              className="text-[10px] text-rose-500/80 mt-4 block truncate cursor-help"
              title={lastFailedError || undefined}
            >
              {lastFailedError ? lastFailedError : lastFailedTimeStr ? "Error recorded" : "No failed log"}
            </span>
          </div>
        </section>

        {/* Charts Section */}
        <section className="mb-10 space-y-4">
          <h2 className="text-lg font-bold text-white tracking-wide">Sync Metrics & Trends</h2>
          <SyncCharts 
            syncLogs={allLogs as any} 
            priceHistory={priceHistoryList as any} 
            totalPhones={totalPhones} 
            imagesAvailable={imagesAvailable} 
          />
        </section>

        {/* Scraper Engine Health Section */}
        <section className="mb-10 space-y-4">
          <h2 className="text-lg font-bold text-white tracking-wide">Scraper Engine Health</h2>
          
          <div className="grid gap-6 md:grid-cols-3">
            {/* GSMArena Scraper */}
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">GSMArena Scraper</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  gsmStats.status === "success" 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : gsmStats.status === "running"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse"
                    : gsmStats.status === "failed"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}>
                  {gsmStats.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-2 border-y border-zinc-900 text-xs">
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Last Run</span>
                  <span className="text-zinc-200 font-semibold">{formatRelativeTime(gsmStats.lastRunTime)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Last Duration</span>
                  <span className="text-zinc-200 font-semibold">{formatDuration(gsmStats.duration)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Processed</span>
                  <span className="text-zinc-200 font-semibold">{gsmStats.phonesProcessed} phones</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Failures</span>
                  <span className={`font-semibold ${gsmStats.failureCount > 0 ? "text-rose-400" : "text-zinc-200"}`}>
                    {gsmStats.failureCount}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-500">Success Rate</span>
                  <span className="text-emerald-450 font-bold">{gsmStats.successRate}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-emerald-500" 
                    style={{ width: `${gsmStats.successRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Amazon Scraper */}
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Amazon Scraper</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  amazonStats.status === "success" 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : amazonStats.status === "running"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse"
                    : amazonStats.status === "failed"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}>
                  {amazonStats.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-2 border-y border-zinc-900 text-xs">
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Last Run</span>
                  <span className="text-zinc-200 font-semibold">{formatRelativeTime(amazonStats.lastRunTime)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Last Duration</span>
                  <span className="text-zinc-200 font-semibold">{formatDuration(amazonStats.duration)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Processed</span>
                  <span className="text-zinc-200 font-semibold">{amazonStats.phonesProcessed} phones</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Failures</span>
                  <span className={`font-semibold ${amazonStats.failureCount > 0 ? "text-rose-400" : "text-zinc-200"}`}>
                    {amazonStats.failureCount}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-500">Success Rate</span>
                  <span className="text-amber-500 font-bold">{amazonStats.successRate}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-amber-500" 
                    style={{ width: `${amazonStats.successRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Flipkart Scraper */}
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Flipkart Scraper</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  flipkartStats.status === "success" 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : flipkartStats.status === "running"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse"
                    : flipkartStats.status === "failed"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}>
                  {flipkartStats.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-2 border-y border-zinc-900 text-xs">
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Last Run</span>
                  <span className="text-zinc-200 font-semibold">{formatRelativeTime(flipkartStats.lastRunTime)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Last Duration</span>
                  <span className="text-zinc-200 font-semibold">{formatDuration(flipkartStats.duration)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Processed</span>
                  <span className="text-zinc-200 font-semibold">{flipkartStats.phonesProcessed} phones</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Failures</span>
                  <span className={`font-semibold ${flipkartStats.failureCount > 0 ? "text-rose-400" : "text-zinc-200"}`}>
                    {flipkartStats.failureCount}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-500">Success Rate</span>
                  <span className="text-blue-500 font-bold">{flipkartStats.successRate}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-blue-500" 
                    style={{ width: `${flipkartStats.successRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sync Controls Section */}
        <section className="mb-10">
          <SyncControls />
        </section>

        {/* Recent Sync Logs Section (Filtered and Paginated) */}
        <section className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-8 backdrop-blur-sm shadow-2xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-850 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Recent Sync Logs
              </h2>
              <p className="text-xs text-zinc-450 mt-0.5">
                Inspect history of scraper executions and batch sync results.
              </p>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Source Filter */}
              <div className="flex flex-col space-y-1">
                <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Source</span>
                <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
                  {["all", "gsmarena", "amazon", "flipkart", "sync-all"].map((src) => (
                    <Link
                      key={src}
                      href={getPageLink(1, src, currentStatus)}
                      className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition ${
                        currentSource === src 
                          ? "bg-violet-650 text-white" 
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                      }`}
                    >
                      {src === "sync-all" ? "Full" : src === "gsmarena" ? "GSM" : src}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex flex-col space-y-1">
                <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Status</span>
                <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
                  {["all", "success", "running", "failed"].map((stat) => (
                    <Link
                      key={stat}
                      href={getPageLink(1, currentSource, stat)}
                      className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition ${
                        currentStatus === stat 
                          ? "bg-violet-650 text-white" 
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                      }`}
                    >
                      {stat}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-900 bg-zinc-950/40">
            <table className="min-w-full divide-y divide-zinc-900 text-left text-xs sm:text-sm">
              <thead className="bg-zinc-900/60 font-semibold text-zinc-400">
                <tr>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Started At</th>
                  <th className="px-5 py-3">Finished At</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Phones Processed</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-350">
                {displayLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-zinc-500 italic">
                      No logs found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  displayLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-zinc-900/40 transition">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-white font-mono capitalize">
                          {log.source}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                          log.status === "success"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : log.status === "running"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 text-xs">
                        {log.started_at ? new Date(log.started_at).toLocaleString("en-IN") : "-"}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 text-xs">
                        {log.finished_at ? new Date(log.finished_at).toLocaleString("en-IN") : "-"}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-zinc-300">
                        {formatDuration(log.duration_ms)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-center text-zinc-300">
                        {log.phones_processed ?? 0}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-zinc-200 font-semibold">{log.phones_updated || 0} updated</span>
                          {log.phones_inserted > 0 && (
                            <span className="text-[10px] text-emerald-400 font-semibold font-mono">+{log.phones_inserted} inserted</span>
                          )}
                          {log.phones_marked_inactive > 0 && (
                            <span className="text-[10px] text-amber-500 font-semibold font-mono">-{log.phones_marked_inactive} inactive</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className={`font-bold ${log.errors > 0 ? "text-rose-450" : "text-zinc-450"}`}>
                            {log.errors ?? 0}
                          </span>
                          {log.status === "failed" && log.error_message && (
                            <span className="text-[9px] font-mono text-rose-400 max-w-[150px] truncate" title={log.error_message}>
                              {log.error_message}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-900 pt-4">
              <span className="text-xs text-zinc-500">
                Showing page <span className="font-bold text-zinc-350">{currentPage}</span> of{" "}
                <span className="font-bold text-zinc-350">{totalPages}</span> ({totalLogs} total logs)
              </span>
              
              <div className="flex gap-2">
                <Link
                  href={getPageLink(currentPage - 1)}
                  className={`rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-900 hover:text-white ${
                    currentPage === 1 ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  Previous
                </Link>
                <Link
                  href={getPageLink(currentPage + 1)}
                  className={`rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-900 hover:text-white ${
                    currentPage >= totalPages ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
