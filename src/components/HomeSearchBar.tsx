"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, ArrowRight, CornerDownLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Phone } from "@/src/types/phone";
import { generatePhoneSlug } from "@/src/lib/supabase";

interface HomeSearchBarProps {
  phones: Phone[];
}

const POPULAR_SEARCHES = ["iPhone 15", "S24 Ultra", "Nord CE 3", "Pixel 9 Pro"];

export function HomeSearchBar({ phones }: HomeSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<Phone[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Handle click outside to close suggestion dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter suggestions
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const lower = query.toLowerCase();
    const matches = phones
      .filter(
        (p) =>
          p.model.toLowerCase().includes(lower) ||
          p.brand.toLowerCase().includes(lower) ||
          (p.chipset && p.chipset.toLowerCase().includes(lower))
      )
      .slice(0, 5);

    setSuggestions(matches);
    setActiveIndex((prev) => Math.min(prev, matches.length - 1));
  }, [query, phones]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        selectPhone(suggestions[activeIndex]);
      } else if (query.trim()) {
        router.push(`/phones?search=${encodeURIComponent(query)}`);
        setIsFocused(false);
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
    }
  };

  const selectPhone = (phone: Phone) => {
    const slug = phone.slug || generatePhoneSlug(phone.brand, phone.model);
    router.push(`/phones/${slug}`);
    setQuery("");
    setIsFocused(false);
  };

  return (
    <div ref={containerRef} className="relative max-w-xl mx-auto w-full z-40">
      <div className="relative group">
        {/* Soft violet highlight behind bar */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 opacity-75 blur-md transition duration-500 group-focus-within:opacity-100" />
        
        <div className="relative flex items-center bg-zinc-900/90 border border-zinc-800 rounded-2xl px-4 py-3.5 backdrop-blur-md">
          <Search className="h-5 w-5 text-zinc-500 mr-3 group-focus-within:text-violet-400 transition" />
          <input
            type="text"
            placeholder="Search iPhone 15 Pro, Galaxy S24, OnePlus..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-white outline-none border-none placeholder:text-zinc-500 text-sm sm:text-base font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs font-bold text-zinc-500 hover:text-white px-2 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Suggestion Dropdown */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/95 p-4 backdrop-blur-lg shadow-2xl shadow-black/80 overflow-hidden"
          >
            {!query.trim() ? (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">
                  <Sparkles className="h-3 w-3 text-violet-400 animate-pulse" />
                  Popular Searches
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        setQuery(item);
                        setIsFocused(true);
                      }}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-850 hover:border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white transition duration-300"
                    >
                      {item}
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
                    </button>
                  ))}
                </div>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-sm">
                No smartphones found matching <span className="font-semibold text-zinc-300">"{query}"</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-2 px-2">
                  Search Results ({suggestions.length})
                </div>
                {suggestions.map((phone, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <div
                      key={phone.id}
                      onClick={() => selectPhone(phone)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ${
                        isActive
                          ? "bg-violet-650/15 border border-violet-500/20 text-white"
                          : "border border-transparent text-zinc-300 hover:bg-zinc-950/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {phone.image_url && (
                          <div className="h-9 w-9 relative rounded-lg bg-zinc-950/80 border border-zinc-855 p-1 flex items-center justify-center shrink-0">
                            <img
                              src={phone.image_url}
                              alt=""
                              className="h-full object-contain"
                            />
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-semibold text-zinc-500 uppercase block leading-none mb-1">
                            {phone.brand}
                          </span>
                          <span className="text-sm font-bold block">{phone.model}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isActive ? "bg-violet-500/20 text-violet-300" : "bg-zinc-950 text-zinc-400"}`}>
                          ₹{phone.price.toLocaleString("en-IN")}
                        </span>
                        {isActive && (
                          <CornerDownLeft className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
