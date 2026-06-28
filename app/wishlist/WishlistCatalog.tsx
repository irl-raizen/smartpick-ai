"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Heart, 
  ArrowLeftRight, 
  History, 
  Trash2, 
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Star,
  Cpu,
  Sparkles
} from "lucide-react";
import type { Phone } from "@/src/types/phone";

type WishlistCatalogProps = {
  phones: Phone[];
};

type SavedComparison = {
  phone1Id: string;
  phone2Id: string;
  timestamp: number;
};

export function WishlistCatalog({ phones }: WishlistCatalogProps) {
  const [activeTab, setActiveTab] = useState<"wishlist" | "comparisons" | "history">("wishlist");
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [comparisons, setComparisons] = useState<SavedComparison[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  // Load from local storage
  useEffect(() => {
    try {
      const savedWishlist = JSON.parse(localStorage.getItem("smartpick-wishlist") || "[]");
      const savedComparisons = JSON.parse(localStorage.getItem("smartpick-comparisons") || "[]");
      const savedHistory = JSON.parse(localStorage.getItem("smartpick-recently-viewed") || "[]");
      
      setWishlist(savedWishlist);
      setComparisons(savedComparisons);
      setHistory(savedHistory);
    } catch (e) {
      console.error("Failed to read storage data", e);
    }
  }, []);

  // Action Handlers
  const removeFromWishlist = (id: string) => {
    const updated = wishlist.filter(wId => wId !== id);
    setWishlist(updated);
    localStorage.setItem("smartpick-wishlist", JSON.stringify(updated));
  };

  const clearWishlist = () => {
    setWishlist([]);
    localStorage.removeItem("smartpick-wishlist");
  };

  const removeComparison = (phone1Id: string, phone2Id: string) => {
    const updated = comparisons.filter(c => !(c.phone1Id === phone1Id && c.phone2Id === phone2Id));
    setComparisons(updated);
    localStorage.setItem("smartpick-comparisons", JSON.stringify(updated));
  };

  const clearComparisons = () => {
    setComparisons([]);
    localStorage.removeItem("smartpick-comparisons");
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("smartpick-recently-viewed");
  };

  // Maps IDs to full Phone objects
  const wishlistPhones = wishlist
    .map(wId => phones.find(p => String(p.id) === wId))
    .filter((p): p is Phone => p !== undefined);

  const historyPhones = history
    .map(hId => phones.find(p => String(p.id) === hId))
    .filter((p): p is Phone => p !== undefined);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-10">
      {/* Header section */}
      <div className="border-b border-zinc-900 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-violet-400">
            <Sparkles className="h-3.5 w-3.5" />
            User Dashboard
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Saved Resources</h1>
          <p className="text-xs text-zinc-500 font-medium">Keep track of your favorite smartphones, comparisons, and browser history.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-zinc-900/40 border border-zinc-900 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab("wishlist")}
            className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === "wishlist"
                ? "bg-zinc-950 text-violet-400 border border-zinc-900/60"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <Heart className="h-4 w-4" />
            Wishlist ({wishlist.length})
          </button>
          <button
            onClick={() => setActiveTab("comparisons")}
            className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === "comparisons"
                ? "bg-zinc-950 text-violet-400 border border-zinc-900/60"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            Comparisons ({comparisons.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === "history"
                ? "bg-zinc-950 text-violet-400 border border-zinc-900/60"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <History className="h-4 w-4" />
            Recently Viewed ({history.length})
          </button>
        </div>
      </div>

      {/* 1. WISHLIST TAB */}
      {activeTab === "wishlist" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-zinc-550">My Saved Devices</span>
            {wishlist.length > 0 && (
              <button 
                onClick={clearWishlist}
                className="text-xs text-rose-400 hover:text-rose-350 font-bold flex items-center gap-1 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Wishlist
              </button>
            )}
          </div>

          {wishlistPhones.length === 0 ? (
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-20 text-center">
              <Heart className="h-10 w-10 text-zinc-750 mx-auto mb-4" />
              <h3 className="text-base font-bold text-zinc-300">Your Wishlist is Empty</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2 leading-relaxed">
                Add smartphones to your wishlist using the heart icon on search results and product detail pages.
              </p>
              <Link 
                href="/phones"
                className="inline-flex items-center gap-1.5 text-xs font-black text-violet-400 hover:text-violet-300 transition mt-6 bg-violet-500/10 border border-violet-500/25 px-5 py-3 rounded-2xl"
              >
                Browse Catalog
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {wishlistPhones.map(phone => (
                <div 
                  key={phone.id}
                  className="group relative rounded-3xl border border-zinc-900 bg-zinc-900/15 p-5 backdrop-blur-sm hover:border-zinc-800 transition duration-300 flex flex-col justify-between"
                >
                  <button
                    onClick={() => removeFromWishlist(String(phone.id))}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-950 border border-zinc-900 text-rose-400 hover:text-rose-350 hover:bg-zinc-900 transition z-10"
                    title="Remove from Wishlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <Link href={`/phones/${phone.slug}`} className="space-y-4">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 block mb-1">
                        {phone.brand}
                      </span>
                      <h3 className="text-base font-bold text-white group-hover:text-violet-250 transition-colors leading-tight">
                        {phone.model}
                      </h3>
                    </div>

                    {phone.image_url && (
                      <div className="h-40 w-full relative flex items-center justify-center p-3 bg-zinc-950/40 rounded-2xl border border-zinc-900/50 group-hover:scale-[1.03] transition duration-500">
                        <img src={phone.image_url} alt="" className="h-full object-contain" />
                      </div>
                    )}
                  </Link>

                  <div className="flex items-center justify-between border-t border-zinc-900/80 pt-4 mt-5">
                    <span className="text-sm font-black text-white">{formatPrice(phone.price)}</span>
                    <Link
                      href={`/phones/${phone.slug}`}
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-violet-400 hover:text-white transition tracking-wider"
                    >
                      View Specs
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. COMPARISONS TAB */}
      {activeTab === "comparisons" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-zinc-550">My Saved Comparisons</span>
            {comparisons.length > 0 && (
              <button 
                onClick={clearComparisons}
                className="text-xs text-rose-400 hover:text-rose-350 font-bold flex items-center gap-1 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Comparisons
              </button>
            )}
          </div>

          {comparisons.length === 0 ? (
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-20 text-center">
              <ArrowLeftRight className="h-10 w-10 text-zinc-750 mx-auto mb-4" />
              <h3 className="text-base font-bold text-zinc-300">No Saved Comparisons</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2 leading-relaxed">
                Run side-by-side specs audits in our comparison tool and save them to access them here instantly.
              </p>
              <Link 
                href="/compare"
                className="inline-flex items-center gap-1.5 text-xs font-black text-violet-400 hover:text-violet-300 transition mt-6 bg-violet-500/10 border border-violet-500/25 px-5 py-3 rounded-2xl"
              >
                Open Compare Tool
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {comparisons.map((item, idx) => {
                const phone1 = phones.find(p => String(p.id) === item.phone1Id);
                const phone2 = phones.find(p => String(p.id) === item.phone2Id);
                
                if (!phone1 || !phone2) return null;

                return (
                  <div 
                    key={idx}
                    className="group rounded-3xl border border-zinc-900 bg-zinc-900/15 p-5 backdrop-blur-sm hover:border-zinc-800 transition duration-300 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3.5 mb-4">
                      <span className="text-[10px] font-bold text-zinc-550">Saved Comparison</span>
                      <button 
                        onClick={() => removeComparison(item.phone1Id, item.phone2Id)}
                        className="text-zinc-650 hover:text-rose-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 text-center space-y-2">
                        {phone1.image_url && (
                          <div className="h-16 w-16 mx-auto relative flex items-center justify-center p-1 bg-zinc-950 rounded-xl border border-zinc-900">
                            <img src={phone1.image_url} alt="" className="h-full object-contain" />
                          </div>
                        )}
                        <div>
                          <span className="text-[9px] uppercase font-bold text-zinc-500 block leading-none">{phone1.brand}</span>
                          <span className="text-xs font-bold text-white block mt-0.5 truncate">{phone1.model}</span>
                        </div>
                      </div>

                      <span className="text-xs font-extrabold text-zinc-600">VS</span>

                      <div className="flex-1 text-center space-y-2">
                        {phone2.image_url && (
                          <div className="h-16 w-16 mx-auto relative flex items-center justify-center p-1 bg-zinc-950 rounded-xl border border-zinc-900">
                            <img src={phone2.image_url} alt="" className="h-full object-contain" />
                          </div>
                        )}
                        <div>
                          <span className="text-[9px] uppercase font-bold text-zinc-500 block leading-none">{phone2.brand}</span>
                          <span className="text-xs font-bold text-white block mt-0.5 truncate">{phone2.model}</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/compare?phone1=${phone1.id}&phone2=${phone2.id}`}
                      className="mt-6 w-full rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-center py-3 text-xs font-bold text-violet-400 hover:text-white transition flex items-center justify-center gap-1.5"
                    >
                      Audit side-by-side
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-zinc-550">Phones I Viewed Recently</span>
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="text-xs text-rose-400 hover:text-rose-350 font-bold flex items-center gap-1 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear History
              </button>
            )}
          </div>

          {historyPhones.length === 0 ? (
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-20 text-center">
              <History className="h-10 w-10 text-zinc-750 mx-auto mb-4" />
              <h3 className="text-base font-bold text-zinc-300">No Browsing History</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2 leading-relaxed">
                SmartPick AI tracks smartphones you click to view specs to make comparing them later seamless.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {historyPhones.map(phone => (
                <Link
                  key={phone.id}
                  href={`/phones/${phone.slug}`}
                  className="group block rounded-2xl border border-zinc-900 bg-zinc-900/10 hover:border-zinc-800 p-4 transition duration-200 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    {phone.image_url && (
                      <div className="h-12 w-12 flex items-center justify-center p-1 bg-zinc-950 border border-zinc-900 rounded-xl shrink-0 group-hover:scale-105 transition">
                        <img src={phone.image_url} alt="" className="h-full object-contain" />
                      </div>
                    )}
                    <div>
                      <span className="text-[9px] uppercase font-bold text-violet-400 block leading-none">{phone.brand}</span>
                      <h4 className="text-xs font-black text-white block mt-0.5 group-hover:text-violet-250 transition">{phone.model}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs font-bold text-zinc-400">{formatPrice(phone.price)}</span>
                    <span className="text-zinc-650 group-hover:text-white transition">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
