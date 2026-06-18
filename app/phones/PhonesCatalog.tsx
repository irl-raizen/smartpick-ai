"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Phone } from "@/src/types/phone";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function PhoneCard({ phone }: { phone: Phone }) {
  return (
    <article className="group rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-violet-950/20">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-violet-300">
            {phone.brand}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white group-hover:text-violet-100 transition-colors duration-300">
            {phone.model}
          </h2>
        </div>
        <span className="rounded-full bg-violet-500/15 px-3 py-1 text-sm font-semibold text-violet-200">
          {formatPrice(phone.price)}
        </span>
      </div>

      {phone.image_url && phone.image_url.trim() !== "" && (
        <div className="relative w-full h-40 mb-4 rounded-xl overflow-hidden bg-zinc-950/40 border border-zinc-800/80 p-2 flex items-center justify-center">
          <img
            src={phone.image_url}
            alt={`${phone.brand} ${phone.model}`}
            className="h-full w-auto object-contain transition duration-300 group-hover:scale-105"
          />
        </div>
      )}

      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4 border-t border-zinc-800/80 pt-3">
          <dt className="text-zinc-500">Chipset</dt>
          <dd className="text-right font-medium text-zinc-200">{phone.chipset}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-zinc-800/80 pt-3">
          <dt className="text-zinc-500">Battery</dt>
          <dd className="text-right font-medium text-zinc-200">{phone.battery}</dd>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-zinc-800/80 pt-3 text-center text-xs">
          <div className="rounded-lg bg-zinc-950/50 py-1.5 px-2">
            <span className="block text-zinc-500">Camera</span>
            <span className="font-semibold text-violet-300">{phone.score_camera}/10</span>
          </div>
          <div className="rounded-lg bg-zinc-950/50 py-1.5 px-2">
            <span className="block text-zinc-500">Gaming</span>
            <span className="font-semibold text-emerald-300">{phone.score_gaming}/10</span>
          </div>
          <div className="rounded-lg bg-zinc-950/50 py-1.5 px-2">
            <span className="block text-zinc-500">Battery</span>
            <span className="font-semibold text-amber-300">{phone.score_battery}/10</span>
          </div>
        </div>
      </dl>
    </article>
  );
}

type PhonesCatalogProps = {
  initialPhones: Phone[];
};

export function PhonesCatalog({ initialPhones }: PhonesCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [sortBy, setSortBy] = useState("default");

  // Log phones fetched from Supabase on component mount
  useEffect(() => {
    console.log("Phones fetched from Supabase:", initialPhones);
  }, [initialPhones]);

  // Dynamically extract unique brands
  const brands = useMemo(() => {
    const unique = new Set(initialPhones.map((phone) => phone.brand));
    return ["All", ...Array.from(unique).sort()];
  }, [initialPhones]);

  // Search, filter, and sort logic
  const filteredAndSortedPhones = useMemo(() => {
    let result = [...initialPhones];

    // Apply Brand filter
    if (selectedBrand !== "All") {
      result = result.filter(
        (phone) => phone.brand.toLowerCase() === selectedBrand.toLowerCase(),
      );
    }

    // Apply Search filter (model or brand name match)
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (phone) =>
          phone.model.toLowerCase().includes(term) ||
          phone.brand.toLowerCase().includes(term),
      );
    }

    // Apply Price sorting
    if (sortBy === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [initialPhones, selectedBrand, searchTerm, sortBy]);

  function handleResetFilters() {
    setSearchTerm("");
    setSelectedBrand("All");
    setSortBy("default");
  }

  return (
    <div className="mt-12 space-y-8">
      {/* Controls Container */}
      <div className="rounded-3xl border border-zinc-900 bg-zinc-900/30 p-6 backdrop-blur-sm space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-500">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by brand or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-12 pr-4 text-white outline-none transition placeholder:text-zinc-650 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          {/* Sort Select */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-48 appearance-none rounded-xl border border-zinc-800 bg-zinc-950 py-3 px-4 pr-10 text-zinc-200 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="default">Default Sort</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-zinc-500">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </div>

        {/* Brand Filter Pills */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Filter by Brand
          </span>
          <div className="flex flex-wrap gap-2 pt-1">
            {brands.map((brand) => {
              const isActive = selectedBrand === brand;
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setSelectedBrand(brand)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-[1.03] ${
                    isActive
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-900/30 ring-1 ring-violet-500"
                      : "border border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {brand}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid Header Info */}
      <div className="flex items-center justify-between text-sm text-zinc-450 px-2">
        <p>
          Showing <span className="font-semibold text-white">{filteredAndSortedPhones.length}</span>{" "}
          of <span className="font-semibold text-zinc-400">{initialPhones.length}</span> smartphones
        </p>
        {(searchTerm !== "" || selectedBrand !== "All" || sortBy !== "default") && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-violet-400 hover:text-violet-300 font-medium transition"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Grid of Results */}
      {filteredAndSortedPhones.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/30 p-10 text-center backdrop-blur-sm">
          <svg
            className="mx-auto h-12 w-12 text-zinc-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <h3 className="text-lg font-medium text-white">No smartphones match your filters</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Try widening your search terms, changing the brand pill, or clearing filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-6 rounded-xl bg-zinc-855 border border-zinc-800 px-5 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-900 hover:text-white"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedPhones.map((phone) => (
            <Link key={phone.id} href={`/phones/${phone.id}`} className="group block">
              <PhoneCard phone={phone} />
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
