"use client";

import { useEffect, useState } from "react";

type StorePrice = {
  name: string;
  price: number;
  link: string;
  source: "scraped" | "fallback";
  confidence: number;
  available?: boolean;
};

type PricesData = {
  product: string;
  stores: StorePrice[];
};

export function LivePrices({
  query,
  amazonLink,
  flipkartLink,
}: {
  query: string;
  amazonLink?: string;
  flipkartLink?: string;
}) {
  const [data, setData] = useState<PricesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/prices?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((resData) => {
        if (active) {
          setData(resData);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch live prices:", err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  if (loading) {
    return (
      <div className="mt-6 space-y-3 animate-pulse">
        <div className="h-4 bg-zinc-800/60 rounded w-1/3"></div>
        <div className="flex gap-3">
          <div className="h-10 bg-zinc-800/60 rounded flex-1"></div>
          <div className="h-10 bg-zinc-800/60 rounded flex-1"></div>
        </div>
      </div>
    );
  }

  if (!data || !data.stores || data.stores.length === 0) {
    return null;
  }

  const getStoreLink = (storeName: string, defaultLink: string) => {
    if (storeName.toLowerCase() === "amazon" && amazonLink && amazonLink.trim() !== "") {
      return amazonLink;
    }
    if (storeName.toLowerCase() === "flipkart" && flipkartLink && flipkartLink.trim() !== "") {
      return flipkartLink;
    }
    return defaultLink;
  };

  return (
    <div className="mt-6 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
        Live Online Prices
      </span>
      <div className="flex flex-col sm:flex-row gap-3">
        {data.stores.map((store) => {
          const isAmazon = store.name.toLowerCase() === "amazon";
          const link = getStoreLink(store.name, store.link);
          const isAvailable = store.available !== false;

          if (!isAvailable) {
            return (
              <div
                key={store.name}
                className="flex-1 text-center rounded-xl px-4 py-2.5 text-xs font-bold border border-zinc-850 bg-zinc-900/30 text-zinc-500 flex flex-col justify-center items-center gap-1 cursor-not-allowed select-none shadow-inner"
              >
                <div className="flex items-center gap-1.5">
                  <span className="opacity-80">{store.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-650" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Out of Stock
                  </span>
                  <span className="text-[8px] font-medium tracking-wide uppercase text-zinc-600 mt-0.5">
                    Currently Unavailable
                  </span>
                </div>
              </div>
            );
          }

          const bgClass = isAmazon
            ? "bg-orange-600/90 hover:bg-orange-650 text-white"
            : "bg-blue-600/90 hover:bg-blue-650 text-white";
          const shadowClass = isAmazon ? "shadow-orange-950/20" : "shadow-blue-950/20";
          const isLive = store.source === "scraped";
          
          return (
            <a
              key={store.name}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 text-center rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-300 hover:scale-[1.02] shadow-lg ${bgClass} ${shadowClass} active:scale-95 flex flex-col justify-center items-center gap-1.5`}
            >
              <div className="flex items-center gap-1.5">
                <span>Buy on {store.name}</span>
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                  isLive ? "bg-emerald-400 animate-ping" : "bg-zinc-400"
                }`} />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[11px] opacity-95 font-extrabold">
                  {store.price > 0
                    ? `₹${store.price.toLocaleString("en-IN")}`
                    : "Check Price"}
                </span>
                <span className={`text-[8px] font-bold tracking-wide uppercase mt-0.5 opacity-90`}>
                  {isLive ? "Live Price ✓" : "Estimated Price"}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
