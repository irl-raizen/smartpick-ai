"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Gamepad2, BatteryCharging, Laptop } from "lucide-react";

interface PerformanceCardProps {
  scoreCamera: number;
  scoreGaming: number;
  scoreBattery: number;
  displaySpecs: string | undefined;
}

export function PerformanceCard({
  scoreCamera,
  scoreGaming,
  scoreBattery,
  displaySpecs = "",
}: PerformanceCardProps) {
  // Compute Display score based on specs keywords
  let displayScore = 7;
  const lowerDisplay = displaySpecs.toLowerCase();
  if (lowerDisplay.includes("144hz") || lowerDisplay.includes("ltpo") || lowerDisplay.includes("dynamic amoled 2x")) {
    displayScore = 10;
  } else if (lowerDisplay.includes("120hz") || lowerDisplay.includes("amoled") || lowerDisplay.includes("oled")) {
    displayScore = 9;
  } else if (lowerDisplay.includes("90hz") || lowerDisplay.includes("ips lcd")) {
    displayScore = 8;
  }

  const performanceScore = ((scoreCamera + scoreGaming + scoreBattery + displayScore) / 4).toFixed(1);

  const ratings = [
    { label: "Camera Capabilities", score: scoreCamera, icon: Camera, color: "from-violet-500 to-fuchsia-500", text: "text-violet-300" },
    { label: "Gaming & Raw Performance", score: scoreGaming, icon: Gamepad2, color: "from-emerald-500 to-cyan-500", text: "text-emerald-300" },
    { label: "Battery Endurance", score: scoreBattery, icon: BatteryCharging, color: "from-amber-500 to-orange-500", text: "text-amber-300" },
    { label: "Display Excellence", score: displayScore, icon: Laptop, color: "from-blue-500 to-indigo-500", text: "text-blue-300" },
  ];

  return (
    <div className="rounded-3xl border border-zinc-900 bg-zinc-900/30 p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
      {/* Background soft glow */}
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-violet-600/5 blur-3xl pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-850 pb-5 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Performance Benchmark</h2>
          <p className="text-xs text-zinc-500 mt-1">Based on technical specifications audits and AI benchmark models.</p>
        </div>
        
        {/* Large Score circle */}
        <div className="flex items-center gap-3 bg-zinc-950/60 rounded-2xl border border-zinc-900/80 p-4 shrink-0">
          <div className="text-center">
            <span className="text-3xl font-black text-white">{performanceScore}</span>
            <span className="text-[10px] text-zinc-550 block font-bold uppercase tracking-wider">Overall</span>
          </div>
          <div className="h-8 w-px bg-zinc-850" />
          <div className="text-xs font-semibold text-zinc-400 max-w-[120px]">
            Outperforming {Math.round(parseFloat(performanceScore) * 10)}% of devices
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {ratings.map((rate, index) => {
          const Icon = rate.icon;
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-300 font-bold flex items-center gap-2">
                  <Icon className="h-4 w-4 text-zinc-550" />
                  {rate.label}
                </span>
                <span className={`font-black ${rate.text}`}>{rate.score} / 10</span>
              </div>
              <div className="relative h-3 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-900">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rate.score * 10}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                  className={`h-full rounded-full bg-gradient-to-r ${rate.color}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
