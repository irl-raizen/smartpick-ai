"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Sparkles, Trophy, Cpu, Camera, Battery, Monitor, ShieldAlert, ArrowLeftRight, Check, ShoppingBag, Eye, Award } from "lucide-react";
import type { Phone } from "@/src/types/phone";
import { SearchableDropdown } from "@/src/components/SearchableDropdown";
import { LivePrices } from "@/src/components/LivePrices";
import { motion, AnimatePresence } from "framer-motion";
import { calculateWeightedScores } from "@/src/lib/recommendations";

type CompareCatalogProps = {
  phones: Phone[];
  initialPhone1Id?: string;
  initialPhone2Id?: string;
};

function generatePhoneSlug(brand: string, model: string): string {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function CompareCatalog({ phones, initialPhone1Id, initialPhone2Id }: CompareCatalogProps) {
  const searchParams = useSearchParams();

  // Selected phone IDs
  const [phone1Id, setPhone1Id] = useState(initialPhone1Id || "");
  const [phone2Id, setPhone2Id] = useState(initialPhone2Id || "");
  const [isStickyHeaderVisible, setIsStickyHeaderVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Monitor scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      if (triggerRef.current) {
        const top = triggerRef.current.getBoundingClientRect().top;
        setIsStickyHeaderVisible(top < 0);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load from search params on mount
  useEffect(() => {
    const p1 = searchParams.get("phone1") || initialPhone1Id;
    const p2 = searchParams.get("phone2") || initialPhone2Id;
    if (p1 && phones.some((p) => String(p.id) === p1)) {
      setPhone1Id(p1);
    }
    if (p2 && phones.some((p) => String(p.id) === p2)) {
      setPhone2Id(p2);
    }
  }, [searchParams, phones, initialPhone1Id, initialPhone2Id]);

  // Update URL to dynamic SEO slugs
  const updateParams = (p1Id: string, p2Id: string) => {
    const p1 = phones.find((p) => String(p.id) === p1Id);
    const p2 = phones.find((p) => String(p.id) === p2Id);
    
    if (p1 && p2) {
      const slug1 = p1.slug || generatePhoneSlug(p1.brand, p1.model);
      const slug2 = p2.slug || generatePhoneSlug(p2.brand, p2.model);
      window.history.pushState(null, "", `/compare/${slug1}-vs-${slug2}`);
    } else if (p1) {
      const slug1 = p1.slug || generatePhoneSlug(p1.brand, p1.model);
      window.history.pushState(null, "", `/compare/${slug1}`);
    } else {
      window.history.pushState(null, "", `/compare`);
    }
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

  // Resolve specs scores
  const p1Scores = phone1 ? calculateWeightedScores(phone1) : null;
  const p2Scores = phone2 ? calculateWeightedScores(phone2) : null;

  const phone1Overall = p1Scores ? p1Scores.overall : 0;
  const phone2Overall = p2Scores ? p2Scores.overall : 0;

  // Winners helper
  const getWinner = (val1: number, val2: number) => {
    if (val1 > val2) return "phone1";
    if (val2 > val1) return "phone2";
    return "tie";
  };

  const cameraWinner = p1Scores && p2Scores ? getWinner(p1Scores.camera.total, p2Scores.camera.total) : null;
  const gamingWinner = p1Scores && p2Scores ? getWinner(p1Scores.gaming.total, p2Scores.gaming.total) : null;
  const batteryWinner = p1Scores && p2Scores ? getWinner(p1Scores.battery.total, p2Scores.battery.total) : null;
  const displayWinner = p1Scores && p2Scores ? getWinner(p1Scores.display.total, p2Scores.display.total) : null;
  const softwareWinner = p1Scores && p2Scores ? getWinner(p1Scores.software.total, p2Scores.software.total) : null;
  const priceWinner = phone1 && phone2 ? getWinner(phone2.price, phone1.price) : null; // Lower price wins!
  const overallWinner = p1Scores && p2Scores ? getWinner(p1Scores.overall, p2Scores.overall) : null;

  // Generate Comparison Summary Recommendation
  const getComparisonSummary = () => {
    if (!phone1 || !phone2 || !p1Scores || !p2Scores) return "";
    
    if (overallWinner === "tie") {
      return `Both the ${phone1.model} and ${phone2.model} match closely with identical total performance score of ${phone1Overall}/10. Choose ${phone1.model} if you favor brand branding, or ${phone2.model} for model aesthetics.`;
    }

    const winner = overallWinner === "phone1" ? phone1 : phone2;
    const loser = overallWinner === "phone1" ? phone2 : phone1;
    const winnerScore = overallWinner === "phone1" ? p1Scores.overall : p2Scores.overall;
    const loserScore = overallWinner === "phone1" ? p2Scores.overall : p1Scores.overall;
    
    let details = "";
    if (winner.price < loser.price) {
      details = `representing superior value as it costs ${formatPrice(loser.price - winner.price)} less while delivering higher overall ratings.`;
    } else {
      details = `costing ${formatPrice(winner.price - loser.price)} more but justifying its premium with flagship specs.`;
    }

    return `Expert Verdict: The ${winner.brand} ${winner.model} is the recommended pick with an overall score of ${winnerScore}/10 (vs ${loserScore}/10), ${details}`;
  };

  // Helper to render winner indicator
  const renderWinnerIndicator = (isWinner: boolean) => {
    if (!isWinner) return null;
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
        <Trophy className="h-3 w-3 fill-current animate-bounce" />
        Winner
      </span>
    );
  };

  return (
    <div className="space-y-12">
      {/* Searchable Dropdowns (col-span-2) */}
      <div className="grid gap-6 sm:grid-cols-2 relative z-20">
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/25 p-5 backdrop-blur-sm shadow-xl relative z-20">
          <SearchableDropdown
            id="phone1"
            label="Smartphone A"
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
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/25 p-5 backdrop-blur-sm shadow-xl relative z-10">
          <SearchableDropdown
            id="phone2"
            label="Smartphone B"
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

      {/* Comparison View Trigger Anchor */}
      <div ref={triggerRef} className="h-1" />

      {/* Comparison Content */}
      {!phone1 || !phone2 || !p1Scores || !p2Scores ? (
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/15 p-20 text-center backdrop-blur-sm flex flex-col justify-center items-center">
          <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-550">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Compare Side-by-Side</h2>
          <p className="mt-2 text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Please select two smartphones using the dropdowns above to initiate full hardware and score comparisons.
          </p>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Comparison Cards & Winner Dashboard */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Phone 1 Card */}
            <div className={`rounded-3xl border p-6 backdrop-blur-sm transition relative overflow-hidden flex flex-col justify-between ${
              overallWinner === "phone1"
                ? "border-violet-500/40 bg-violet-950/10 shadow-2xl shadow-violet-950/20"
                : "border-zinc-900 bg-zinc-900/20"
            }`}>
              {overallWinner === "phone1" && (
                <div className="absolute top-0 right-0 bg-violet-600 text-white text-[9px] uppercase font-black tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-md z-10 flex items-center gap-1">
                  <Trophy className="h-3 w-3 fill-current" />
                  Overall Winner
                </div>
              )}
              
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold text-violet-400">{phone1.brand}</span>
                <h2 className="text-2xl font-black text-white leading-tight">{phone1.model}</h2>
                <span className="text-2xl font-black text-white block">{formatPrice(phone1.price)}</span>

                {phone1.image_url && (
                  <div className="relative w-full h-44 rounded-2xl bg-zinc-950/50 border border-zinc-900/60 p-3 flex items-center justify-center overflow-hidden">
                    <img
                      src={phone1.image_url}
                      alt=""
                      className="h-full object-contain p-2 hover:scale-[1.03] transition duration-500"
                    />
                  </div>
                )}
              </div>

              <LivePrices
                query={`${phone1.brand} ${phone1.model}`}
                amazonLink={phone1.amazon_link}
                flipkartLink={phone1.flipkart_link}
              />
            </div>

            {/* Phone 2 Card */}
            <div className={`rounded-3xl border p-6 backdrop-blur-sm transition relative overflow-hidden flex flex-col justify-between ${
              overallWinner === "phone2"
                ? "border-violet-500/40 bg-violet-950/10 shadow-2xl shadow-violet-950/20"
                : "border-zinc-900 bg-zinc-900/20"
            }`}>
              {overallWinner === "phone2" && (
                <div className="absolute top-0 right-0 bg-violet-600 text-white text-[9px] uppercase font-black tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-md z-10 flex items-center gap-1">
                  <Trophy className="h-3 w-3 fill-current" />
                  Overall Winner
                </div>
              )}
              
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold text-violet-400">{phone2.brand}</span>
                <h2 className="text-2xl font-black text-white leading-tight">{phone2.model}</h2>
                <span className="text-2xl font-black text-white block">{formatPrice(phone2.price)}</span>

                {phone2.image_url && (
                  <div className="relative w-full h-44 rounded-2xl bg-zinc-950/50 border border-zinc-900/60 p-3 flex items-center justify-center overflow-hidden">
                    <img
                      src={phone2.image_url}
                      alt=""
                      className="h-full object-contain p-2 hover:scale-[1.03] transition duration-500"
                    />
                  </div>
                )}
              </div>

              <LivePrices
                query={`${phone2.brand} ${phone2.model}`}
                amazonLink={phone2.amazon_link}
                flipkartLink={phone2.flipkart_link}
              />
            </div>

          </div>

          {/* Expert Verdict Card */}
          <div className="rounded-3xl border border-zinc-900 bg-gradient-to-r from-violet-900/20 to-fuchsia-900/10 p-6 backdrop-blur-sm flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400 shrink-0">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-extrabold tracking-widest text-violet-300 block">AI Summary Verdict</span>
              <p className="text-sm font-semibold text-zinc-200 mt-1 leading-relaxed">
                {getComparisonSummary()}
              </p>
            </div>
          </div>

          {/* Graphical Score Comparison Bars */}
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/15 p-6 sm:p-8 space-y-6">
            <h3 className="text-lg font-black text-white tracking-tight border-b border-zinc-900 pb-4">
              AI Ratings Breakdown
            </h3>

            <div className="space-y-5">
              {/* Camera Score Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-450">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider">
                    <Camera className="h-4 w-4 text-violet-400" />
                    Camera Performance
                  </span>
                  <div className="flex gap-4">
                    <span className={cameraWinner === "phone1" ? "text-white" : ""}>{phone1.model}: {p1Scores.camera.total}/10</span>
                    <span className={cameraWinner === "phone2" ? "text-white" : ""}>{phone2.model}: {p2Scores.camera.total}/10</span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-violet-500 border-r border-zinc-950 transition-all duration-500"
                    style={{ width: `${(p1Scores.camera.total / 20) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-fuchsia-500 transition-all duration-500"
                    style={{ width: `${(p2Scores.camera.total / 20) * 100}%` }}
                  />
                </div>
              </div>

              {/* Gaming Score Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-450">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider">
                    <Cpu className="h-4 w-4 text-emerald-400" />
                    Gaming Speed & Chipset
                  </span>
                  <div className="flex gap-4">
                    <span className={gamingWinner === "phone1" ? "text-white" : ""}>{phone1.model}: {p1Scores.gaming.total}/10</span>
                    <span className={gamingWinner === "phone2" ? "text-white" : ""}>{phone2.model}: {p2Scores.gaming.total}/10</span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-emerald-500 border-r border-zinc-950 transition-all duration-500"
                    style={{ width: `${(p1Scores.gaming.total / 20) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-teal-500 transition-all duration-500"
                    style={{ width: `${(p2Scores.gaming.total / 20) * 100}%` }}
                  />
                </div>
              </div>

              {/* Battery Score Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-450">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider">
                    <Battery className="h-4 w-4 text-amber-400" />
                    Battery Endurance
                  </span>
                  <div className="flex gap-4">
                    <span className={batteryWinner === "phone1" ? "text-white" : ""}>{phone1.model}: {p1Scores.battery.total}/10</span>
                    <span className={batteryWinner === "phone2" ? "text-white" : ""}>{phone2.model}: {p2Scores.battery.total}/10</span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-amber-500 border-r border-zinc-950 transition-all duration-500"
                    style={{ width: `${(p1Scores.battery.total / 20) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${(p2Scores.battery.total / 20) * 100}%` }}
                  />
                </div>
              </div>

              {/* Display Score Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-450">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider">
                    <Monitor className="h-4 w-4 text-blue-450" />
                    Display Quality
                  </span>
                  <div className="flex gap-4">
                    <span className={displayWinner === "phone1" ? "text-white" : ""}>{phone1.model}: {p1Scores.display.total}/10</span>
                    <span className={displayWinner === "phone2" ? "text-white" : ""}>{phone2.model}: {p2Scores.display.total}/10</span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-blue-500 border-r border-zinc-950 transition-all duration-500"
                    style={{ width: `${(p1Scores.display.total / 20) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${(p2Scores.display.total / 20) * 100}%` }}
                  />
                </div>
              </div>

              {/* Software Score Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-450">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider">
                    <Award className="h-4 w-4 text-pink-400" />
                    Software & Support Updates
                  </span>
                  <div className="flex gap-4">
                    <span className={softwareWinner === "phone1" ? "text-white" : ""}>{phone1.model}: {p1Scores.software.total}/10</span>
                    <span className={softwareWinner === "phone2" ? "text-white" : ""}>{phone2.model}: {p2Scores.software.total}/10</span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-pink-500 border-r border-zinc-950 transition-all duration-500"
                    style={{ width: `${(p1Scores.software.total / 20) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-rose-500 transition-all duration-500"
                    style={{ width: `${(p2Scores.software.total / 20) * 100}%` }}
                  />
                </div>
              </div>

              {/* Overall Score Bar */}
              <div className="space-y-2 pt-2 border-t border-zinc-900">
                <div className="flex justify-between text-xs font-bold text-zinc-450">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider">
                    <Trophy className="h-4 w-4 text-violet-400" />
                    Overall Performance Score
                  </span>
                  <div className="flex gap-4">
                    <span className={overallWinner === "phone1" ? "text-white font-extrabold" : ""}>{phone1.model}: {phone1Overall}/10</span>
                    <span className={overallWinner === "phone2" ? "text-white font-extrabold" : ""}>{phone2.model}: {phone2Overall}/10</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-650 border-r border-zinc-950 transition-all duration-500"
                    style={{ width: `${(phone1Overall / 20) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-gradient-to-r from-fuchsia-600 to-pink-500 transition-all duration-500"
                    style={{ width: `${(phone2Overall / 20) * 100}%` }}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Specifications Table */}
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-6 sm:p-8 backdrop-blur-sm shadow-2xl overflow-hidden">
            <h3 className="text-lg font-black text-white tracking-tight border-b border-zinc-900 pb-4 mb-4">
              Side-by-Side Specifications
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-850/40 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                    <th className="py-3 px-4 w-1/4">Specification</th>
                    <th className="py-3 px-4 w-3/8 text-zinc-200 font-black">{phone1.brand} {phone1.model}</th>
                    <th className="py-3 px-4 w-3/8 text-zinc-200 font-black">{phone2.brand} {phone2.model}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300 font-medium">
                  {/* Price */}
                  <tr className="hover:bg-zinc-900/25 transition">
                    <td className="py-4.5 px-4 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">Price</td>
                    <td className={`py-4.5 px-4 font-bold ${priceWinner === "phone1" ? "bg-emerald-500/5 text-emerald-400" : ""}`}>
                      {formatPrice(phone1.price)} {renderWinnerIndicator(priceWinner === "phone1")}
                    </td>
                    <td className={`py-4.5 px-4 font-bold ${priceWinner === "phone2" ? "bg-emerald-500/5 text-emerald-400" : ""}`}>
                      {formatPrice(phone2.price)} {renderWinnerIndicator(priceWinner === "phone2")}
                    </td>
                  </tr>
                  {/* Processor */}
                  <tr className="hover:bg-zinc-900/25 transition">
                    <td className="py-4.5 px-4 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">Processor</td>
                    <td className="py-4.5 px-4">{phone1.processor || phone1.chipset}</td>
                    <td className="py-4.5 px-4">{phone2.processor || phone2.chipset}</td>
                  </tr>
                  {/* RAM */}
                  <tr className="hover:bg-zinc-900/25 transition">
                    <td className="py-4.5 px-4 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">RAM Size</td>
                    <td className="py-4.5 px-4">{phone1.ram || "N/A"}</td>
                    <td className="py-4.5 px-4">{phone2.ram || "N/A"}</td>
                  </tr>
                  {/* Storage */}
                  <tr className="hover:bg-zinc-900/25 transition">
                    <td className="py-4.5 px-4 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">Storage</td>
                    <td className="py-4.5 px-4">{phone1.storage || "N/A"}</td>
                    <td className="py-4.5 px-4">{phone2.storage || "N/A"}</td>
                  </tr>
                  {/* Battery */}
                  <tr className="hover:bg-zinc-900/25 transition">
                    <td className="py-4.5 px-4 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">Battery</td>
                    <td className="py-4.5 px-4">{phone1.battery} mAh</td>
                    <td className="py-4.5 px-4">{phone2.battery} mAh</td>
                  </tr>
                  {/* Camera */}
                  <tr className="hover:bg-zinc-900/25 transition">
                    <td className="py-4.5 px-4 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">Camera</td>
                    <td className="py-4.5 px-4 leading-relaxed">{phone1.camera || "—"}</td>
                    <td className="py-4.5 px-4 leading-relaxed">{phone2.camera || "—"}</td>
                  </tr>
                  {/* Display */}
                  <tr className="hover:bg-zinc-900/25 transition">
                    <td className="py-4.5 px-4 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">Display</td>
                    <td className="py-4.5 px-4 leading-relaxed">{phone1.display || "—"}</td>
                    <td className="py-4.5 px-4 leading-relaxed">{phone2.display || "—"}</td>
                  </tr>
                  {/* OS */}
                  <tr className="hover:bg-zinc-900/25 transition">
                    <td className="py-4.5 px-4 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">OS</td>
                    <td className="py-4.5 px-4">{phone1.os || "N/A"}</td>
                    <td className="py-4.5 px-4">{phone2.os || "N/A"}</td>
                  </tr>
                  {/* Camera Score */}
                  <tr className="hover:bg-zinc-900/25 transition">
                    <td className="py-4.5 px-4 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">Camera Score</td>
                    <td className={`py-4.5 px-4 font-bold ${cameraWinner === "phone1" ? "bg-emerald-500/5 text-emerald-400" : ""}`}>
                      {p1Scores.camera.total}/10 {renderWinnerIndicator(cameraWinner === "phone1")}
                    </td>
                    <td className={`py-4.5 px-4 font-bold ${cameraWinner === "phone2" ? "bg-emerald-500/5 text-emerald-400" : ""}`}>
                      {p2Scores.camera.total}/10 {renderWinnerIndicator(cameraWinner === "phone2")}
                    </td>
                  </tr>
                  {/* Gaming Score */}
                  <tr className="hover:bg-zinc-900/25 transition">
                    <td className="py-4.5 px-4 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">Gaming Score</td>
                    <td className={`py-4.5 px-4 font-bold ${gamingWinner === "phone1" ? "bg-emerald-500/5 text-emerald-400" : ""}`}>
                      {p1Scores.gaming.total}/10 {renderWinnerIndicator(gamingWinner === "phone1")}
                    </td>
                    <td className={`py-4.5 px-4 font-bold ${gamingWinner === "phone2" ? "bg-emerald-500/5 text-emerald-400" : ""}`}>
                      {p2Scores.gaming.total}/10 {renderWinnerIndicator(gamingWinner === "phone2")}
                    </td>
                  </tr>
                  {/* Battery Score */}
                  <tr className="hover:bg-zinc-900/25 transition">
                    <td className="py-4.5 px-4 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">Battery Score</td>
                    <td className={`py-4.5 px-4 font-bold ${batteryWinner === "phone1" ? "bg-emerald-500/5 text-emerald-400" : ""}`}>
                      {p1Scores.battery.total}/10 {renderWinnerIndicator(batteryWinner === "phone1")}
                    </td>
                    <td className={`py-4.5 px-4 font-bold ${batteryWinner === "phone2" ? "bg-emerald-500/5 text-emerald-400" : ""}`}>
                      {p2Scores.battery.total}/10 {renderWinnerIndicator(batteryWinner === "phone2")}
                    </td>
                  </tr>
                  {/* Display Score */}
                  <tr className="hover:bg-zinc-900/25 transition">
                    <td className="py-4.5 px-4 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">Display Score</td>
                    <td className={`py-4.5 px-4 font-bold ${displayWinner === "phone1" ? "bg-emerald-500/5 text-emerald-400" : ""}`}>
                      {p1Scores.display.total}/10 {renderWinnerIndicator(displayWinner === "phone1")}
                    </td>
                    <td className={`py-4.5 px-4 font-bold ${displayWinner === "phone2" ? "bg-emerald-500/5 text-emerald-400" : ""}`}>
                      {p2Scores.display.total}/10 {renderWinnerIndicator(displayWinner === "phone2")}
                    </td>
                  </tr>
                  {/* Software Score */}
                  <tr className="hover:bg-zinc-900/25 transition">
                    <td className="py-4.5 px-4 text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">Software Score</td>
                    <td className={`py-4.5 px-4 font-bold ${softwareWinner === "phone1" ? "bg-emerald-500/5 text-emerald-400" : ""}`}>
                      {p1Scores.software.total}/10 {renderWinnerIndicator(softwareWinner === "phone1")}
                    </td>
                    <td className={`py-4.5 px-4 font-bold ${softwareWinner === "phone2" ? "bg-emerald-500/5 text-emerald-400" : ""}`}>
                      {p2Scores.software.total}/10 {renderWinnerIndicator(softwareWinner === "phone2")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. STICKY HEADER FOR SCROLL */}
      <AnimatePresence>
        {isStickyHeaderVisible && phone1 && phone2 && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            transition={{ duration: 0.3 }}
            className="fixed top-16 left-0 right-0 z-40 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md px-4 py-3 shadow-xl hidden md:block"
          >
            <div className="mx-auto max-w-6xl flex items-center justify-between gap-6">
              <div className="flex-1 flex items-center gap-3">
                {phone1.image_url && (
                  <div className="h-8 w-8 relative flex items-center justify-center p-0.5 bg-zinc-900 rounded">
                    <img src={phone1.image_url} alt="" className="h-full object-contain" />
                  </div>
                )}
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-500 block leading-none">{phone1.brand}</span>
                  <span className="text-xs font-bold text-white block">{phone1.model}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-zinc-500 font-extrabold text-xs">
                <span>VS</span>
              </div>

              <div className="flex-1 flex items-center gap-3 justify-end">
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 block leading-none">{phone2.brand}</span>
                  <span className="text-xs font-bold text-white block">{phone2.model}</span>
                </div>
                {phone2.image_url && (
                  <div className="h-8 w-8 relative flex items-center justify-center p-0.5 bg-zinc-900 rounded">
                    <img src={phone2.image_url} alt="" className="h-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
