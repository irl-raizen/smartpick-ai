"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ArrowRight, Layers } from "lucide-react";
import { motion } from "framer-motion";
import type { Phone } from "@/src/types/phone";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function generatePhoneSlug(brand: string, model: string): string {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface SimilarPhonesListProps {
  phones: Phone[];
}

export function SimilarPhonesList({ phones }: SimilarPhonesListProps) {
  if (phones.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Similar & Alternatives</h2>
          <p className="text-xs text-zinc-500 mt-1">Smartphones in a similar budget and category.</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {phones.map((phone, idx) => {
          const ratingValue = ((phone.score_camera + phone.score_gaming + phone.score_battery) / 3).toFixed(1);
          const slug = generatePhoneSlug(phone.brand, phone.model);

          return (
            <motion.div
              key={phone.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className="group relative rounded-2xl border border-zinc-900 bg-zinc-900/20 hover:border-zinc-800 hover:bg-zinc-900/35 transition duration-300 p-5 flex flex-col justify-between shadow-lg"
            >
              <div>
                {/* Image */}
                {phone.image_url && phone.image_url.trim() !== "" ? (
                  <div className="relative w-full h-40 mb-4 rounded-xl overflow-hidden bg-zinc-950/40 border border-zinc-900/60 p-2 flex items-center justify-center">
                    <Image
                      src={phone.image_url}
                      alt={`${phone.brand} ${phone.model}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 300px"
                      className="object-contain p-2 transition duration-500 group-hover:scale-108"
                    />
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-xs text-zinc-650 bg-zinc-950/40 border border-zinc-900 rounded-xl mb-4">
                    No Image
                  </div>
                )}

                {/* Meta details */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-violet-400 block tracking-wider">
                    {phone.brand}
                  </span>
                  <Link 
                    href={`/phones/${slug}`}
                    className="text-base font-extrabold text-white group-hover:text-violet-300 transition-colors block line-clamp-1"
                  >
                    {phone.model}
                  </Link>
                </div>

                {/* Specs details */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-zinc-900 text-[11px] text-zinc-400">
                  <div>
                    <span className="text-zinc-550 block font-semibold uppercase text-[8px] tracking-wider">Chipset</span>
                    <span className="font-medium text-zinc-200 line-clamp-1">{phone.chipset || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-550 block font-semibold uppercase text-[8px] tracking-wider">Battery</span>
                    <span className="font-medium text-zinc-200">{phone.battery}</span>
                  </div>
                </div>
              </div>

              {/* Price & Action */}
              <div className="mt-5 pt-3 border-t border-zinc-900 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[9px] text-zinc-550 font-bold uppercase block">Starting at</span>
                  <span className="text-base font-black text-white">{formatPrice(phone.price)}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/compare/${slug}`}
                    className="h-8 w-8 rounded-lg border border-zinc-800 hover:border-violet-500/50 hover:bg-violet-500/10 text-zinc-400 hover:text-violet-300 flex items-center justify-center transition"
                    title="Compare"
                  >
                    <Layers className="h-4 w-4" />
                  </Link>

                  <Link
                    href={`/phones/${slug}`}
                    className="h-8 w-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center transition"
                    title="View details"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
