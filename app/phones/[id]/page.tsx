import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPhoneById, getPhones } from "@/src/lib/supabase";
import type { Phone } from "@/src/types/phone";
import { LivePrices } from "@/src/components/LivePrices";
import { PriceTrendsAndAlerts } from "@/src/components/PriceTrendsAndAlerts";

export const revalidate = 1800; // ISR - Revalidate every 30 minutes

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const phone = await getPhoneById(id);

  if (!phone) {
    return {
      title: "Smartphone Not Found - SmartPick AI",
      description: "The requested smartphone specification sheet does not exist in our catalog.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartpick-ai.vercel.app";
  const canonicalUrl = `${baseUrl}/phones/${phone.id}`;
  const imageUrl = phone.image_url && phone.image_url.trim() !== "" ? phone.image_url : undefined;

  const titleText = `${phone.brand} ${phone.model} Price in India (Live) | SmartPick AI`;
  const descText = `Check live Amazon and Flipkart prices, availability, AI review, price history and price alerts for ${phone.brand} ${phone.model}.`;

  return {
    title: titleText,
    description: descText,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: titleText,
      description: descText,
      url: canonicalUrl,
      type: "website",
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: titleText,
      description: descText,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

function parseReview(markdown: string) {
  const pros: string[] = [];
  const cons: string[] = [];
  let verdict = "";

  const lines = markdown.split("\n");
  let currentSection: "pros" | "cons" | "verdict" | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.toLowerCase().includes("pros")) {
      currentSection = "pros";
      continue;
    } else if (trimmed.toLowerCase().includes("cons")) {
      currentSection = "cons";
      continue;
    } else if (trimmed.toLowerCase().includes("verdict")) {
      currentSection = "verdict";
      continue;
    }

    if (currentSection === "pros" && (trimmed.startsWith("-") || trimmed.startsWith("*"))) {
      pros.push(trimmed.slice(1).trim());
    } else if (currentSection === "cons" && (trimmed.startsWith("-") || trimmed.startsWith("*"))) {
      cons.push(trimmed.slice(1).trim());
    } else if (currentSection === "verdict") {
      verdict += (verdict ? " " : "") + trimmed;
    }
  }

  return { pros, cons, verdict };
}

function generateFallbackReview(phone: Phone) {
  const pros: string[] = [];
  const cons: string[] = [];
  
  // Pros
  if (phone.score_camera >= 9) {
    pros.push("Outstanding flagship-tier camera capabilities suitable for professional-grade photography.");
  } else if (phone.score_camera >= 7) {
    pros.push("Reliable camera setup capturing high-detail shots under favorable lighting.");
  } else {
    pros.push("Decent daylight photography suitable for social media sharing.");
  }

  if (phone.score_gaming >= 9) {
    pros.push(`Elite-tier performance with top-end gaming chipsets (${phone.chipset}) and advanced thermal cooling.`);
  } else if (phone.score_gaming >= 7) {
    pros.push(`Smooth, responsive gaming and processing power on popular competitive titles.`);
  } else {
    pros.push("Handles everyday multitasking, social media, and communication apps without issues.");
  }

  if (phone.score_battery >= 9) {
    pros.push(`Excellent battery endurance (${phone.battery}) that easily lasts beyond a full day of heavy use.`);
  } else if (phone.score_battery >= 7) {
    pros.push(`Reliable battery efficiency for standard day-to-day productivity and entertainment.`);
  }

  if (phone.price <= 20000) {
    pros.push("Highly competitive budget pricing representing excellent value for money.");
  } else if (phone.price <= 45000) {
    pros.push("Solid price-to-features balance in the mid-range segment.");
  }

  if (phone.display && (phone.display.includes("120Hz") || phone.display.includes("144Hz") || phone.display.includes("AMOLED") || phone.display.includes("OLED"))) {
    pros.push("Gorgeous high refresh-rate display offers buttery-smooth scrolling and viewing.");
  }

  // Cons
  if (phone.score_camera <= 6) {
    cons.push("Camera setup struggles under low-light, indoor, or high-contrast conditions.");
  }
  if (phone.score_gaming <= 6) {
    cons.push(`Processor (${phone.chipset}) exhibits noticeable throttling during intensive gaming sessions.`);
  }
  if (phone.score_battery <= 7) {
    cons.push(`Modest battery capacity (${phone.battery}) requires regular daily charging intervals.`);
  }
  if (phone.price >= 80000) {
    cons.push("Premium pricing presents a significant financial entry barrier.");
  }
  if (phone.display && !(phone.display.includes("120Hz") || phone.display.includes("144Hz"))) {
    cons.push("Screen lacks high refresh rate support (capped at standard 60Hz/90Hz).");
  }
  if (cons.length === 0) {
    cons.push("Charging speeds are relatively average compared to segment competitors.");
    cons.push("Lacks premium features like wireless charging or reverse charging.");
  }

  // Verdict
  const shiningPoints: string[] = [];
  if (phone.score_camera >= 8) shiningPoints.push("photography");
  if (phone.score_gaming >= 8) shiningPoints.push("gaming speed");
  if (phone.score_battery >= 8) shiningPoints.push("battery backup");

  const highlight = shiningPoints.length > 0 ? shiningPoints.join(" and ") : "overall balance";
  const category = phone.price >= 70000 ? "premium flagship" : phone.price >= 25000 ? "solid mid-ranger" : "budget-friendly utility device";
  const verdict = `The ${phone.brand} ${phone.model} is a standout ${category} that shines in ${highlight}. It is best suited for users looking for a robust, performance-oriented experience.`;

  return `### Pros\n${pros.map(p => `- ${p}`).join('\n')}\n\n### Cons\n${cons.map(c => `- ${c}`).join('\n')}\n\n### Verdict\n${verdict}`;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function ScoreBar({ label, score, colorClass }: { label: string; score: number; colorClass: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400 font-medium">{label}</span>
        <span className={`font-semibold ${colorClass}`}>{score} / 10</span>
      </div>
      <div className="h-3 w-full rounded-full bg-zinc-900 overflow-hidden ring-1 ring-zinc-800/50">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
    </div>
  );
}

export default async function PhoneDetailPage({ params }: PageProps) {
  const { id } = await params;
  const phone = await getPhoneById(id);

  const reviewMarkdown = phone
    ? (phone.ai_review && phone.ai_review.trim() !== ""
      ? phone.ai_review
      : generateFallbackReview(phone))
    : "";

  const { pros: reviewPros, cons: reviewCons, verdict: reviewVerdict } = phone
    ? parseReview(reviewMarkdown)
    : { pros: [], cons: [], verdict: "" };

  if (!phone) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-rose-600/10 blur-3xl" />
        </div>
        <div className="relative text-center max-w-md p-8 rounded-3xl border border-rose-500/20 bg-zinc-900/80 shadow-2xl backdrop-blur-sm">
          <div className="mb-6 inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-1.5 text-sm text-rose-200">
            Error 404
          </div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">Smartphone Not Found</h1>
          <p className="mt-4 text-sm text-zinc-400">
            The device you are looking for does not exist in our catalog or has been removed.
          </p>
          <div className="mt-8">
            <Link
              href="/phones"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-violet-500 hover:to-fuchsia-500"
            >
              Back to Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Related phones engine
  const allPhones = await getPhones();
  const otherPhones = allPhones.filter((p) => p.id !== phone.id);

  const sameBrand = otherPhones.filter((p) => p.brand.toLowerCase() === phone.brand.toLowerCase());
  const differentBrand = otherPhones.filter((p) => p.brand.toLowerCase() !== phone.brand.toLowerCase());

  // Sort by closest price proximity
  sameBrand.sort((a, b) => Math.abs(a.price - phone.price) - Math.abs(b.price - phone.price));
  differentBrand.sort((a, b) => Math.abs(a.price - phone.price) - Math.abs(b.price - phone.price));

  const relatedPhones = [...sameBrand, ...differentBrand].slice(0, 3);

  const ratingValue = ((phone.score_camera + phone.score_gaming + phone.score_battery) / 3).toFixed(1);
  const pageDesc = `Check live Amazon and Flipkart prices, availability, AI review, price history and price alerts for ${phone.brand} ${phone.model}.`;
  
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${phone.brand} ${phone.model}`,
    "image": phone.image_url && phone.image_url.trim() !== "" ? [phone.image_url] : [],
    "description": pageDesc,
    "brand": {
      "@type": "Brand",
      "name": phone.brand
    },
    "offers": {
      "@type": "Offer",
      "price": phone.price,
      "priceCurrency": "INR",
      "availability": phone.market_status === "ACTIVE" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Amazon"
      },
      "url": `${process.env.NEXT_PUBLIC_SITE_URL || "https://smartpick-ai.vercel.app"}/phones/${phone.id}`
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": ratingValue,
      "bestRating": "10",
      "worstRating": "1",
      "ratingCount": 15
    },
    "review": {
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": "SmartPick AI Expert"
      },
      "reviewBody": reviewVerdict || `The ${phone.brand} ${phone.model} is a high-value phone with a solid total performance score.`
    }
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `What is the price of ${phone.brand} ${phone.model} in India?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `The price of ${phone.brand} ${phone.model} in India starts at ₹${phone.price.toLocaleString("en-IN")}. Live pricing and availability are synced from Amazon and Flipkart.`
        }
      },
      {
        "@type": "Question",
        "name": `What is the AI review verdict for ${phone.brand} ${phone.model}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `${reviewVerdict || `The ${phone.brand} ${phone.model} has a camera rating of ${phone.score_camera}/10, gaming rating of ${phone.score_gaming}/10, and battery rating of ${phone.score_battery}/10.`}`
        }
      },
      {
        "@type": "Question",
        "name": `What processor powers the ${phone.brand} ${phone.model}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `The ${phone.brand} ${phone.model} is powered by the ${phone.chipset} processor.`
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Background Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute top-1/3 left-10 h-96 w-96 rounded-full bg-fuchsia-600/5 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <nav className="mb-8 flex items-center justify-between">
          <Link
            href="/phones"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-violet-300"
          >
            ← Back to Catalog
          </Link>
          <Link
            href={`/compare?phone1=${phone.id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200 transition hover:border-violet-500/50 hover:bg-violet-500/20"
          >
            Compare this Phone
          </Link>
        </nav>

        {/* Main Details Card */}
        <section className="grid gap-8 lg:grid-cols-12">
          {/* Left Hero Card (Brand, Model, Price) */}
          <div className="lg:col-span-5 rounded-3xl border border-zinc-900 bg-zinc-900/40 p-8 backdrop-blur-sm flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-violet-600/10 blur-2xl" />
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-violet-400">
                {phone.brand}
              </span>
              <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl flex flex-wrap items-center gap-3">
                <span>{phone.model}</span>
                {phone.active === false && (
                  <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-xs font-bold text-rose-300 uppercase tracking-wider">
                    Out of Stock
                  </span>
                )}
              </h1>
              <p className="mt-4 text-4xl font-extrabold text-white tracking-tight">
                {formatPrice(phone.price)}
              </p>
              <p className="text-xs text-zinc-550 mt-1">MRP (Incl. of all taxes) in India</p>
            </div>

            {phone.image_url && phone.image_url.trim() !== "" && (
              <div className="relative w-full h-52 my-6 rounded-2xl overflow-hidden bg-zinc-950/40 border border-zinc-900/60 p-4 flex items-center justify-center">
                <Image
                  src={phone.image_url}
                  alt={`${phone.brand} ${phone.model}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-contain p-4 transition duration-500 hover:scale-105"
                />
              </div>
            )}

            <div className="space-y-4">
              <div className="rounded-2xl bg-zinc-950/60 p-4 border border-zinc-900/60">
                <span className="text-xs text-zinc-500 uppercase tracking-wider block">Chipset</span>
                <span className="mt-1 font-semibold text-zinc-200 block">{phone.chipset}</span>
              </div>
              <div className="rounded-2xl bg-zinc-950/60 p-4 border border-zinc-900/60">
                <span className="text-xs text-zinc-550 uppercase tracking-wider block">Battery</span>
                <span className="mt-1 font-semibold text-zinc-200 block">{phone.battery}</span>
              </div>
            </div>

            <LivePrices
              query={`${phone.brand} ${phone.model}`}
              phoneId={phone.id}
              marketStatus={phone.market_status}
              amazonLink={phone.amazon_link}
              flipkartLink={phone.flipkart_link}
            />
          </div>

          {/* Right Detailed Specs & Scores Card */}
          <div className="lg:col-span-7 space-y-8">
            {/* Price Trends & Alerts Widget */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/40 p-8 backdrop-blur-sm shadow-2xl">
              <PriceTrendsAndAlerts
                phoneId={phone.id}
                currentPrice={phone.price}
                model={phone.model}
              />
            </div>

            {/* Scores Widget */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/40 p-8 backdrop-blur-sm space-y-6 shadow-2xl">
              <h2 className="text-lg font-bold text-white tracking-wide border-b border-zinc-850 pb-3">
                Performance Ratings
              </h2>
              <div className="space-y-5">
                <ScoreBar label="Camera Performance" score={phone.score_camera} colorClass="from-violet-500 to-fuchsia-500 text-violet-300" />
                <ScoreBar label="Gaming & Processing" score={phone.score_gaming} colorClass="from-emerald-500 to-cyan-500 text-emerald-300" />
                <ScoreBar label="Battery Efficiency" score={phone.score_battery} colorClass="from-amber-500 to-orange-500 text-amber-300" />
              </div>
            </div>

            {/* AI Review Widget */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/40 p-8 backdrop-blur-sm space-y-6 shadow-2xl relative overflow-hidden animate-fadeIn">
              <div className="absolute top-0 right-0 bg-violet-600/10 border-b border-l border-violet-500/20 text-violet-300 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-bl-xl shadow-md flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
                AI Generated Review
              </div>
              
              <h2 className="text-lg font-bold text-white tracking-wide border-b border-zinc-850 pb-3">
                SmartPick AI Insights
              </h2>

              <div className="grid gap-6 md:grid-cols-2 mt-4">
                {/* Pros List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <svg className="h-4.5 w-4.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Pros
                  </h3>
                  <ul className="space-y-2 text-sm text-zinc-350">
                    {reviewPros.map((pro, index) => (
                      <li key={index} className="leading-relaxed flex items-start gap-2">
                        <span className="text-emerald-500 mt-1 shrink-0">•</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cons List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                    <svg className="h-4.5 w-4.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cons
                  </h3>
                  <ul className="space-y-2 text-sm text-zinc-350">
                    {reviewCons.map((con, index) => (
                      <li key={index} className="leading-relaxed flex items-start gap-2">
                        <span className="text-rose-500 mt-1 shrink-0">•</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Verdict */}
              {reviewVerdict && (
                <div className="mt-6 pt-5 border-t border-zinc-850/60 space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-violet-400">
                    Verdict
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-200 bg-zinc-950/40 border border-zinc-900 p-4 rounded-2xl italic">
                    &quot;{reviewVerdict}&quot;
                  </p>
                </div>
              )}
            </div>

            {/* Specifications Widget */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/40 p-8 backdrop-blur-sm space-y-6 shadow-2xl">
              <h2 className="text-lg font-bold text-white tracking-wide border-b border-zinc-850 pb-3">
                Full Specifications
              </h2>
              <dl className="grid gap-y-4 text-sm">
                <div className="grid grid-cols-3 py-2 border-b border-zinc-900">
                  <dt className="text-zinc-500 font-medium">Brand</dt>
                  <dd className="col-span-2 text-zinc-250 font-semibold">{phone.brand}</dd>
                </div>
                <div className="grid grid-cols-3 py-2 border-b border-zinc-900">
                  <dt className="text-zinc-500 font-medium">Model</dt>
                  <dd className="col-span-2 text-zinc-250 font-semibold">{phone.model}</dd>
                </div>
                <div className="grid grid-cols-3 py-2 border-b border-zinc-900">
                  <dt className="text-zinc-500 font-medium">Price</dt>
                  <dd className="col-span-2 text-zinc-250 font-semibold">{formatPrice(phone.price)}</dd>
                </div>
                <div className="grid grid-cols-3 py-2 border-b border-zinc-900">
                  <dt className="text-zinc-500 font-medium">Processor</dt>
                  <dd className="col-span-2 text-zinc-250 font-semibold">{phone.chipset}</dd>
                </div>
                <div className="grid grid-cols-3 py-2 border-b border-zinc-900">
                  <dt className="text-zinc-500 font-medium">Battery Capacity</dt>
                  <dd className="col-span-2 text-zinc-250 font-semibold">{phone.battery}</dd>
                </div>
                {phone.camera && (
                  <div className="grid grid-cols-3 py-2 border-b border-zinc-900">
                    <dt className="text-zinc-500 font-medium">Rear Camera</dt>
                    <dd className="col-span-2 text-zinc-250 font-semibold">{phone.camera}</dd>
                  </div>
                )}
                {phone.display && (
                  <div className="grid grid-cols-3 py-2">
                    <dt className="text-zinc-500 font-medium">Display Specs</dt>
                    <dd className="col-span-2 text-zinc-250 font-semibold">{phone.display}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </section>

        {/* Related Phones Section */}
        {relatedPhones.length > 0 && (
          <section className="mt-16 space-y-6">
            <h2 className="text-2xl font-bold text-white tracking-wide text-center sm:text-left">
              Related Smartphones
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPhones.map((related) => (
                <Link key={related.id} href={`/phones/${related.id}`} className="group block">
                  <article className="h-full rounded-2xl border border-zinc-900 bg-zinc-900/40 p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-zinc-750 hover:bg-zinc-900/60 hover:shadow-xl hover:shadow-violet-950/10">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                          {related.brand}
                        </span>
                        <h3 className="mt-1 text-lg font-bold text-white group-hover:text-violet-200 transition-colors">
                          {related.model}
                        </h3>
                      </div>
                      <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-350 border border-violet-500/20">
                        {formatPrice(related.price)}
                      </span>
                    </div>

                    {related.image_url && related.image_url.trim() !== "" && (
                      <div className="relative w-full h-32 mb-4 rounded-xl overflow-hidden bg-zinc-950/40 border border-zinc-900/60 p-2 flex items-center justify-center">
                        <Image
                          src={related.image_url}
                          alt={`${related.brand} ${related.model}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                          className="object-contain p-2 transition duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}

                    <dl className="space-y-2 text-xs border-t border-zinc-850 pt-3 text-zinc-400">
                      <div className="flex justify-between">
                        <span>Chipset</span>
                        <span className="font-medium text-zinc-250">{related.chipset}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Battery</span>
                        <span className="font-medium text-zinc-250">{related.battery}</span>
                      </div>
                    </dl>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
    </>
  );
}
