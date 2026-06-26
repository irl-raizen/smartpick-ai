"use client";

import { motion } from "framer-motion";
import { Check, X, Quote, Sparkles } from "lucide-react";

interface AiReviewCardProps {
  pros: string[];
  cons: string[];
  verdict: string;
}

export function AiReviewCard({ pros, cons, verdict }: AiReviewCardProps) {
  return (
    <div className="rounded-3xl border border-zinc-900 bg-zinc-900/30 p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
      {/* Decorative top badge */}
      <div className="absolute top-0 right-0 bg-violet-500/10 border-b border-l border-violet-500/20 text-violet-300 text-[10px] uppercase font-extrabold tracking-widest px-4 py-2 rounded-bl-2xl shadow-md flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 animate-pulse text-violet-400" />
        SmartPick AI Expert Review
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-white tracking-wide">AI Assistant Insights</h2>
        <p className="text-xs text-zinc-500 mt-1">Deep analysis of customer feedback, expert reviews, and specifications.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-4">
        {/* Pros Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] p-5 space-y-4"
        >
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/10">
              <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={3} />
            </span>
            Key Advantages
          </h3>
          <ul className="space-y-3 text-sm text-zinc-300">
            {pros.map((pro, index) => (
              <li key={index} className="leading-relaxed flex items-start gap-2.5">
                <span className="text-emerald-500/60 mt-1 shrink-0">•</span>
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Cons Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-rose-500/10 bg-rose-500/[0.02] p-5 space-y-4"
        >
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-rose-500/10">
              <X className="h-3.5 w-3.5 text-rose-400" strokeWidth={3} />
            </span>
            Disadvantages
          </h3>
          <ul className="space-y-3 text-sm text-zinc-300">
            {cons.map((con, index) => (
              <li key={index} className="leading-relaxed flex items-start gap-2.5">
                <span className="text-rose-500/60 mt-1 shrink-0">•</span>
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Verdict quote card */}
      {verdict && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 pt-6 border-t border-zinc-850/60 space-y-3"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400">
            AI Summary Verdict
          </h3>
          
          <div className="relative rounded-2xl bg-zinc-950/50 border border-zinc-900 p-6 shadow-inner">
            <Quote className="absolute -top-3 left-4 h-6 w-6 text-violet-500/20 fill-current rotate-180" />
            <p className="text-sm leading-relaxed text-zinc-200 italic pl-4 border-l-2 border-violet-500/50">
              {verdict}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
