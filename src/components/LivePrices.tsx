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
  phoneId,
  marketStatus,
  amazonLink,
  flipkartLink,
}: {
  query: string;
  phoneId?: string | number;
  marketStatus?: string;
  amazonLink?: string;
  flipkartLink?: string;
}) {
  const [data, setData] = useState<PricesData | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal and Alert States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Handle toast timeout
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleNotifyMe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !phoneId) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/stock-alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_id: phoneId,
          email: email.trim(),
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setIsModalOpen(false);
        setEmail("");
        setToastMessage("We'll notify you when this phone is available again.");
      } else {
        setErrorMessage(result.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setErrorMessage("Failed to subscribe. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

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

  // Determine if out of stock
  const allStoresUnavailable = data && data.stores && data.stores.length > 0 && data.stores.every(s => s.available === false);
  const isOutOfStock = marketStatus === "OUT_OF_STOCK" || allStoresUnavailable;

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
    <div className="mt-6 space-y-3 relative">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
        Live Online Prices
      </span>

      {isOutOfStock ? (
        /* Out of Stock Banner */
        <div className="rounded-2xl border border-zinc-850 bg-zinc-900/30 p-6 backdrop-blur-sm flex flex-col items-center justify-center text-center gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
              <span>❌</span> Currently unavailable
            </span>
            <span className="text-xs text-zinc-400 flex items-center gap-1.5 justify-center">
              <span>🔔</span> We'll notify you when this phone is back in stock.
            </span>
          </div>
          {phoneId && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-1 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition duration-300 hover:scale-[1.02] hover:from-violet-500 hover:to-fuchsia-500 active:scale-95"
            >
              Notify Me
            </button>
          )}
        </div>
      ) : (
        /* Regular Store Grid */
        <div className="flex flex-col sm:flex-row gap-3">
          {data?.stores.map((store) => {
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
      )}

      {/* Subscription Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative max-w-sm w-full mx-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setErrorMessage(null);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
              aria-label="Close modal"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center space-y-2">
              <span className="text-2xl">🔔</span>
              <h3 className="text-base font-bold text-white">Back in Stock Alerts</h3>
              <p className="text-xs text-zinc-400">
                We'll email you the moment this smartphone becomes available on Amazon or Flipkart.
              </p>
            </div>

            <form onSubmit={handleNotifyMe} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label htmlFor="notify-email" className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">
                  Email Address
                </label>
                <input
                  id="notify-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-850 bg-zinc-900/50 py-2.5 px-4 text-white text-sm outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                />
              </div>

              {errorMessage && (
                <p className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  ⚠️ {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-xs font-bold text-white shadow-lg transition duration-300 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95 disabled:opacity-50"
              >
                {submitting ? "Subscribing..." : "Notify Me when Available"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-emerald-500/20 bg-emerald-950/80 px-4 py-3.5 text-xs font-bold text-emerald-300 shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-slideIn">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            ✓
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
