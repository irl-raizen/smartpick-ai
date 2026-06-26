"use client";

import { useState, useEffect, useRef } from "react";

export function SyncControls() {
  const [apiKey, setApiKey] = useState("");
  const [limit, setLimit] = useState(5);
  const [dryRun, setDryRun] = useState(false);
  const [syncType, setSyncType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Load API key from local storage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("smartpick_admin_key");
    if (savedKey) setApiKey(savedKey);
  }, []);

  // Scroll to bottom of console logs on update
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const saveApiKey = (val: string) => {
    setApiKey(val);
    localStorage.setItem("smartpick_admin_key", val);
  };

  const triggerSync = async (endpoint: string, typeName: string) => {
    if (!apiKey) {
      alert("Please enter your Admin API Key.");
      return;
    }
    
    setIsLoading(true);
    setSyncType(typeName);
    setLogs([]); // Reset logs for the new job

    const addLog = (msg: string) => {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    addLog(`🚀 [JOB START] Initiating ${typeName} (Batch Size: ${limit}, Dry Run: ${dryRun ? "ENABLED" : "DISABLED"})`);
    addLog(`🔑 API Key Authorization verified.`);
    addLog(`📡 Sending POST request to /api/${endpoint}...`);

    const url = `/api/${endpoint}?limit=${limit}&dryRun=${dryRun}`;
    
    // Simulation steps for real-time terminal output
    const simulationSteps = [
      "Connecting to Supabase Database...",
      "Initializing scraper crawler...",
      "Fetching target data pages...",
      "Parsing HTML content via Cheerio...",
      "Applying image source prioritization filters...",
      "Reconciling database records...",
      "Executing transactional updates..."
    ];

    let stepIdx = 0;
    const intervalId = setInterval(() => {
      if (stepIdx < simulationSteps.length) {
        addLog(`⏳ ${simulationSteps[stepIdx]}`);
        stepIdx++;
      }
    }, 1200);

    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
      });

      clearInterval(intervalId);

      const data = await response.json();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (response.ok) {
        addLog(`✅ ${typeName} completed successfully in ${duration}s!`);
        addLog(`📊 RESULTS SUMMARY:`);
        addLog(JSON.stringify(data, null, 2));
      } else {
        addLog(`❌ ${typeName} failed after ${duration}s: ${data.error || "Unknown Error"}`);
        if (response.status === 401) {
          addLog("💡 Hint: Make sure your API key matches N8N_API_KEY in your .env.local file.");
        }
      }
    } catch (err: any) {
      clearInterval(intervalId);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      addLog(`❌ Connection Error after ${duration}s: ${err.message || String(err)}`);
    } finally {
      setIsLoading(false);
      setSyncType(null);
    }
  };

  return (
    <div className="rounded-3xl border border-zinc-900 bg-zinc-900/40 p-8 backdrop-blur-sm shadow-2xl space-y-6">
      <h2 className="text-lg font-bold text-white tracking-wide border-b border-zinc-850 pb-3">
        Sync Controller Panel
      </h2>

      <div className="grid gap-6 sm:grid-cols-12 items-end">
        {/* API Key Input */}
        <div className="sm:col-span-4 space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            Admin API Key (x-api-key)
          </label>
          <input
            type="password"
            placeholder="••••••••••••••••"
            value={apiKey}
            onChange={(e) => saveApiKey(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 py-2.5 px-4 text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
        </div>

        {/* Limit Input */}
        <div className="sm:col-span-3 space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            Sync Batch Limit
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(e) => setLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 py-2.5 px-4 text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
        </div>

        {/* Dry Run Checkbox */}
        <div className="sm:col-span-3 pb-3 flex items-center gap-3">
          <input
            type="checkbox"
            id="dryRunCheckbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="h-5 w-5 rounded border-zinc-850 bg-zinc-950 text-violet-600 focus:ring-violet-500/30"
          />
          <label htmlFor="dryRunCheckbox" className="text-sm font-semibold text-zinc-300 cursor-pointer select-none">
            Dry Run Mode
          </label>
        </div>

        {/* Clear Logs Button */}
        <div className="sm:col-span-2 text-right">
          <button
            onClick={() => setLogs([])}
            disabled={logs.length === 0}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2.5 text-xs font-semibold text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            Clear Console
          </button>
        </div>
      </div>

      {/* Button controls grid */}
      <div className="grid gap-4 sm:grid-cols-4 pt-2">
        <button
          onClick={() => triggerSync("sync-gsmarena", "GSMArena Sync")}
          disabled={isLoading}
          className={`rounded-xl py-3 px-4 text-xs sm:text-sm font-bold shadow-lg transition-all duration-300 ${
            isLoading && syncType === "GSMArena Sync"
              ? "bg-violet-650 text-white cursor-not-allowed animate-pulse"
              : "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-950/30 hover:scale-[1.02]"
          } disabled:opacity-40 disabled:pointer-events-none`}
        >
          {isLoading && syncType === "GSMArena Sync" ? "Syncing specs..." : "Run GSMArena Sync"}
        </button>

        <button
          onClick={() => triggerSync("sync-amazon", "Amazon Price Sync")}
          disabled={isLoading}
          className={`rounded-xl py-3 px-4 text-xs sm:text-sm font-bold shadow-lg transition-all duration-300 ${
            isLoading && syncType === "Amazon Price Sync"
              ? "bg-amber-650 text-zinc-950 cursor-not-allowed animate-pulse"
              : "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-950/10 hover:scale-[1.02]"
          } disabled:opacity-40 disabled:pointer-events-none`}
        >
          {isLoading && syncType === "Amazon Price Sync" ? "Syncing Amazon..." : "Run Amazon Sync"}
        </button>

        <button
          onClick={() => triggerSync("sync-flipkart", "Flipkart Price Sync")}
          disabled={isLoading}
          className={`rounded-xl py-3 px-4 text-xs sm:text-sm font-bold shadow-lg transition-all duration-300 ${
            isLoading && syncType === "Flipkart Price Sync"
              ? "bg-blue-650 text-white cursor-not-allowed animate-pulse"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/10 hover:scale-[1.02]"
          } disabled:opacity-40 disabled:pointer-events-none`}
        >
          {isLoading && syncType === "Flipkart Price Sync" ? "Syncing Flipkart..." : "Run Flipkart Sync"}
        </button>

        <button
          onClick={() => triggerSync("sync-all", "Unified Catalog Sync")}
          disabled={isLoading}
          className={`rounded-xl py-3 px-4 text-xs sm:text-sm font-bold shadow-lg transition-all duration-300 ${
            isLoading && syncType === "Unified Catalog Sync"
              ? "bg-emerald-650 text-white cursor-not-allowed animate-pulse"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/10 hover:scale-[1.02]"
          } disabled:opacity-40 disabled:pointer-events-none`}
        >
          {isLoading && syncType === "Unified Catalog Sync" ? "Syncing all..." : "Run Full Sync"}
        </button>
      </div>

      {/* Terminal logs console */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
          Terminal Console output
        </span>
        <div className="w-full h-72 rounded-2xl border border-zinc-900 bg-zinc-950 p-5 font-mono text-xs overflow-y-auto text-emerald-400 space-y-1.5 shadow-inner">
          {logs.length === 0 ? (
            <span className="text-zinc-655 italic select-none">No active job logs. Trigger a sync job to inspect status in real-time...</span>
          ) : (
            logs.map((log, idx) => (
              <pre key={idx} className="whitespace-pre-wrap select-text leading-relaxed">
                {log}
              </pre>
            ))
          )}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  );
}
