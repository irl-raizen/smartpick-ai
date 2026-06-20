"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { RecommendationCard } from "@/src/components/RecommendationCard";
import { getRecommendations } from "@/src/lib/recommendations";
import { getPhones, generatePhoneSlug } from "@/src/lib/supabase";
import type { Phone } from "@/src/types/phone";
import type { RecommendedPhone } from "@/src/types/recommendation";

const featureCards = [
  {
    title: "Camera Lovers",
    description:
      "Prioritize sharp photos, low-light performance, and versatile lenses.",
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
        />
      </svg>
    ),
    accent: "from-violet-500/20 to-fuchsia-500/10",
    ring: "ring-violet-500/30",
  },
  {
    title: "Gaming",
    description:
      "High refresh displays, powerful chipsets, and sustained performance.",
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.332.332 0 0 1-.5.287 12.8 12.8 0 0 0-4.5-2.14c-.378-.055-.757-.108-1.136-.16a47.765 47.765 0 0 0-5.232 0 11.869 11.869 0 0 0-1.136.16 12.8 12.8 0 0 0-4.5 2.14.332.332 0 0 1-.5-.287v0c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875S2.25 3.964 2.25 5c0 .369.128.713.349 1.003.215.283.401.604.401.959v0c0 .379-.197.721-.5.959a8.25 8.25 0 1 0 11.25 0c-.303-.238-.5-.58-.5-.959v0Z"
        />
      </svg>
    ),
    accent: "from-emerald-500/20 to-cyan-500/10",
    ring: "ring-emerald-500/30",
  },
  {
    title: "Battery Life",
    description:
      "All-day power, fast charging, and efficient hardware for heavy use.",
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M4.5 10.5H18V6.375c0-.621-.504-1.125-1.125-1.125H4.125C3.504 5.25 3 5.754 3 6.375V17.625c0 .621.504 1.125 1.125 1.125H17.25c.621 0 1.125-.504 1.125-1.125V16.5H4.5v-6Z"
        />
      </svg>
    ),
    accent: "from-amber-500/20 to-orange-500/10",
    ring: "ring-amber-500/30",
  },
  {
    title: "Best Value",
    description:
      "Smart picks that balance price, features, and long-term reliability.",
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
        />
      </svg>
    ),
    accent: "from-sky-500/20 to-indigo-500/10",
    ring: "ring-sky-500/30",
  },
];

type FormState = {
  budget: string;
  cameraImportance: number;
  gamingImportance: number;
  batteryImportance: number;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

const initialFormState: FormState = {
  budget: "25000",
  cameraImportance: 5,
  gamingImportance: 5,
  batteryImportance: 5,
};

function ImportanceSlider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-zinc-200">
          {label}
        </label>
        <span className="rounded-full bg-violet-500/15 px-3 py-1 text-sm font-semibold text-violet-300">
          {value}/10
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-violet-500"
      />
    </div>
  );
}

export default function Home() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedPhone[]>(
    [],
  );
  const [submitted, setSubmitted] = useState(false);
  const [noMatches, setNoMatches] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const budget = Number(form.budget);
    console.log("Budget entered:", budget);

    if (!Number.isFinite(budget) || budget < 5000) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSubmitted(false);

      // 1. Fetch phones from Supabase
      const fetchedPhones = await getPhones();
      console.log("Phones fetched from Supabase:", fetchedPhones);

      // 2. Filter phones by budget
      const filtered = fetchedPhones.filter((phone) => phone.price <= budget);
      console.log("Filtered phones:", filtered);

      // 3 & 4. Calculate score and sort descending (handled inside getRecommendations)
      const results = getRecommendations(fetchedPhones, {
        budget,
        cameraImportance: form.cameraImportance,
        gamingImportance: form.gamingImportance,
        batteryImportance: form.batteryImportance,
      });
      console.log("Final recommendations:", results);

      setRecommendations(results);
      setNoMatches(results.length === 0);
      setSubmitted(true);

      // 5. Send lead query event to n8n webhook if configured
      const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
      if (n8nWebhookUrl && n8nWebhookUrl.trim() !== "") {
        console.log("Sending query details to n8n automation webhook...");
        fetch(n8nWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event: "phone_recommendation_requested",
            timestamp: new Date().toISOString(),
            budget,
            priorities: {
              camera: form.cameraImportance,
              gaming: form.gamingImportance,
              battery: form.batteryImportance,
            },
            recommendations: results.map((r) => ({
              id: r.id,
              brand: r.brand,
              model: r.model,
              price: r.price,
              score: r.recommendationScore,
            })),
          }),
        }).catch((err) => {
          console.error("Failed to send webhook to n8n automation:", err);
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load recommendations.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-200">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            AI Phone Recommendation
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Find Your Perfect Smartphone
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400 sm:text-xl">
            AI-powered phone recommendations based on your budget and needs.
          </p>
        </section>

        <section className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((card) => (
            <article
              key={card.title}
              className={`group rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-violet-950/20`}
            >
              <div
                className={`mb-5 inline-flex rounded-xl bg-gradient-to-br ${card.accent} p-3 text-violet-300 ring-1 ${card.ring}`}
              >
                {card.icon}
              </div>
              <h2 className="text-lg font-semibold text-white">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {card.description}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-20">
          <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-8">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                Get Your Recommendation
              </h2>
              <p className="mt-3 text-sm text-zinc-400 sm:text-base">
                Tell us what matters most and we&apos;ll match you with the
                right phone.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="budget"
                  className="text-sm font-medium text-zinc-200"
                >
                  Budget (₹)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-500">
                    ₹
                  </span>
                  <input
                    id="budget"
                    type="number"
                    min={0}
                    step={1}
                    required
                    placeholder="25000"
                    value={form.budget}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        budget: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-3 pl-8 pr-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
                {form.budget !== "" && Number(form.budget) < 5000 && (
                  <p className="text-xs text-rose-400 mt-1">
                    Please enter a realistic smartphone budget.
                  </p>
                )}
              </div>

              <ImportanceSlider
                id="cameraImportance"
                label="Camera Importance"
                value={form.cameraImportance}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    cameraImportance: value,
                  }))
                }
              />

              <ImportanceSlider
                id="gamingImportance"
                label="Gaming Importance"
                value={form.gamingImportance}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    gamingImportance: value,
                  }))
                }
              />

              <ImportanceSlider
                id="batteryImportance"
                label="Battery Importance"
                value={form.batteryImportance}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    batteryImportance: value,
                  }))
                }
              />

              <button
                type="submit"
                disabled={loading || (form.budget !== "" && Number(form.budget) < 5000)}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:from-violet-500 hover:to-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
              >
                {loading ? "Getting Recommendations..." : "Get Recommendation"}
              </button>
            </form>

            {loading && (
              <div className="mt-12 flex flex-col items-center justify-center space-y-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white">
                    Finding your matches...
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Querying Supabase and running recommendation engine.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                {error}
              </div>
            )}

            {submitted && noMatches && (
              <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                No phones match your {formatPrice(Number(form.budget))} budget. Try increasing your
                budget or adjusting your priorities.
              </div>
            )}

            {submitted && recommendations.length > 0 && (
              <div className="mt-10 space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white sm:text-2xl">
                    Your Top Recommendations
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    Ranked by your camera, gaming, and battery preferences.
                  </p>
                </div>

                <div className="grid gap-6">
                  {recommendations.map((phone, index) => (
                    <Link key={phone.id} href={`/phones/${generatePhoneSlug(phone.brand, phone.model)}`} className="block">
                      <RecommendationCard
                        phone={phone}
                        rank={index + 1}
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
