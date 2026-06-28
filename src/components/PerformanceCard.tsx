"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  Gamepad2, 
  BatteryCharging, 
  Monitor, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  Award,
  Sparkles,
  Info
} from "lucide-react";
import type { Phone } from "@/src/types/phone";
import { calculateWeightedScores } from "@/src/lib/recommendations";

interface PerformanceCardProps {
  phone: Phone;
}

export function PerformanceCard({ phone }: PerformanceCardProps) {
  const scores = calculateWeightedScores(phone);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(prev => (prev === section ? null : section));
  };

  const ratings = [
    {
      id: "camera",
      label: "Camera Capabilities",
      score: scores.camera.total,
      icon: Camera,
      color: "from-violet-500 to-fuchsia-500",
      text: "text-violet-300",
      bg: "bg-violet-500/5",
      border: "border-violet-500/10",
      breakdown: [
        { name: "Primary Sensor & Aperture", value: scores.camera.sensor },
        { name: "OIS Optical Stabilization", value: scores.camera.ois },
        { name: "Ultrawide Field-of-View", value: scores.camera.ultrawide },
        { name: "Telephoto Optical Zoom", value: scores.camera.telephoto },
        { name: "Video Recording Resolution", value: scores.camera.video },
        { name: "Night Mode Processing", value: scores.camera.nightMode },
      ]
    },
    {
      id: "gaming",
      label: "Gaming & Chipset Speed",
      score: scores.gaming.total,
      icon: Gamepad2,
      color: "from-emerald-500 to-cyan-500",
      text: "text-emerald-300",
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/10",
      breakdown: [
        { name: "CPU Single/Multi-Core", value: scores.gaming.cpu },
        { name: "GPU Graphics Processing", value: scores.gaming.gpu },
        { name: "FPS Stability & Refresh", value: scores.gaming.fps },
        { name: "Thermal Dissipation / Cooling", value: scores.gaming.cooling },
        { name: "RAM Speed & Capacity", value: scores.gaming.ram },
        { name: "Storage Read/Write Rates", value: scores.gaming.storage },
      ]
    },
    {
      id: "battery",
      label: "Battery & Charging",
      score: scores.battery.total,
      icon: BatteryCharging,
      color: "from-amber-500 to-orange-500",
      text: "text-amber-300",
      bg: "bg-amber-500/5",
      border: "border-amber-500/10",
      breakdown: [
        { name: "Cell Capacity (mAh)", value: scores.battery.capacity },
        { name: "Fast Charging Input (Watts)", value: scores.battery.charging },
        { name: "Silicon Efficiency Metric", value: scores.battery.efficiency },
      ]
    },
    {
      id: "display",
      label: "Display Excellence",
      score: scores.display.total,
      icon: Monitor,
      color: "from-blue-500 to-indigo-500",
      text: "text-blue-300",
      bg: "bg-blue-500/5",
      border: "border-blue-500/10",
      breakdown: [
        { name: "Panel Technology (OLED/LCD)", value: scores.display.panel },
        { name: "Peak Brightness (Nits)", value: scores.display.brightness },
        { name: "Refresh Rate Response (Hz)", value: scores.display.refreshRate },
        { name: "HDR & Color Profile support", value: scores.display.hdr },
        { name: "Pixel Resolution & Density", value: scores.display.resolution },
      ]
    },
    {
      id: "software",
      label: "Software & Support Longevity",
      score: scores.software.total,
      icon: Cpu,
      color: "from-pink-500 to-rose-500",
      text: "text-pink-300",
      bg: "bg-pink-500/5",
      border: "border-pink-500/10",
      breakdown: [
        { name: "OS Version Features", value: scores.software.osVersion },
        { name: "Planned Android/iOS Update Years", value: scores.software.updateYears },
        { name: "Security Patch Frequency", value: scores.software.securityPatches },
      ]
    }
  ];

  // Helper to resolve display panel score if not undefined
  const displayScore = ratings.find(r => r.id === "display")?.breakdown[0];
  if (displayScore && scores.display) {
    displayScore.value = (phone.display || "").toLowerCase().includes("oled") || (phone.display || "").toLowerCase().includes("amoled") ? 10 : 6;
  }

  const performanceScore = scores.overall.toFixed(1);

  return (
    <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-6 sm:p-8 backdrop-blur-sm shadow-2xl relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-violet-650/5 blur-3xl pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-5 mb-6 gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-violet-400" />
            AI Specification Scores
          </h2>
          <p className="text-xs text-zinc-500 font-medium">Deep spec-based algorithmic ratings mapped from raw hardware data.</p>
        </div>
        
        {/* Large Score badge */}
        <div className="flex items-center gap-4 bg-zinc-950/60 rounded-2xl border border-zinc-900 p-4 shrink-0 shadow-lg">
          <div className="text-center">
            <span className="text-3xl font-black text-white leading-none block">{performanceScore}</span>
            <span className="text-[9px] text-zinc-500 block font-black uppercase tracking-widest mt-1">Smart score</span>
          </div>
          <div className="h-8 w-px bg-zinc-900" />
          <div className="text-xs font-bold text-zinc-400 max-w-[130px] leading-snug">
            Outperforms <span className="text-violet-400 font-black">{Math.round(scores.overall * 10)}%</span> of indexed models
          </div>
        </div>
      </div>

      {/* Ratings progress rows */}
      <div className="space-y-4">
        {ratings.map((rate, index) => {
          const Icon = rate.icon;
          const isExpanded = expandedSection === rate.id;

          return (
            <div 
              key={rate.id} 
              className={`rounded-2xl border ${rate.border} ${rate.bg} p-4 transition-all duration-300 relative overflow-hidden`}
            >
              <div 
                onClick={() => toggleSection(rate.id)}
                className="flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-400 group-hover:text-white transition`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-zinc-200 block leading-none mb-1 group-hover:text-white transition">
                      {rate.label}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block leading-none">
                      Tap to reveal breakdown
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  <span className={`text-sm font-black ${rate.text}`}>{rate.score.toFixed(1)} / 10</span>
                  <div className="text-zinc-500 group-hover:text-white transition">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              {/* Progress bar container */}
              <div className="relative h-1.5 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-900 mt-3.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rate.score * 10}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 }}
                  className={`h-full rounded-full bg-gradient-to-r ${rate.color}`}
                />
              </div>

              {/* Sub-Score Breakdown items */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-3 pt-5 mt-4 border-t border-zinc-900/50 text-xs sm:grid-cols-2">
                      {rate.breakdown.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-900/60">
                          <span className="text-zinc-400 font-semibold">{item.name}</span>
                          <span className="font-extrabold text-zinc-250 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900">
                            {item.value ? `${item.value.toFixed(1)}/10` : "N/A"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
