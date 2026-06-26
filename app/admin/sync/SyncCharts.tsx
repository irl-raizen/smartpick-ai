"use client";

import { useState } from "react";

interface SyncLogs {
  started_at: string;
  phones_updated: number;
  phones_inserted: number;
  status: string;
}

interface PriceHistory {
  changed_at: string;
}

interface SyncChartsProps {
  syncLogs: SyncLogs[];
  priceHistory: PriceHistory[];
  totalPhones: number;
  imagesAvailable: number;
}

export function SyncCharts({ syncLogs, priceHistory, totalPhones, imagesAvailable }: SyncChartsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<{ chart: string; index: number } | null>(null);

  // Generate last 7 days date strings
  const getPast7Days = () => {
    const dates = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const label = weekdays[d.getDay()];
      dates.push({ dateStr, label });
    }
    return dates;
  };

  const days = getPast7Days();

  // Chart 1: Daily Phones Updated / Inserted
  const dailyPhonesData = days.map(({ dateStr, label }) => {
    const dayLogs = syncLogs.filter((log) => log.started_at.startsWith(dateStr));
    const updated = dayLogs.reduce((sum, log) => sum + (log.phones_updated || 0), 0);
    const inserted = dayLogs.reduce((sum, log) => sum + (log.phones_inserted || 0), 0);
    return { label, updated, inserted, total: updated + inserted };
  });

  // Chart 2: Daily Price Changes
  const dailyPriceChanges = days.map(({ dateStr, label }) => {
    const count = priceHistory.filter((h) => h.changed_at.startsWith(dateStr)).length;
    return { label, count };
  });

  // Chart 3: Success vs Failure Trends
  const dailyTrends = days.map(({ dateStr, label }) => {
    const dayLogs = syncLogs.filter((log) => log.started_at.startsWith(dateStr));
    const success = dayLogs.filter((log) => log.status === "success").length;
    const failed = dayLogs.filter((log) => log.status === "failed").length;
    return { label, success, failed };
  });

  // Chart 4: Image Coverage
  const coveragePercent = totalPhones > 0 ? Math.round((imagesAvailable / totalPhones) * 100) : 0;

  // Chart Dimensions
  const width = 450;
  const height = 200;
  const padding = 30;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Render Line Chart for Price Changes
  const renderPriceChangesChart = () => {
    const maxVal = Math.max(...dailyPriceChanges.map((d) => d.count), 5);
    const points = dailyPriceChanges.map((d, i) => {
      const x = padding + (i * chartWidth) / 6;
      const y = padding + chartHeight - (d.count * chartHeight) / maxVal;
      return { x, y, val: d.count, label: d.label };
    });

    const linePath = points.reduce(
      (path, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`),
      ""
    );

    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : "";

    return (
      <div className="relative rounded-2xl border border-zinc-900 bg-zinc-900/30 p-6 backdrop-blur-sm shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Daily Price Sync Changes</h3>
          <p className="text-2xl font-black text-white mt-1">
            {priceHistory.length} <span className="text-xs font-semibold text-zinc-500">changes logged (7d)</span>
          </p>
        </div>

        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1={padding}
                y1={padding + chartHeight * ratio}
                x2={width - padding}
                y2={padding + chartHeight * ratio}
                stroke="#18181b"
                strokeWidth={1}
                strokeDasharray="4"
              />
            ))}

            {/* Gradient Area Fill */}
            {areaPath && (
              <path d={areaPath} fill="url(#priceGrad)" opacity={0.15} />
            )}

            {/* Line Path */}
            {linePath && (
              <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth={2.5} strokeLinecap="round" />
            )}

            {/* Data Nodes */}
            {points.map((pt, i) => (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredIndex?.chart === "price" && hoveredIndex.index === i ? 6 : 4}
                  fill="#c084fc"
                  stroke="#1e1b4b"
                  strokeWidth={1.5}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredIndex({ chart: "price", index: i })}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                
                {/* Tooltip on Node Hover */}
                {hoveredIndex?.chart === "price" && hoveredIndex.index === i && (
                  <g>
                    <rect
                      x={pt.x - 30}
                      y={pt.y - 30}
                      width={60}
                      height={20}
                      rx={6}
                      fill="#8b5cf6"
                      className="drop-shadow-lg"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 16}
                      fill="#ffffff"
                      fontSize={9}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {pt.val} drops
                    </text>
                  </g>
                )}

                {/* X axis labels */}
                <text
                  x={pt.x}
                  y={height - padding + 15}
                  fill="#71717a"
                  fontSize={10}
                  textAnchor="middle"
                >
                  {pt.label}
                </text>
              </g>
            ))}

            {/* Gradients */}
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    );
  };

  // Render Bar Chart for Phones Updated
  const renderPhonesUpdatedChart = () => {
    const maxVal = Math.max(...dailyPhonesData.map((d) => d.total), 5);
    const barWidth = 32;
    const gap = (chartWidth - barWidth * 7) / 6;

    return (
      <div className="relative rounded-2xl border border-zinc-900 bg-zinc-900/30 p-6 backdrop-blur-sm shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Daily Phones Added/Updated</h3>
          <p className="text-2xl font-black text-white mt-1">
            {dailyPhonesData.reduce((sum, d) => sum + d.total, 0)}{" "}
            <span className="text-xs font-semibold text-zinc-500">processed changes (7d)</span>
          </p>
        </div>

        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1={padding}
                y1={padding + chartHeight * ratio}
                x2={width - padding}
                y2={padding + chartHeight * ratio}
                stroke="#18181b"
                strokeWidth={1}
                strokeDasharray="4"
              />
            ))}

            {dailyPhonesData.map((d, i) => {
              const x = padding + i * (barWidth + gap);
              const totalHeight = (d.total * chartHeight) / maxVal;
              const y = padding + chartHeight - totalHeight;
              
              const updatedHeight = (d.updated * chartHeight) / maxVal;
              const insertedHeight = (d.inserted * chartHeight) / maxVal;

              const isHovered = hoveredIndex?.chart === "phones" && hoveredIndex.index === i;

              return (
                <g key={i} className="cursor-pointer"
                   onMouseEnter={() => setHoveredIndex({ chart: "phones", index: i })}
                   onMouseLeave={() => setHoveredIndex(null)}>
                  {/* Updated Part (Greenish Violet) */}
                  {d.updated > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={updatedHeight}
                      fill={isHovered ? "#a78bfa" : "#8b5cf6"}
                      rx={d.inserted === 0 ? 4 : 0}
                    />
                  )}
                  {/* Inserted Part (Emerald Green) */}
                  {d.inserted > 0 && (
                    <rect
                      x={x}
                      y={y + updatedHeight}
                      width={barWidth}
                      height={insertedHeight}
                      fill={isHovered ? "#34d399" : "#10b981"}
                      rx={4}
                    />
                  )}
                  {/* Spacer if empty */}
                  {d.total === 0 && (
                    <rect
                      x={x}
                      y={padding + chartHeight - 4}
                      width={barWidth}
                      height={4}
                      fill="#27272a"
                      rx={1}
                    />
                  )}

                  {/* Tooltip */}
                  {isHovered && d.total > 0 && (
                    <g>
                      <rect
                        x={x - 24}
                        y={y - 45}
                        width={80}
                        height={38}
                        rx={6}
                        fill="#18181b"
                        stroke="#27272a"
                        strokeWidth={1.5}
                      />
                      <text x={x + 16} y={y - 32} fill="#c084fc" fontSize={8} fontWeight="bold" textAnchor="middle">
                        +{d.updated} Updates
                      </text>
                      <text x={x + 16} y={y - 20} fill="#34d399" fontSize={8} fontWeight="bold" textAnchor="middle">
                        +{d.inserted} New
                      </text>
                    </g>
                  )}

                  {/* Labels */}
                  <text
                    x={x + barWidth / 2}
                    y={height - padding + 15}
                    fill="#71717a"
                    fontSize={10}
                    textAnchor="middle"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  // Render Stacked Bar Chart for Success vs Failure
  const renderTrendsChart = () => {
    const maxVal = Math.max(...dailyTrends.map((d) => d.success + d.failed), 5);
    const barWidth = 28;
    const gap = (chartWidth - barWidth * 7) / 6;

    return (
      <div className="relative rounded-2xl border border-zinc-900 bg-zinc-900/30 p-6 backdrop-blur-sm shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Sync Run Success vs Failures</h3>
          <p className="text-2xl font-black text-white mt-1">
            {syncLogs.filter(log => log.status === "success").length} / {syncLogs.length}{" "}
            <span className="text-xs font-semibold text-zinc-500">runs successful (30d)</span>
          </p>
        </div>

        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1={padding}
                y1={padding + chartHeight * ratio}
                x2={width - padding}
                y2={padding + chartHeight * ratio}
                stroke="#18181b"
                strokeWidth={1}
                strokeDasharray="4"
              />
            ))}

            {dailyTrends.map((d, i) => {
              const x = padding + i * (barWidth + gap);
              const successHeight = (d.success * chartHeight) / maxVal;
              const failedHeight = (d.failed * chartHeight) / maxVal;
              const totalHeight = successHeight + failedHeight;
              const y = padding + chartHeight - totalHeight;

              const isHovered = hoveredIndex?.chart === "trends" && hoveredIndex.index === i;

              return (
                <g key={i} className="cursor-pointer"
                   onMouseEnter={() => setHoveredIndex({ chart: "trends", index: i })}
                   onMouseLeave={() => setHoveredIndex(null)}>
                  {/* Success portion */}
                  {d.success > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={successHeight}
                      fill={isHovered ? "#34d399" : "#10b981"}
                      rx={d.failed === 0 ? 3 : 0}
                    />
                  )}
                  {/* Failed portion */}
                  {d.failed > 0 && (
                    <rect
                      x={x}
                      y={y + successHeight}
                      width={barWidth}
                      height={failedHeight}
                      fill={isHovered ? "#f87171" : "#ef4444"}
                      rx={3}
                    />
                  )}
                  {/* Empty day indicator */}
                  {d.success === 0 && d.failed === 0 && (
                    <rect
                      x={x}
                      y={padding + chartHeight - 4}
                      width={barWidth}
                      height={4}
                      fill="#27272a"
                      rx={1}
                    />
                  )}

                  {/* Tooltip */}
                  {isHovered && (d.success > 0 || d.failed > 0) && (
                    <g>
                      <rect
                        x={x - 24}
                        y={y - 45}
                        width={76}
                        height={38}
                        rx={6}
                        fill="#18181b"
                        stroke="#27272a"
                        strokeWidth={1.5}
                      />
                      <text x={x + 14} y={y - 32} fill="#34d399" fontSize={8} fontWeight="bold" textAnchor="middle">
                        {d.success} Success
                      </text>
                      <text x={x + 14} y={y - 20} fill="#f87171" fontSize={8} fontWeight="bold" textAnchor="middle">
                        {d.failed} Failed
                      </text>
                    </g>
                  )}

                  {/* Labels */}
                  <text
                    x={x + barWidth / 2}
                    y={height - padding + 15}
                    fill="#71717a"
                    fontSize={10}
                    textAnchor="middle"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  // Render Gauge Chart for Image Coverage
  const renderImageCoverageGauge = () => {
    const size = 150;
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (coveragePercent / 100) * circumference;

    return (
      <div className="relative rounded-2xl border border-zinc-900 bg-zinc-900/30 p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between items-center text-center space-y-4">
        <div className="w-full text-left">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Visual Coverage</h3>
          <span className="text-xs text-zinc-550 mt-1 block">Catalog Images Percentage</span>
        </div>

        <div className="relative flex items-center justify-center h-32 w-32">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#18181b"
              strokeWidth={strokeWidth}
            />
            {/* Foreground Progress ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#covGrad)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
            {/* Definitions for progress gradient */}
            <defs>
              <linearGradient id="covGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central Label */}
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-black text-white">{coveragePercent}%</span>
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Synced</span>
          </div>
        </div>

        <div className="w-full text-zinc-400 text-xs mt-2 border-t border-zinc-900 pt-3 flex justify-around">
          <div>
            <span className="text-white font-bold block">{imagesAvailable}</span>
            <span className="text-zinc-550 text-[10px] uppercase">Images</span>
          </div>
          <div className="border-l border-zinc-900 h-6" />
          <div>
            <span className="text-white font-bold block">{totalPhones}</span>
            <span className="text-zinc-550 text-[10px] uppercase">Total</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {renderPriceChangesChart()}
      {renderPhonesUpdatedChart()}
      {renderTrendsChart()}
      {renderImageCoverageGauge()}
    </div>
  );
}
