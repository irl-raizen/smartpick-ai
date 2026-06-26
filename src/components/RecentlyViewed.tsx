"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { Phone } from "@/src/types/phone";

interface RecentlyViewedProps {
  currentPhone: Phone;
  formatPrice: (price: number) => string;
  generatePhoneSlug: (brand: string, model: string) => string;
}

export function RecentlyViewed({ currentPhone, formatPrice, generatePhoneSlug }: RecentlyViewedProps) {
  const [list, setList] = useState<Phone[]>([]);

  useEffect(() => {
    // 1. Get existing recently viewed list from localStorage
    const saved = JSON.parse(localStorage.getItem("recently_viewed") || "[]") as Phone[];
    
    // 2. Filter out current phone from list to display, and keep max 4 items
    const filteredList = saved.filter(p => p.id !== currentPhone.id).slice(0, 4);
    setList(filteredList);

    // 3. Add current phone to the top of the list for subsequent views
    const cleanList = saved.filter(p => p.id !== currentPhone.id);
    const updated = [currentPhone, ...cleanList].slice(0, 5); // Keep up to 5 items in storage
    localStorage.setItem("recently_viewed", JSON.stringify(updated));
  }, [currentPhone]);

  if (list.length === 0) return null;

  return (
    <div className="rounded-3xl border border-zinc-900 bg-zinc-900/30 p-8 backdrop-blur-md shadow-2xl">
      <div className="border-b border-zinc-850 pb-5 mb-6">
        <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          <Clock className="h-5 w-5 text-violet-400" />
          Recently Viewed
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Smartphones you inspected in this session.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
        {list.map((phone, idx) => {
          const slug = generatePhoneSlug(phone.brand, phone.model);

          return (
            <motion.div
              key={phone.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="group rounded-2xl bg-zinc-950/40 border border-zinc-900/80 p-4 hover:border-zinc-800 transition duration-300 flex items-center gap-3 relative"
            >
              {/* Image thumbnail */}
              {phone.image_url && phone.image_url.trim() !== "" ? (
                <div className="relative h-12 w-12 rounded-lg bg-zinc-900 overflow-hidden shrink-0 p-1 flex items-center justify-center border border-zinc-850">
                  <Image
                    src={phone.image_url}
                    alt={`${phone.brand} ${phone.model}`}
                    fill
                    sizes="48px"
                    className="object-contain p-1 group-hover:scale-105 transition"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-lg bg-zinc-900 border border-zinc-850 shrink-0" />
              )}

              {/* Text metadata */}
              <div className="space-y-0.5 min-w-0 pr-6">
                <span className="text-[9px] uppercase font-bold text-violet-400 block truncate">
                  {phone.brand}
                </span>
                <Link 
                  href={`/phones/${slug}`}
                  className="text-xs font-bold text-white group-hover:text-violet-300 transition block truncate"
                >
                  {phone.model}
                </Link>
                <span className="text-xs text-zinc-400 block font-semibold">
                  {formatPrice(phone.price)}
                </span>
              </div>

              {/* View details quick button */}
              <Link
                href={`/phones/${slug}`}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition border border-zinc-850 opacity-0 group-hover:opacity-100"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
