"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

type ScoreBreakdown = {
  camera: number;
  performance: number;
  battery: number;
  value: number;
  rating: number;
};

type RecommendedPhone = {
  id: string;
  brand: string;
  model: string;
  price: number;
  chipset: string;
  battery: string;
  camera?: string;
  display?: string;
  image_url?: string;
  amazon_link?: string;
  flipkart_link?: string;
  recommendationScore: number;
  scoreBreakdown?: ScoreBreakdown;
};

type Message = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  recommendations?: RecommendedPhone[];
  timestamp: Date;
};

const SUGGESTED_QUERIES = [
  "Best gaming phone under ₹30000",
  "Best camera phone under ₹50000",
  "Phone similar to iPhone 15 but cheaper",
  "Great battery phone under 20000"
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function generateSlug(brand: string, model: string): string {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I am your SmartPick AI assistant. Ask me to find smartphones based on budget, gaming, camera, battery, or look up alternatives to popular devices!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Call analytics search log event
    try {
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "search", eventData: { query: textToSend } })
      }).catch(() => {});
    } catch(e) {}

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: textToSend })
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = await response.json();
      
      const assistantMsg: Message = {
        id: Math.random().toString(),
        sender: "assistant",
        text: data.message,
        recommendations: data.recommendations,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: "assistant",
        text: "Sorry, I ran into an error while finding recommendations. Please try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-fuchsia-600/5 blur-3xl" />
        <div className="absolute bottom-12 left-10 h-80 w-80 rounded-full bg-indigo-650/5 blur-3xl" />
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col relative z-10">
        {/* Header */}
        <section className="text-center mb-6">
          <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-550/10 px-4 py-1.5 text-xs text-violet-300">
            <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
            AI Chat Helper
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Conversational Recommendations
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Type budget, priority (gaming/camera/battery), or a model name for direct DB-first analysis.
          </p>
        </section>

        {/* Chat Container */}
        <section className="flex-1 min-h-[450px] rounded-3xl border border-zinc-900 bg-zinc-900/40 p-4 sm:p-6 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden">
          {/* Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5 text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-400">
                    {msg.sender === "user" ? "You" : "SmartPick AI"}
                  </span>
                  <span>•</span>
                  <span>
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>

                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%] ${
                    msg.sender === "user"
                      ? "bg-violet-650 text-white font-medium shadow-md"
                      : "bg-zinc-950/60 border border-zinc-900 text-zinc-200"
                  }`}
                >
                  {msg.text.split("\n").map((line, i) => (
                    <p key={i} className={line ? "mb-2 last:mb-0" : "h-2"}>
                      {/* Very basic bold rendering */}
                      {line.split("**").map((chunk, index) => 
                        index % 2 === 1 ? <strong key={index} className="text-violet-300 font-bold">{chunk}</strong> : chunk
                      )}
                    </p>
                  ))}
                </div>

                {/* Render Phone Cards inside flow */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 w-full max-w-[90%]">
                    {msg.recommendations.map((phone, idx) => (
                      <div
                        key={phone.id}
                        className="group rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-zinc-850 hover:bg-zinc-900/40 hover:shadow-lg hover:shadow-violet-950/10 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <div>
                              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block">
                                {phone.brand}
                              </span>
                              <Link
                                href={`/phones/${generateSlug(phone.brand, phone.model)}`}
                                className="font-bold text-white text-base hover:text-violet-300 transition"
                              >
                                {phone.model}
                              </Link>
                            </div>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              {formatPrice(phone.price)}
                            </span>
                          </div>

                          {phone.image_url && phone.image_url.trim() !== "" && (
                            <div className="relative w-full h-28 my-3 rounded-lg overflow-hidden bg-zinc-950/80 p-1 flex items-center justify-center border border-zinc-900">
                              <Image
                                src={phone.image_url}
                                alt={`${phone.brand} ${phone.model}`}
                                fill
                                sizes="200px"
                                className="object-contain p-2"
                              />
                            </div>
                          )}

                          <dl className="text-xs space-y-1.5 text-zinc-400 border-t border-zinc-900 pt-2.5">
                            <div className="flex justify-between">
                              <span className="text-zinc-550">Chipset</span>
                              <span className="text-zinc-350 text-right truncate max-w-[120px]">{phone.chipset}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550">Battery</span>
                              <span className="text-zinc-350">{phone.battery}</span>
                            </div>
                            {phone.scoreBreakdown && (
                              <div className="grid grid-cols-5 gap-1 pt-1.5 border-t border-zinc-900/60 text-center text-[9px] font-semibold text-zinc-500">
                                <div>
                                  <div className="text-zinc-450">{phone.scoreBreakdown.camera}</div>
                                  <div>CAM</div>
                                </div>
                                <div>
                                  <div className="text-zinc-450">{phone.scoreBreakdown.performance}</div>
                                  <div>CPU</div>
                                </div>
                                <div>
                                  <div className="text-zinc-450">{phone.scoreBreakdown.battery}</div>
                                  <div>BAT</div>
                                </div>
                                <div>
                                  <div className="text-zinc-450">{phone.scoreBreakdown.value.toFixed(1)}</div>
                                  <div>VAL</div>
                                </div>
                                <div>
                                  <div className="text-zinc-450">{phone.scoreBreakdown.rating.toFixed(1)}</div>
                                  <div>POP</div>
                                </div>
                              </div>
                            )}
                          </dl>
                        </div>

                        <div className="mt-3.5 flex gap-2">
                          <Link
                            href={`/phones/${generateSlug(phone.brand, phone.model)}`}
                            className="flex-1 text-center rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[11px] font-semibold py-1.5 text-zinc-200 transition"
                          >
                            Details
                          </Link>
                          {phone.amazon_link && (
                            <a
                              href={phone.amazon_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center rounded-lg bg-violet-650 hover:bg-violet-600 text-[11px] font-semibold py-1.5 text-white transition shadow-sm"
                            >
                              Buy Now
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1.5 text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-400">SmartPick AI</span>
                  <span>•</span>
                  <span>Typing...</span>
                </div>
                <div className="rounded-2xl px-4 py-3 bg-zinc-950/60 border border-zinc-900 text-zinc-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Queries */}
          <div className="mt-4 border-t border-zinc-900 pt-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Suggested queries</span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUERIES.map((query) => (
                <button
                  key={query}
                  onClick={() => handleSendMessage(query)}
                  disabled={loading}
                  className="rounded-full bg-zinc-950/50 hover:bg-zinc-900 border border-zinc-900 px-3.5 py-1.5 text-xs text-zinc-300 transition hover:border-violet-500/40 hover:text-violet-300 font-medium"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>

          {/* Form Input */}
          <form onSubmit={handleSubmit} className="mt-4 flex gap-2.5">
            <input
              type="text"
              placeholder="Ask for recommendations... e.g. Best gaming phone under ₹30000"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 py-3.5 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 text-sm font-semibold text-white transition hover:from-violet-500 hover:to-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center shadow-lg shadow-violet-950/20"
            >
              Send
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
