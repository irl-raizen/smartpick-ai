"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Sparkles, Cpu, Camera, Battery, Settings, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getRecommendations } from "@/src/lib/recommendations";
import { generatePhoneSlug } from "@/src/lib/supabase";
import { RecommendationCard } from "@/src/components/RecommendationCard";
import type { Phone } from "@/src/types/phone";
import type { RecommendedPhone } from "@/src/types/recommendation";

interface HomeRecommendationFormProps {
  phones: Phone[];
}

type FormState = {
  budget: string;
  cameraImportance: number;
  gamingImportance: number;
  batteryImportance: number;
};

const initialFormState: FormState = {
  budget: "25000",
  cameraImportance: 5,
  gamingImportance: 5,
  batteryImportance: 5,
};

export function HomeRecommendationForm({ phones }: HomeRecommendationFormProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedPhone[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const budgetNum = Number(form.budget) || 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (budgetNum < 5000) return;

    try {
      setLoading(true);
      setError(null);
      setSubmitted(false);

      // Run recommendation engine client side
      const results = getRecommendations(phones, {
        budget: budgetNum,
        cameraImportance: form.cameraImportance,
        gamingImportance: form.gamingImportance,
        batteryImportance: form.batteryImportance,
      });

      // Artificial slight delay for micro-animation satisfaction
      await new Promise((r) => setTimeout(r, 650));

      setRecommendations(results);
      setSubmitted(true);

      // Log to analytics
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "recommendation",
          eventData: {
            budget: budgetNum,
            priorities: {
              camera: form.cameraImportance,
              gaming: form.gamingImportance,
              battery: form.batteryImportance,
            },
            resultsCount: results.length,
          },
        }),
      }).catch((err) => console.warn("Failed to log recommendation event:", err));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recommendations.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl grid gap-8 lg:grid-cols-12 items-start">
      {/* Form Card (col-span-5) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="lg:col-span-5 rounded-3xl border border-zinc-900 bg-zinc-900/30 p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-violet-600/10 blur-2xl" />

        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 px-3 py-1 text-xs font-bold text-violet-300 uppercase tracking-wider mb-2">
            <Sparkles className="h-3 w-3 animate-pulse" />
            AI Matcher
          </span>
          <h3 className="text-xl font-black text-white tracking-tight">Set Your Preferences</h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Specify your maximum budget and prioritize features to find your best matches.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Budget Input */}
          <div className="space-y-2">
            <label htmlFor="budget-input" className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-zinc-500" />
              Maximum Budget (₹)
            </label>
            <div className="relative group">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-bold text-zinc-500">₹</span>
              <input
                id="budget-input"
                type="number"
                min={0}
                required
                placeholder="25000"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 py-3 pl-8 pr-4 text-white outline-none transition placeholder:text-zinc-650 font-bold focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
            {form.budget !== "" && budgetNum < 5000 && (
              <p className="text-[10px] font-semibold text-rose-400">Please enter a budget of at least ₹5,000.</p>
            )}
          </div>

          {/* Sliders */}
          <div className="space-y-4 pt-1">
            {/* Camera */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-violet-400" />
                  Camera Quality
                </span>
                <span className="font-extrabold text-violet-300 bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 rounded-md">
                  {form.cameraImportance} / 10
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={form.cameraImportance}
                onChange={(e) => setForm({ ...form, cameraImportance: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-850 accent-violet-500"
              />
            </div>

            {/* Gaming */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                  Gaming & Speed
                </span>
                <span className="font-extrabold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                  {form.gamingImportance} / 10
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={form.gamingImportance}
                onChange={(e) => setForm({ ...form, gamingImportance: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-855 accent-emerald-500"
              />
            </div>

            {/* Battery */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Battery className="h-3.5 w-3.5 text-amber-400" />
                  Battery Endurance
                </span>
                <span className="font-extrabold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md">
                  {form.batteryImportance} / 10
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={form.batteryImportance}
                onChange={(e) => setForm({ ...form, batteryImportance: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-855 accent-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || budgetNum < 5000}
            className="w-full relative overflow-hidden group rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-650 to-fuchsia-600 px-6 py-3.5 text-sm font-black text-white hover:shadow-lg hover:shadow-violet-900/30 transition duration-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="relative z-10">{loading ? "Finding Matches..." : "Get AI Recommendations"}</span>
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
            {error}
          </div>
        )}
      </motion.div>

      {/* Results Section (col-span-7) */}
      <div className="lg:col-span-7 space-y-6">
        <AnimatePresence mode="wait">
          {!submitted && !loading ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-12 text-center backdrop-blur-sm h-full flex flex-col justify-center items-center py-20"
            >
              <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-550">
                <Settings className="h-6 w-6 animate-spin" style={{ animationDuration: "12s" }} />
              </div>
              <h4 className="text-lg font-bold text-white">Recommendations Will Appear Here</h4>
              <p className="text-xs text-zinc-500 max-w-sm mt-2 leading-relaxed">
                Set your budget and priorities on the left and submit to see side-by-side matches ranked by score.
              </p>
            </motion.div>
          ) : loading ? (
            <motion.div
              key="loading-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-zinc-900 bg-zinc-900/15 p-12 text-center backdrop-blur-sm h-full flex flex-col justify-center items-center py-20"
            >
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500 mb-4" />
              <h4 className="text-lg font-bold text-white">Analyzing Smartphone Catalog...</h4>
              <p className="text-xs text-zinc-500 max-w-sm mt-2 leading-relaxed">
                Comparing specifications, rating scores, price values, and running recommendation algorithm.
              </p>
            </motion.div>
          ) : submitted && recommendations.length === 0 ? (
            <motion.div
              key="no-matches"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-zinc-900 bg-zinc-900/15 p-12 text-center backdrop-blur-sm h-full flex flex-col justify-center items-center py-20"
            >
              <h4 className="text-lg font-bold text-amber-300">No matches found</h4>
              <p className="text-xs text-zinc-500 max-w-sm mt-2 leading-relaxed">
                We couldn't find any phones under ₹{budgetNum.toLocaleString("en-IN")}. Try widening your budget or adjusting feature sliders.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="results-state"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3 px-1">
                <div>
                  <h4 className="text-lg font-bold text-white tracking-tight">Your Top Matches</h4>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5">
                    Ranked by matching ratio
                  </p>
                </div>
                <span className="text-xs font-semibold text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-850">
                  {recommendations.length} Match{recommendations.length > 1 ? "es" : ""} Found
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {recommendations.slice(0, 4).map((phone, index) => (
                  <motion.div
                    key={phone.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <Link
                      href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                      className="block group"
                    >
                      <RecommendationCard phone={phone} rank={index + 1} />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
