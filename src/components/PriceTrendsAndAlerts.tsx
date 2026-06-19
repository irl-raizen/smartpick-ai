"use client";

import { useEffect, useState } from "react";

type PricePoint = {
  date: string;
  price: number;
};

export function PriceTrendsAndAlerts({
  phoneId,
  currentPrice,
  model,
}: {
  phoneId: string;
  currentPrice: number;
  model: string;
}) {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState<number>(Math.round(currentPrice * 0.95));
  const [submittingAlert, setSubmittingAlert] = useState(false);
  const [alertStatus, setAlertStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/price-history?id=${phoneId}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data)) {
          setHistory(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch price history:", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [phoneId]);

  const handleSubscribeAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setAlertStatus({ type: "error", message: "Please enter a valid email address." });
      return;
    }
    if (targetPrice <= 0 || targetPrice >= currentPrice) {
      setAlertStatus({ type: "error", message: "Target price must be lower than the current price." });
      return;
    }

    setSubmittingAlert(true);
    setAlertStatus(null);

    try {
      const res = await fetch("/api/price-alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_id: phoneId,
          email,
          target_price: targetPrice,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setAlertStatus({
          type: "success",
          message: `Success! We will email you at ${email} when the price drops to ₹${targetPrice.toLocaleString("en-IN")} or below.`,
        });
        setEmail("");
      } else {
        setAlertStatus({ type: "error", message: result.error || "Failed to set alert." });
      }
    } catch (e) {
      setAlertStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setSubmittingAlert(false);
    }
  };

  // 1. Calculate price drops in the last 7 days
  const calculatePriceDrop = () => {
    if (history.length < 2) return null;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentPoints = history.filter((p) => new Date(p.date) >= sevenDaysAgo);
    if (recentPoints.length === 0) return null;

    const prices = recentPoints.map((p) => p.price);
    const maxPrice = Math.max(...prices, currentPrice);
    const drop = maxPrice - currentPrice;

    return drop > 0 ? drop : null;
  };

  const priceDrop = calculatePriceDrop();

  // 2. SVG Chart dimensions and paths
  const renderChart = () => {
    if (history.length < 2) {
      return (
        <div className="h-40 flex items-center justify-center border border-zinc-900 bg-zinc-950/40 rounded-2xl text-xs text-zinc-500 italic">
          No sufficient historical price trends recorded yet.
        </div>
      );
    }

    const padding = { top: 20, right: 25, bottom: 25, left: 55 };
    const width = 500;
    const height = 180;

    const prices = history.map((h) => h.price);
    const maxPrice = Math.max(...prices) * 1.05;
    const minPrice = Math.min(...prices) * 0.95;
    const priceRange = maxPrice - minPrice || 1;

    const dates = history.map((h) => new Date(h.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const dateRange = maxDate - minDate || 1;

    // Map points to SVG coordinates
    const points = history.map((pt) => {
      const x = padding.left + ((new Date(pt.date).getTime() - minDate) / dateRange) * (width - padding.left - padding.right);
      const y = padding.top + (1 - (pt.price - minPrice) / priceRange) * (height - padding.top - padding.bottom);
      return { x, y, price: pt.price, date: pt.date };
    });

    // Build the SVG path
    let linePath = "";
    let areaPath = "";

    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
      areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;
    }

    // Grid lines coordinates
    const gridCount = 4;
    const gridY = Array.from({ length: gridCount }).map((_, i) => {
      const price = minPrice + (i / (gridCount - 1)) * priceRange;
      const y = padding.top + (1 - (price - minPrice) / priceRange) * (height - padding.top - padding.bottom);
      return { y, price };
    });

    return (
      <div className="relative overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="chartStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#d946ef" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines & Y Axis labels */}
          {gridY.map((g, idx) => (
            <g key={idx} className="opacity-40">
              <line
                x1={padding.left}
                y1={g.y}
                x2={width - padding.right}
                y2={g.y}
                stroke="#27272a"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 10}
                y={g.y + 4}
                fill="#a1a1aa"
                fontSize={9}
                textAnchor="end"
                className="font-medium"
              >
                ₹{Math.round(g.price).toLocaleString("en-IN")}
              </text>
            </g>
          ))}

          {/* X Axis labels */}
          {points.length > 1 && (
            <>
              {/* Start Date */}
              <text
                x={points[0].x}
                y={height - 6}
                fill="#71717a"
                fontSize={8}
                textAnchor="start"
                className="font-medium"
              >
                {new Date(points[0].date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
              </text>
              {/* End Date */}
              <text
                x={points[points.length - 1].x}
                y={height - 6}
                fill="#71717a"
                fontSize={8}
                textAnchor="end"
                className="font-medium"
              >
                {new Date(points[points.length - 1].date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
              </text>
            </>
          )}

          {/* Area under the line */}
          {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}

          {/* Line Path */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#chartStroke)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}

          {/* Data Points Dots */}
          {points.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={3}
              fill="#c084fc"
              stroke="#ffffff"
              strokeWidth={1}
              className="transition duration-200 hover:r-5 cursor-pointer"
            >
              <title>
                {new Date(pt.date).toLocaleDateString("en-IN")} : ₹{pt.price.toLocaleString("en-IN")}
              </title>
            </circle>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Price Drop Alert banner */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-wide border-b border-zinc-850 pb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Price History & Trends
        </h2>
      </div>

      {priceDrop !== null && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200 flex items-center gap-3">
          <span className="text-xl">📉</span>
          <div>
            <span className="font-bold block">Great deal active!</span>
            <span className="opacity-90">Price dropped <span className="font-extrabold text-white">₹{priceDrop.toLocaleString("en-IN")}</span> in the last 7 days.</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-40 flex items-center justify-center animate-pulse border border-zinc-900 bg-zinc-950/40 rounded-2xl">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
        </div>
      ) : (
        renderChart()
      )}

      {/* Subscription Form */}
      <form onSubmit={handleSubscribeAlert} className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Set Price Drop Alert
          </h3>
          <p className="text-xs text-zinc-400 mt-1">Get an instant notification email when the price drops below your target threshold.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Target Price (₹)</label>
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="e.g. 50000"
              max={currentPrice - 1}
              required
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Your Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="e.g. you@example.com"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submittingAlert}
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-xs font-bold text-white transition hover:from-violet-500 hover:to-fuchsia-500 active:scale-[0.98] disabled:opacity-50"
        >
          {submittingAlert ? "Setting alert..." : "Activate Price Alert"}
        </button>

        {alertStatus && (
          <div className={`text-xs p-3 rounded-xl border ${
            alertStatus.type === "success" 
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/20 bg-rose-500/10 text-rose-300"
          }`}>
            {alertStatus.message}
          </div>
        )}
      </form>
    </div>
  );
}
