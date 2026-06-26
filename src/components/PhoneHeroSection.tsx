"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  ShoppingBag, 
  Layers, 
  Heart, 
  Star, 
  Cpu, 
  Database, 
  HardDrive, 
  BatteryCharging, 
  Tv, 
  Smartphone,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Phone } from "@/src/types/phone";

interface PhoneHeroSectionProps {
  phone: Phone;
  formatPrice: (price: number) => string;
}

export function PhoneHeroSection({ phone, formatPrice }: PhoneHeroSectionProps) {
  const [selectedColor, setSelectedColor] = useState<string>("default");
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  // Local storage persistence for wishlist
  useEffect(() => {
    const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    setIsWishlisted(wishlist.includes(phone.id));
  }, [phone.id]);

  const toggleWishlist = () => {
    const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    let updated: string[];
    if (isWishlisted) {
      updated = wishlist.filter((id: string) => id !== phone.id);
    } else {
      updated = [...wishlist, phone.id];
    }
    localStorage.setItem("wishlist", JSON.stringify(updated));
    setIsWishlisted(!isWishlisted);
  };

  // Colorways simulation
  const colors = [
    { id: "default", name: "Original", tint: "", bg: "bg-zinc-800 border-zinc-700" },
    { id: "platinum", name: "Titanium Silver", tint: "brightness-110 contrast-95 sepia-[5%]", bg: "bg-slate-300 border-slate-200" },
    { id: "shadow", name: "Phantom Black", tint: "brightness-[0.4] contrast-125 saturate-50", bg: "bg-zinc-950 border-zinc-900" },
    { id: "violet", name: "Titanium Violet", tint: "hue-rotate-[250deg] saturate-125 brightness-90", bg: "bg-purple-900 border-purple-800" },
  ];

  const activeColor = colors.find(c => c.id === selectedColor) || colors[0];

  // Ratings count
  const ratingValue = ((phone.score_camera + phone.score_gaming + phone.score_battery) / 3).toFixed(1);

  return (
    <div className="space-y-8">
      {/* Brand, Title, Price, Rating */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-3"
      >
        <span className="text-sm font-bold tracking-widest text-violet-400 uppercase">
          {phone.brand}
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          {phone.model}
        </h1>
        
        {/* Rating */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star 
                key={i} 
                className="h-4.5 w-4.5 fill-current" 
                style={{ opacity: i < Math.round(parseFloat(ratingValue) / 2) ? 1 : 0.3 }}
              />
            ))}
          </div>
          <span className="text-sm font-bold text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850">
            {ratingValue} / 10
          </span>
          <span className="text-xs text-zinc-500">AI Specs Score</span>
        </div>

        {/* Price & Stock status */}
        <div className="flex flex-wrap items-baseline gap-4 pt-2">
          <span className="text-4xl font-extrabold text-white tracking-tight">
            {formatPrice(phone.price)}
          </span>
          {phone.active === false ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-xs font-bold text-rose-400 uppercase tracking-wider">
              <AlertCircle className="h-3.5 w-3.5" />
              Out of Stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Active Listing
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-550">MRP (Incl. of all taxes) in India</p>
      </motion.div>

      {/* Modern Phone Gallery Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative group rounded-3xl border border-zinc-900 bg-gradient-to-b from-zinc-900/50 to-zinc-950/50 p-6 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center overflow-hidden h-[450px] sm:h-[520px]"
      >
        {/* Soft Purple/Pink Glow behind phone */}
        <div className="absolute inset-0 bg-radial-gradient from-violet-600/15 via-transparent to-transparent opacity-75 pointer-events-none group-hover:scale-110 transition duration-1000" />
        
        {phone.image_url && phone.image_url.trim() !== "" ? (
          <div className="relative w-full h-[320px] sm:h-[380px] overflow-hidden">
            <Image
              src={phone.image_url}
              alt={`${phone.brand} ${phone.model} - ${activeColor.name}`}
              fill
              sizes="(max-width: 768px) 100vw, 550px"
              priority
              className={`object-contain p-4 transition-all duration-700 ease-out group-hover:scale-108 group-hover:-rotate-1 ${activeColor.tint}`}
            />
          </div>
        ) : (
          <div className="text-zinc-600 text-sm font-semibold flex items-center justify-center h-[320px]">
            No image available
          </div>
        )}

        {/* Thumbnail Selectors (Color Swatches simulated) */}
        <div className="relative z-10 flex gap-3 mt-4">
          {colors.map((color) => (
            <button
              key={color.id}
              onClick={() => setSelectedColor(color.id)}
              className={`h-8 w-8 rounded-full border-2 transition ${color.bg} ${
                selectedColor === color.id ? "scale-110 ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-950" : "hover:scale-105 opacity-80"
              }`}
              title={color.name}
            />
          ))}
        </div>
      </motion.div>

      {/* Call to Actions Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Amazon Button */}
          <a
            href={phone.amazon_link || `https://www.amazon.in/s?k=${encodeURIComponent(`${phone.brand} ${phone.model}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setHoveredButton("amazon")}
            onMouseLeave={() => setHoveredButton(null)}
            className="relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-6 py-4 text-sm font-black text-zinc-950 shadow-lg shadow-orange-950/15 hover:shadow-orange-500/20 active:scale-[0.98] transition-all duration-300"
          >
            <ShoppingBag className="h-4.5 w-4.5" />
            Buy on Amazon
          </a>

          {/* Flipkart Button */}
          <a
            href={phone.flipkart_link || `https://www.flipkart.com/search?q=${encodeURIComponent(`${phone.brand} ${phone.model}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setHoveredButton("flipkart")}
            onMouseLeave={() => setHoveredButton(null)}
            className="relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-950/15 hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-300"
          >
            <ShoppingBag className="h-4.5 w-4.5" />
            Buy on Flipkart
          </a>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Compare Button */}
          <a
            href={`/compare/${phone.slug || phone.id}`}
            onMouseEnter={() => setHoveredButton("compare")}
            onMouseLeave={() => setHoveredButton(null)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/50 px-6 py-3.5 text-sm font-bold text-violet-200 active:scale-[0.98] transition duration-300"
          >
            <Layers className="h-4.5 w-4.5" />
            Compare Specs
          </a>

          {/* Wishlist Button */}
          <button
            onClick={toggleWishlist}
            onMouseEnter={() => setHoveredButton("wishlist")}
            onMouseLeave={() => setHoveredButton(null)}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-6 py-3.5 text-sm font-bold active:scale-[0.98] transition duration-300 backdrop-blur-md ${
              isWishlisted 
                ? "bg-rose-500/10 border-rose-500/50 text-rose-300 shadow-lg shadow-rose-950/20" 
                : "bg-zinc-900/30 border-zinc-800 text-zinc-300 hover:bg-zinc-900/50 hover:border-zinc-700"
            }`}
          >
            <Heart className={`h-4.5 w-4.5 transition-transform ${isWishlisted ? "fill-current scale-110 text-rose-500" : ""}`} />
            {isWishlisted ? "In Wishlist" : "Add to Wishlist"}
          </button>
        </div>
      </motion.div>

      {/* Quick Specs Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="rounded-3xl border border-zinc-900 bg-zinc-900/25 p-6 space-y-4"
      >
        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Quick Specifications</span>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-900/60">
            <Cpu className="h-5 w-5 text-violet-400 shrink-0" />
            <div>
              <span className="text-[9px] uppercase font-bold text-zinc-550 block">Processor</span>
              <span className="text-xs font-bold text-zinc-200 line-clamp-1">{phone.processor || phone.chipset || "N/A"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-900/60">
            <Database className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[9px] uppercase font-bold text-zinc-550 block">RAM</span>
              <span className="text-xs font-bold text-zinc-200">{phone.ram || "N/A"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-900/60">
            <HardDrive className="h-5 w-5 text-cyan-400 shrink-0" />
            <div>
              <span className="text-[9px] uppercase font-bold text-zinc-550 block">Storage</span>
              <span className="text-xs font-bold text-zinc-200">{phone.storage || "N/A"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-900/60">
            <BatteryCharging className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <span className="text-[9px] uppercase font-bold text-zinc-550 block">Battery</span>
              <span className="text-xs font-bold text-zinc-200">{phone.battery}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-900/60">
            <Tv className="h-5 w-5 text-fuchsia-400 shrink-0" />
            <div>
              <span className="text-[9px] uppercase font-bold text-zinc-550 block">Display</span>
              <span className="text-xs font-bold text-zinc-200 line-clamp-1">{phone.display || "N/A"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-900/60">
            <Smartphone className="h-5 w-5 text-rose-400 shrink-0" />
            <div>
              <span className="text-[9px] uppercase font-bold text-zinc-550 block">OS</span>
              <span className="text-xs font-bold text-zinc-200">{phone.os || "N/A"}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
