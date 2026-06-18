"use client";

import { useEffect, useState } from "react";

type StorePrice = {
  name: string;
  price: number;
  link: string;
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
          const bgClass = isAmazon
            ? "bg-orange-600/90 hover:bg-orange-650 text-white"
            : "bg-blue-600/90 hover:bg-blue-650 text-white";
          const shadowClass = isAmazon ? "shadow-orange-950/20" : "shadow-blue-950/20";
          
          return (
            <a
              key={store.name}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 text-center rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-300 hover:scale-[1.02] shadow-lg ${bgClass} ${shadowClass} active:scale-95 flex flex-col justify-center items-center gap-0.5`}
            >
              <span>Buy on {store.name}</span>
              <span className="text-[10px] opacity-90 font-medium">
                {store.price > 0
                  ? `₹${store.price.toLocaleString("en-IN")}`
                  : "Check Price"}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
