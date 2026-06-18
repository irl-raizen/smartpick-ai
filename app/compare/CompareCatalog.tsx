"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Phone } from "@/src/types/phone";
import { SearchableDropdown } from "@/src/components/SearchableDropdown";

type CompareCatalogProps = {
  phones: Phone[];
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function CompareCatalog({ phones }: CompareCatalogProps) {
  const searchParams = useSearchParams();

  // Selected phone IDs
  const [phone1Id, setPhone1Id] = useState("");
  const [phone2Id, setPhone2Id] = useState("");

  // Load from search params on mount
  useEffect(() => {
    const p1 = searchParams.get("phone1");
    const p2 = searchParams.get("phone2");
    if (p1 && phones.some((p) => String(p.id) === p1)) {
      setPhone1Id(p1);
    }
    if (p2 && phones.some((p) => String(p.id) === p2)) {
      setPhone2Id(p2);
    }
  }, [searchParams, phones]);

  // Update URL search parameters
  const updateParams = (p1: string, p2: string) => {
    const params = new URLSearchParams();
    if (p1) params.set("phone1", p1);
    if (p2) params.set("phone2", p2);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  };

  const handlePhone1Change = (id: string) => {
    setPhone1Id(id);
    updateParams(id, phone2Id);
  };

  const handlePhone2Change = (id: string) => {
    setPhone2Id(id);
    updateParams(phone1Id, id);
  };

  // Resolve Phone objects
  const phone1 = phones.find((p) => String(p.id) === phone1Id) || null;
  const phone2 = phones.find((p) => String(p.id) === phone2Id) || null;

  // Calculate Overall Scores (sum of camera + gaming + battery)
  const phone1Overall = phone1 ? phone1.score_camera + phone1.score_gaming + phone1.score_battery : 0;
  const phone2Overall = phone2 ? phone2.score_camera + phone2.score_gaming + phone2.score_battery : 0;

  // Winners helper
  const getWinner = (val1: number, val2: number) => {
    if (val1 > val2) return "phone1";
    if (val2 > val1) return "phone2";
    return "tie";
  };

  const cameraWinner = phone1 && phone2 ? getWinner(phone1.score_camera, phone2.score_camera) : null;
  const gamingWinner = phone1 && phone2 ? getWinner(phone1.score_gaming, phone2.score_gaming) : null;
  const batteryWinner = phone1 && phone2 ? getWinner(phone1.score_battery, phone2.score_battery) : null;
  const priceWinner = phone1 && phone2 ? getWinner(phone2.price, phone1.price) : null; // Lower price wins!
  const overallWinner = phone1 && phone2 ? getWinner(phone1Overall, phone2Overall) : null;

  // Helper to render winner badge
  const renderWinnerBadge = (isWinner: boolean) => {
    if (!isWinner) return null;
    return (
      <span className="ml-2 inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20 shadow-sm animate-pulse">
        Winner
      </span>
    );
  };

  return (
    <div className="space-y-16">
      {/* Searchable Dropdowns */}
      <div className="grid gap-6 sm:grid-cols-2 relative overflow-visible z-20">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/40 p-5 backdrop-blur-sm shadow-xl relative overflow-visible z-20">
          <SearchableDropdown
            id="phone1"
            label="Select Smartphone A"
            placeholder="Search & choose phone..."
            options={phones.map((phone) => ({
              id: String(phone.id),
              label: `${phone.brand} ${phone.model}`,
              sublabel: `₹${phone.price.toLocaleString("en-IN")}`,
              disabled: String(phone.id) === phone2Id,
            }))}
            value={phone1Id}
            onChange={handlePhone1Change}
          />
        </div>
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/40 p-5 backdrop-blur-sm shadow-xl relative overflow-visible z-10">
          <SearchableDropdown
            id="phone2"
            label="Select Smartphone B"
            placeholder="Search & choose phone..."
            options={phones.map((phone) => ({
              id: String(phone.id),
              label: `${phone.brand} ${phone.model}`,
              sublabel: `₹${phone.price.toLocaleString("en-IN")}`,
              disabled: String(phone.id) === phone1Id,
            }))}
            value={phone2Id}
            onChange={handlePhone2Change}
          />
        </div>
      </div>

      {/* Comparison Presentation */}
      {!phone1 || !phone2 ? (
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-16 text-center backdrop-blur-sm">
          <svg className="mx-auto h-12 w-12 text-zinc-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
          <h2 className="text-xl font-semibold text-white">Compare side-by-side</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
            Choose a smartphone in both boxes above to unlock category winner metrics and spec breakdowns.
          </p>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {/* Comparison Cards & Winner Dashboard */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Phone 1 Dashboard */}
            <div className={`rounded-3xl border p-6 backdrop-blur-sm transition duration-300 relative overflow-hidden ${
              overallWinner === "phone1"
                ? "border-violet-500/50 bg-violet-950/10 shadow-lg shadow-violet-950/20"
                : "border-zinc-900 bg-zinc-900/30"
            }`}>
              {overallWinner === "phone1" && (
                <div className="absolute top-0 right-0 bg-violet-600 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-bl-xl shadow-md">
                  Overall Winner
                </div>
              )}
              <span className="text-xs uppercase font-bold text-violet-400">{phone1.brand}</span>
              <h2 className="text-2xl font-bold text-white mt-1">{phone1.model}</h2>
              <p className="text-2xl font-extrabold text-white mt-4">{formatPrice(phone1.price)}</p>

              <div className="mt-6 space-y-3 pt-6 border-t border-zinc-850/60">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Price</span>
                  <span className="font-semibold text-zinc-200">
                    {formatPrice(phone1.price)} {renderWinnerBadge(priceWinner === "phone1")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Camera Score</span>
                  <span className="font-semibold text-zinc-200">
                    {phone1.score_camera}/10 {renderWinnerBadge(cameraWinner === "phone1")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Gaming Score</span>
                  <span className="font-semibold text-zinc-200">
                    {phone1.score_gaming}/10 {renderWinnerBadge(gamingWinner === "phone1")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Battery Score</span>
                  <span className="font-semibold text-zinc-200">
                    {phone1.score_battery}/10 {renderWinnerBadge(batteryWinner === "phone1")}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-zinc-900/60 font-semibold">
                  <span className="text-zinc-400">Total Score</span>
                  <span className="text-fuchsia-300">{phone1Overall} / 30</span>
                </div>
              </div>
            </div>

            {/* Phone 2 Dashboard */}
            <div className={`rounded-3xl border p-6 backdrop-blur-sm transition duration-300 relative overflow-hidden ${
              overallWinner === "phone2"
                ? "border-violet-500/50 bg-violet-950/10 shadow-lg shadow-violet-950/20"
                : "border-zinc-900 bg-zinc-900/30"
            }`}>
              {overallWinner === "phone2" && (
                <div className="absolute top-0 right-0 bg-violet-600 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-bl-xl shadow-md">
                  Overall Winner
                </div>
              )}
              <span className="text-xs uppercase font-bold text-violet-400">{phone2.brand}</span>
              <h2 className="text-2xl font-bold text-white mt-1">{phone2.model}</h2>
              <p className="text-2xl font-extrabold text-white mt-4">{formatPrice(phone2.price)}</p>

              <div className="mt-6 space-y-3 pt-6 border-t border-zinc-850/60">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Price</span>
                  <span className="font-semibold text-zinc-200">
                    {formatPrice(phone2.price)} {renderWinnerBadge(priceWinner === "phone2")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Camera Score</span>
                  <span className="font-semibold text-zinc-200">
                    {phone2.score_camera}/10 {renderWinnerBadge(cameraWinner === "phone2")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Gaming Score</span>
                  <span className="font-semibold text-zinc-200">
                    {phone2.score_gaming}/10 {renderWinnerBadge(gamingWinner === "phone2")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Battery Score</span>
                  <span className="font-semibold text-zinc-200">
                    {phone2.score_battery}/10 {renderWinnerBadge(batteryWinner === "phone2")}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-zinc-900/60 font-semibold">
                  <span className="text-zinc-400">Total Score</span>
                  <span className="text-fuchsia-300">{phone2Overall} / 30</span>
                </div>
              </div>
            </div>
          </div>

          {/* Specifications Table */}
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/40 p-6 backdrop-blur-sm shadow-2xl overflow-hidden">
            <h3 className="text-lg font-bold text-white tracking-wide border-b border-zinc-850 pb-4 mb-4">
              Side-by-Side Specs
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-850/40 text-xs font-bold uppercase tracking-wider text-zinc-500">
                    <th className="py-3 px-4 w-1/4">Specification</th>
                    <th className="py-3 px-4 w-3/8 text-zinc-250 font-bold">{phone1.brand} {phone1.model}</th>
                    <th className="py-3 px-4 w-3/8 text-zinc-250 font-bold">{phone2.brand} {phone2.model}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300 font-medium">
                  <tr>
                    <td className="py-4 px-4 text-zinc-500">Price</td>
                    <td className="py-4 px-4 text-white font-semibold">
                      {formatPrice(phone1.price)} {renderWinnerBadge(priceWinner === "phone1")}
                    </td>
                    <td className="py-4 px-4 text-white font-semibold">
                      {formatPrice(phone2.price)} {renderWinnerBadge(priceWinner === "phone2")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-zinc-500">Processor</td>
                    <td className="py-4 px-4">{phone1.chipset}</td>
                    <td className="py-4 px-4">{phone2.chipset}</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-zinc-500">Battery</td>
                    <td className="py-4 px-4">{phone1.battery}</td>
                    <td className="py-4 px-4">{phone2.battery}</td>
                  </tr>
                  { (phone1.camera || phone2.camera) && (
                    <tr>
                      <td className="py-4 px-4 text-zinc-500">Camera Specs</td>
                      <td className="py-4 px-4">{phone1.camera || "—"}</td>
                      <td className="py-4 px-4">{phone2.camera || "—"}</td>
                    </tr>
                  )}
                  { (phone1.display || phone2.display) && (
                    <tr>
                      <td className="py-4 px-4 text-zinc-500">Display</td>
                      <td className="py-4 px-4">{phone1.display || "—"}</td>
                      <td className="py-4 px-4">{phone2.display || "—"}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-4 px-4 text-zinc-500">Camera Rating</td>
                    <td className="py-4 px-4 font-semibold">
                      {phone1.score_camera}/10 {renderWinnerBadge(cameraWinner === "phone1")}
                    </td>
                    <td className="py-4 px-4 font-semibold">
                      {phone2.score_camera}/10 {renderWinnerBadge(cameraWinner === "phone2")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-zinc-500">Gaming Rating</td>
                    <td className="py-4 px-4 font-semibold">
                      {phone1.score_gaming}/10 {renderWinnerBadge(gamingWinner === "phone1")}
                    </td>
                    <td className="py-4 px-4 font-semibold">
                      {phone2.score_gaming}/10 {renderWinnerBadge(gamingWinner === "phone2")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-zinc-500">Battery Rating</td>
                    <td className="py-4 px-4 font-semibold">
                      {phone1.score_battery}/10 {renderWinnerBadge(batteryWinner === "phone1")}
                    </td>
                    <td className="py-4 px-4 font-semibold">
                      {phone2.score_battery}/10 {renderWinnerBadge(batteryWinner === "phone2")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
