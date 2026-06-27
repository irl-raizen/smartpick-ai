"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import { 
  Search, 
  SlidersHorizontal, 
  Grid, 
  List, 
  X, 
  Star, 
  ArrowUpDown, 
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Cpu,
  Layers,
  Battery,
  Calendar,
  Eye,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Phone } from "@/src/types/phone";
import { generatePhoneSlug } from "@/src/lib/supabase";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

type PhonesCatalogProps = {
  initialPhones: Phone[];
};

export function PhonesCatalog({ initialPhones }: PhonesCatalogProps) {
  // View states
  const [isGridView, setIsGridView] = useState(true);
  const [visibleCount, setVisibleCount] = useState(12);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(150000);
  const [selectedRams, setSelectedRams] = useState<string[]>([]);
  const [selectedStorages, setSelectedStorages] = useState<string[]>([]);
  const [selectedBatteries, setSelectedBatteries] = useState<string[]>([]);
  const [selectedLaunchYears, setSelectedLaunchYears] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<string>("all");
  const [sortBy, setSortBy] = useState("default");

  // Dynamic ranges based on dataset
  const minPrice = useMemo(() => {
    return Math.min(...initialPhones.map(p => p.price));
  }, [initialPhones]);

  const maxPriceInDb = useMemo(() => {
    return Math.max(...initialPhones.map(p => p.price));
  }, [initialPhones]);

  // Set initial max price slider limit on mount
  useEffect(() => {
    setMaxPrice(maxPriceInDb);
  }, [maxPriceInDb]);

  // Extract unique filter options
  const brandsList = useMemo(() => {
    return Array.from(new Set(initialPhones.map(p => p.brand))).sort();
  }, [initialPhones]);

  const ramList = ["4GB", "6GB", "8GB", "12GB", "16GB"];
  const storageList = ["64GB", "128GB", "256GB", "512GB"];
  const batteryCategories = ["< 4000 mAh", "4000 - 5000 mAh", "> 5000 mAh"];
  const launchYearsList = ["2022", "2023", "2024", "2025"];

  // Debounced search analytics
  useEffect(() => {
    if (searchTerm.trim().length < 3) return;
    const delayDebounceFn = setTimeout(() => {
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "search",
          eventData: { query: searchTerm.trim() }
        })
      }).catch((err) => console.warn("Search log error:", err));
    }, 1500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Handle individual toggle filters
  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
    setVisibleCount(12);
  };

  const toggleRam = (ram: string) => {
    setSelectedRams(prev => 
      prev.includes(ram) ? prev.filter(r => r !== ram) : [...prev, ram]
    );
    setVisibleCount(12);
  };

  const toggleStorage = (storage: string) => {
    setSelectedStorages(prev => 
      prev.includes(storage) ? prev.filter(s => s !== storage) : [...prev, storage]
    );
    setVisibleCount(12);
  };

  const toggleBattery = (battery: string) => {
    setSelectedBatteries(prev => 
      prev.includes(battery) ? prev.filter(b => b !== battery) : [...prev, battery]
    );
    setVisibleCount(12);
  };

  const toggleLaunchYear = (year: string) => {
    setSelectedLaunchYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
    setVisibleCount(12);
  };

  // Reset Filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedBrands([]);
    setMaxPrice(maxPriceInDb);
    setSelectedRams([]);
    setSelectedStorages([]);
    setSelectedBatteries([]);
    setSelectedLaunchYears([]);
    setSelectedAvailability("all");
    setSortBy("default");
    setVisibleCount(12);
  };

  // Filter and sort computation
  const filteredPhones = useMemo(() => {
    let result = [...initialPhones];

    // Search query
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        p => p.model.toLowerCase().includes(term) || 
             p.brand.toLowerCase().includes(term) ||
             (p.chipset && p.chipset.toLowerCase().includes(term))
      );
    }

    // Brands multi-select
    if (selectedBrands.length > 0) {
      result = result.filter(p => selectedBrands.includes(p.brand));
    }

    // Max Price
    result = result.filter(p => p.price <= maxPrice);

    // RAM capacity
    if (selectedRams.length > 0) {
      result = result.filter(p => p.ram && selectedRams.some(r => p.ram!.includes(r)));
    }

    // Storage capacity
    if (selectedStorages.length > 0) {
      result = result.filter(p => p.storage && selectedStorages.some(s => p.storage!.includes(s)));
    }

    // Battery capacity category
    if (selectedBatteries.length > 0) {
      result = result.filter(p => {
        const capacity = parseInt(p.battery || "0", 10) || 0;
        return selectedBatteries.some(cat => {
          if (cat === "< 4000 mAh") return capacity < 4000;
          if (cat === "4000 - 5000 mAh") return capacity >= 4000 && capacity <= 5000;
          if (cat === "> 5000 mAh") return capacity > 5000;
          return false;
        });
      });
    }

    // Launch Years
    if (selectedLaunchYears.length > 0) {
      result = result.filter(p => p.launch_year && selectedLaunchYears.includes(String(p.launch_year)));
    }

    // Availability status
    if (selectedAvailability === "active") {
      result = result.filter(p => p.active !== false);
    } else if (selectedAvailability === "out_of_stock") {
      result = result.filter(p => p.active === false);
    }

    // Sorting
    if (sortBy === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating-desc") {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "score-desc") {
      result.sort((a, b) => {
        const scoreA = a.score_camera + a.score_gaming + a.score_battery;
        const scoreB = b.score_camera + b.score_gaming + b.score_battery;
        return scoreB - scoreA;
      });
    }

    return result;
  }, [
    initialPhones, searchTerm, selectedBrands, maxPrice, selectedRams, 
    selectedStorages, selectedBatteries, selectedLaunchYears, selectedAvailability, sortBy
  ]);

  // Paginated/Sliced phones
  const displayedPhones = useMemo(() => {
    return filteredPhones.slice(0, visibleCount);
  }, [filteredPhones, visibleCount]);

  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + 12, filteredPhones.length));
  };

  const hasActiveFilters = 
    searchTerm !== "" || 
    selectedBrands.length > 0 || 
    maxPrice < maxPriceInDb || 
    selectedRams.length > 0 || 
    selectedStorages.length > 0 || 
    selectedBatteries.length > 0 || 
    selectedLaunchYears.length > 0 ||
    selectedAvailability !== "all";

  // Build active filter chips list
  const activeChips = useMemo(() => {
    const chips: { type: string; label: string; value: any }[] = [];
    if (searchTerm) chips.push({ type: "search", label: `Search: ${searchTerm}`, value: searchTerm });
    selectedBrands.forEach(b => chips.push({ type: "brand", label: b, value: b }));
    if (maxPrice < maxPriceInDb) chips.push({ type: "price", label: `Under ${formatPrice(maxPrice)}`, value: maxPrice });
    selectedRams.forEach(r => chips.push({ type: "ram", label: `RAM: ${r}`, value: r }));
    selectedStorages.forEach(s => chips.push({ type: "storage", label: `ROM: ${s}`, value: s }));
    selectedBatteries.forEach(bat => chips.push({ type: "battery", label: bat, value: bat }));
    selectedLaunchYears.forEach(y => chips.push({ type: "year", label: y, value: y }));
    if (selectedAvailability !== "all") {
      chips.push({ 
        type: "avail", 
        label: selectedAvailability === "active" ? "In Stock" : "Out of Stock", 
        value: selectedAvailability 
      });
    }
    return chips;
  }, [searchTerm, selectedBrands, maxPrice, maxPriceInDb, selectedRams, selectedStorages, selectedBatteries, selectedLaunchYears, selectedAvailability]);

  const removeChip = (chip: typeof activeChips[0]) => {
    if (chip.type === "search") setSearchTerm("");
    else if (chip.type === "brand") setSelectedBrands(prev => prev.filter(b => b !== chip.value));
    else if (chip.type === "price") setMaxPrice(maxPriceInDb);
    else if (chip.type === "ram") setSelectedRams(prev => prev.filter(r => r !== chip.value));
    else if (chip.type === "storage") setSelectedStorages(prev => prev.filter(s => s !== chip.value));
    else if (chip.type === "battery") setSelectedBatteries(prev => prev.filter(b => b !== chip.value));
    else if (chip.type === "year") setSelectedLaunchYears(prev => prev.filter(y => y !== chip.value));
    else if (chip.type === "avail") setSelectedAvailability("all");
    setVisibleCount(12);
  };

  return (
    <div className="mt-12 grid gap-8 lg:grid-cols-12 items-start relative z-10">
      
      {/* 1. FILTER SIDEBAR (Desktop) */}
      <aside className="hidden lg:block lg:col-span-3 rounded-3xl border border-zinc-900 bg-zinc-900/10 p-6 backdrop-blur-sm space-y-6 sticky top-24 h-[calc(100vh-140px)] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-850">
        <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
          <span className="text-sm font-black text-white flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4 text-violet-400" />
            Filters
          </span>
          {hasActiveFilters && (
            <button 
              onClick={resetFilters} 
              className="text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        {/* Max Price Filter */}
        <div className="space-y-3">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 block">Max Price</label>
          <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
            <span>{formatPrice(minPrice)}</span>
            <span className="text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/25">{formatPrice(maxPrice)}</span>
          </div>
          <input
            type="range"
            min={minPrice}
            max={maxPriceInDb}
            step={1000}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-850 accent-violet-500"
          />
        </div>

        {/* Brands checklist */}
        <div className="space-y-3">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 block">Brands</label>
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-850 pr-1">
            {brandsList.map(brand => (
              <label key={brand} className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                  className="rounded border-zinc-800 bg-zinc-950 text-violet-650 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                />
                {brand}
              </label>
            ))}
          </div>
        </div>

        {/* RAM Selector */}
        <div className="space-y-3">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 block">RAM Configuration</label>
          <div className="flex flex-wrap gap-2">
            {ramList.map(ram => {
              const active = selectedRams.includes(ram);
              return (
                <button
                  key={ram}
                  onClick={() => toggleRam(ram)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    active 
                      ? "bg-violet-600 border-violet-500 text-white" 
                      : "border border-zinc-900 bg-zinc-950/40 text-zinc-400 hover:border-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  {ram}
                </button>
              );
            })}
          </div>
        </div>

        {/* Storage Selector */}
        <div className="space-y-3">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 block">Internal Storage</label>
          <div className="flex flex-wrap gap-2">
            {storageList.map(storage => {
              const active = selectedStorages.includes(storage);
              return (
                <button
                  key={storage}
                  onClick={() => toggleStorage(storage)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    active 
                      ? "bg-violet-650 border-violet-500 text-white" 
                      : "border border-zinc-900 bg-zinc-950/40 text-zinc-400 hover:border-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  {storage}
                </button>
              );
            })}
          </div>
        </div>

        {/* Battery Categories */}
        <div className="space-y-3">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 block">Battery Size</label>
          <div className="space-y-2">
            {batteryCategories.map(cat => (
              <label key={cat} className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={selectedBatteries.includes(cat)}
                  onChange={() => toggleBattery(cat)}
                  className="rounded border-zinc-800 bg-zinc-950 text-violet-650 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                />
                {cat}
              </label>
            ))}
          </div>
        </div>

        {/* Launch Years */}
        <div className="space-y-3">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 block">Launch Year</label>
          <div className="flex flex-wrap gap-2">
            {launchYearsList.map(year => {
              const active = selectedLaunchYears.includes(year);
              return (
                <button
                  key={year}
                  onClick={() => toggleLaunchYear(year)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    active 
                      ? "bg-violet-650 border-violet-500 text-white" 
                      : "border border-zinc-900 bg-zinc-950/40 text-zinc-400 hover:border-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="space-y-3">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 block">Availability</label>
          <select
            value={selectedAvailability}
            onChange={(e) => setSelectedAvailability(e.target.value)}
            className="w-full appearance-none rounded-xl border border-zinc-900 bg-zinc-950 py-2.5 px-4 text-xs font-bold text-zinc-300 outline-none transition focus:border-violet-500"
          >
            <option value="all">All Listings</option>
            <option value="active">In Stock / Active</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </aside>

      {/* 2. CATALOG CONTAINER (col-span-9) */}
      <div className="lg:col-span-9 space-y-6">
        
        {/* Controls Pane */}
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-5 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative w-full md:max-w-md">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-500">
              <Search className="h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              placeholder="Search smartphones catalog..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(12); }}
              className="w-full rounded-2xl border border-zinc-900 bg-zinc-950 py-3 pl-12 pr-4 text-white outline-none transition placeholder:text-zinc-600 text-sm font-semibold focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div className="flex items-center justify-between w-full md:w-auto gap-4 shrink-0">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none rounded-2xl border border-zinc-900 bg-zinc-950 py-3 px-4.5 pr-10 text-xs font-bold text-zinc-300 outline-none transition focus:border-violet-500"
              >
                <option value="default">Default Sorting</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating-desc">Expert Rating</option>
                <option value="score-desc">AI Performance</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-zinc-500">
                <ArrowUpDown className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* Mobile Filters Toggle Button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden p-3 rounded-2xl border border-zinc-900 bg-zinc-950 text-zinc-400 hover:text-white"
              title="Filters"
            >
              <SlidersHorizontal className="h-4.5 w-4.5" />
            </button>

            {/* Grid/List View Toggles */}
            <div className="flex items-center gap-1.5 border border-zinc-900 bg-zinc-950 p-1 rounded-2xl">
              <button
                onClick={() => setIsGridView(true)}
                className={`p-2 rounded-xl transition ${isGridView ? "bg-zinc-900 text-violet-400" : "text-zinc-500 hover:text-white"}`}
                title="Grid View"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsGridView(false)}
                className={`p-2 rounded-xl transition ${!isGridView ? "bg-zinc-900 text-violet-400" : "text-zinc-500 hover:text-white"}`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. ACTIVE FILTER CHIPS */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mr-1">Active Filters:</span>
            {activeChips.map((chip, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300"
              >
                {chip.label}
                <button
                  onClick={() => removeChip(chip)}
                  className="rounded-full p-0.5 hover:bg-violet-500/20 text-violet-400 hover:text-white transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-zinc-500 hover:text-white transition ml-2"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Results Counter */}
        <div className="text-xs font-bold text-zinc-500 px-1.5">
          Showing <span className="text-white">{filteredPhones.length}</span> smartphones
        </div>

        {/* 4. RESULTS VIEW */}
        {filteredPhones.length === 0 ? (
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-16 text-center backdrop-blur-sm">
            <SlidersHorizontal className="mx-auto h-12 w-12 text-zinc-750 mb-4 animate-bounce" />
            <h4 className="text-lg font-bold text-white">No Smartphones Match Your Filters</h4>
            <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto leading-relaxed">
              We couldn't find any phone listing matching your selected brands, prices, or specs. Try clearing filters.
            </p>
            <button
              onClick={resetFilters}
              className="mt-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-5 py-2.5 text-xs font-bold text-zinc-200"
            >
              Reset Filters
            </button>
          </div>
        ) : isGridView ? (
          /* Grid View Layout */
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayedPhones.map((phone) => {
              const ratingValue = ((phone.score_camera + phone.score_gaming + phone.score_battery) / 3).toFixed(1);
              return (
                <Link
                  key={phone.id}
                  href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                  className="group relative flex flex-col justify-between rounded-3xl border border-zinc-900 bg-zinc-900/15 p-5 backdrop-blur-sm hover:border-zinc-800 transition duration-300"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[9px] uppercase font-extrabold tracking-widest text-violet-400 leading-none block mb-1">
                          {phone.brand}
                        </span>
                        <h4 className="text-base font-bold text-white leading-tight group-hover:text-violet-200 transition">
                          {phone.model}
                        </h4>
                      </div>
                      <span className="rounded-full bg-violet-500/10 border border-violet-500/25 px-2.5 py-1 text-xs font-bold text-violet-300 shrink-0">
                        {formatPrice(phone.price)}
                      </span>
                    </div>

                    {/* Image Container */}
                    {phone.image_url && (
                      <div className="h-40 w-full relative flex items-center justify-center p-3 bg-zinc-950/40 rounded-2xl border border-zinc-900/50 group-hover:scale-[1.04] transition duration-500">
                        <img src={phone.image_url} alt="" className="h-full object-contain" />
                      </div>
                    )}

                    {/* Quick Specs */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-violet-455 shrink-0" />
                        <span className="truncate">{phone.processor || phone.chipset || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Battery className="h-3.5 w-3.5 text-amber-450 shrink-0" />
                        <span>{phone.battery ? `${phone.battery} mAh` : "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ratings Panel */}
                  <div className="flex items-center justify-between border-t border-zinc-900/80 pt-4 mt-4 text-[10px] font-bold text-zinc-500">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-900">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                      Rating: {(phone.rating || 4.2).toFixed(1)}
                    </span>
                    <span className="text-fuchsia-350">
                      Score: {ratingValue} / 10
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* List View Layout */
          <div className="space-y-4">
            {displayedPhones.map((phone) => {
              const ratingValue = ((phone.score_camera + phone.score_gaming + phone.score_battery) / 3).toFixed(1);
              return (
                <Link
                  key={phone.id}
                  href={`/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`}
                  className="group relative rounded-3xl border border-zinc-900 bg-zinc-900/15 p-5 backdrop-blur-sm hover:border-zinc-800 transition duration-300 flex flex-col sm:flex-row items-center gap-5 justify-between"
                >
                  <div className="flex items-center gap-4 w-full sm:max-w-lg">
                    {phone.image_url && (
                      <div className="h-20 w-20 relative flex items-center justify-center p-2 bg-zinc-950 rounded-2xl border border-zinc-850 shrink-0 group-hover:scale-105 transition">
                        <img src={phone.image_url} alt="" className="h-full object-contain" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 block leading-none">{phone.brand}</span>
                      <h4 className="text-base font-bold text-white group-hover:text-violet-200 transition">{phone.model}</h4>
                      <p className="text-xs text-zinc-450 line-clamp-1">
                        Processor: {phone.processor || phone.chipset} | Display: {phone.display} | Battery: {phone.battery}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-900">
                    <div className="text-left sm:text-right">
                      <span className="text-xs font-bold text-zinc-500 block leading-none mb-1">Live Price</span>
                      <span className="text-base font-black text-white">{formatPrice(phone.price)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-zinc-550 block leading-none mb-1">AI Score</span>
                      <span className="text-sm font-black text-fuchsia-350 bg-fuchsia-500/10 border border-fuchsia-500/25 px-2 py-0.5 rounded">
                        {ratingValue} / 10
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 5. LOAD MORE (SIMULATED INFINITE SCROLL) */}
        {visibleCount < filteredPhones.length && (
          <div className="text-center pt-8">
            <button
              onClick={loadMore}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-zinc-900 bg-zinc-900/40 px-8 py-4 text-xs font-black text-zinc-200 hover:text-white hover:bg-zinc-900 hover:border-zinc-800 transition duration-300"
            >
              <Eye className="h-4 w-4 text-violet-400" />
              Load More Smartphones ({filteredPhones.length - visibleCount} Remaining)
            </button>
          </div>
        )}
      </div>

      {/* 6. MOBILE FILTERS DRAWER */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            {/* Background Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="fixed inset-0 z-50 bg-black"
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-zinc-900 bg-zinc-950 p-6 h-[85vh] overflow-y-auto flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                  <span className="text-base font-black text-white flex items-center gap-1.5">
                    <SlidersHorizontal className="h-4.5 w-4.5 text-violet-450" />
                    Filter smartphone
                  </span>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="p-1 rounded-full bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Mobile Filters Content Scroll area */}
                <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
                  
                  {/* Price */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Max Price</label>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-zinc-500">{formatPrice(minPrice)}</span>
                      <span className="text-violet-400">{formatPrice(maxPrice)}</span>
                    </div>
                    <input
                      type="range"
                      min={minPrice}
                      max={maxPriceInDb}
                      step={1000}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-850 accent-violet-500"
                    />
                  </div>

                  {/* Brands */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Brands</label>
                    <div className="flex flex-wrap gap-2">
                      {brandsList.map(brand => {
                        const active = selectedBrands.includes(brand);
                        return (
                          <button
                            key={brand}
                            onClick={() => toggleBrand(brand)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              active ? "bg-violet-650 text-white" : "border border-zinc-900 bg-zinc-950 text-zinc-400"
                            }`}
                          >
                            {brand}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* RAM */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">RAM</label>
                    <div className="flex flex-wrap gap-2">
                      {ramList.map(ram => {
                        const active = selectedRams.includes(ram);
                        return (
                          <button
                            key={ram}
                            onClick={() => toggleRam(ram)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              active ? "bg-violet-650 text-white" : "border border-zinc-900 bg-zinc-955 text-zinc-400"
                            }`}
                          >
                            {ram}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Storage */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Storage</label>
                    <div className="flex flex-wrap gap-2">
                      {storageList.map(storage => {
                        const active = selectedStorages.includes(storage);
                        return (
                          <button
                            key={storage}
                            onClick={() => toggleStorage(storage)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              active ? "bg-violet-650 text-white" : "border border-zinc-900 bg-zinc-955 text-zinc-400"
                            }`}
                          >
                            {storage}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Drawer Bottom CTAs */}
              <div className="border-t border-zinc-900 pt-4 mt-4 grid grid-cols-2 gap-4 shrink-0">
                <button
                  onClick={resetFilters}
                  className="rounded-2xl border border-zinc-900 bg-zinc-950 py-3.5 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="rounded-2xl bg-violet-600 hover:bg-violet-550 py-3.5 text-xs font-black text-white"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
