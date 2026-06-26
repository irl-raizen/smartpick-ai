import type { Metadata } from "next";
import Link from "next/link";
import { getPhoneByIdOrSlug, getPhones, generatePhoneSlug, supabase } from "@/src/lib/supabase";
import type { Phone } from "@/src/types/phone";
import { PriceTrendsAndAlerts } from "@/src/components/PriceTrendsAndAlerts";
import { notFound, redirect } from "next/navigation";

// Redesigned premium components
import { PhoneHeroSection } from "@/src/components/PhoneHeroSection";
import { PerformanceCard } from "@/src/components/PerformanceCard";
import { AiReviewCard } from "@/src/components/AiReviewCard";
import { DetailedSpecs } from "@/src/components/DetailedSpecs";
import { SimilarPhonesList } from "@/src/components/SimilarPhonesList";
import { VideoReviews } from "@/src/components/VideoReviews";
import { RecentlyViewed } from "@/src/components/RecentlyViewed";

export const revalidate = 1800; // ISR - Revalidate every 30 minutes

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const phone = await getPhoneByIdOrSlug(slug);

  if (!phone) {
    return {
      title: "Smartphone Not Found - SmartPick AI",
      description: "The requested smartphone specification sheet does not exist in our catalog.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartpickai.vercel.app";
  const canonicalUrl = `${baseUrl}/phones/${generatePhoneSlug(phone.brand, phone.model)}`;
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

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "Recently";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch (e) {
    return "Recently";
  }
}

export default async function PhoneDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Permanent redirect for legacy numeric IDs
  const isNumeric = /^\d+$/.test(slug);
  if (isNumeric) {
    const phone = await getPhoneByIdOrSlug(slug);
    if (phone && phone.slug) {
      redirect(`/phones/${phone.slug}`);
    }
  }

  const phone = await getPhoneByIdOrSlug(slug);

  if (!phone) {
    notFound();
  }

  // Log page view event for analytics
  try {
    (supabase.from("analytics_events") as any).insert({
      event_type: "page_view",
      event_data: {
        id: phone.id,
        slug: phone.slug || slug,
        brand: phone.brand,
        model: phone.model
      }
    }).then(({ error }: any) => {
      if (error) console.warn("Analytics insertion warning:", error.message);
    });
  } catch (e) {
    console.warn("Analytics log error:", e);
  }

  const reviewMarkdown = phone.ai_review && phone.ai_review.trim() !== ""
    ? phone.ai_review
    : generateFallbackReview(phone);

  const { pros: reviewPros, cons: reviewCons, verdict: reviewVerdict } = parseReview(reviewMarkdown);

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
      "url": `${process.env.NEXT_PUBLIC_SITE_URL || "https://smartpickai.vercel.app"}/phones/${generatePhoneSlug(phone.brand, phone.model)}`
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

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${process.env.NEXT_PUBLIC_SITE_URL || "https://smartpickai.vercel.app"}`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Phones",
        "item": `${process.env.NEXT_PUBLIC_SITE_URL || "https://smartpickai.vercel.app"}/phones`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": `${phone.brand} ${phone.model}`,
        "item": `${process.env.NEXT_PUBLIC_SITE_URL || "https://smartpickai.vercel.app"}/phones/${generatePhoneSlug(phone.brand, phone.model)}`
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="min-h-screen bg-zinc-955 text-zinc-100 relative">

        {/* Background Orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute top-1/3 left-10 h-96 w-96 rounded-full bg-fuchsia-600/5 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />
        </div>

        <main className="relative mx-auto max-w-[1400px] px-4 pb-20 pt-10 sm:px-6 lg:px-8">
          {/* Navigation Breadcrumb */}
          <nav className="mb-8 flex items-center justify-between border-b border-zinc-900 pb-4">
            <Link
              href="/phones"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-violet-300"
            >
              ← Back to Catalog
            </Link>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <span>Phones</span>
              <span>/</span>
              <span>{phone.brand}</span>
              <span>/</span>
              <span className="text-zinc-300">{phone.model}</span>
            </div>
          </nav>

          {/* 2-Column Responsive Layout */}
          <div className="grid gap-10 lg:grid-cols-12">
            {/* LEFT COLUMN (Sticky on Desktop) - 35% equivalent (col-span-4) */}
            <div className="lg:col-span-4 lg:sticky lg:top-8 h-fit space-y-8">
              <PhoneHeroSection phone={phone} />
            </div>

            {/* RIGHT COLUMN - 65% equivalent (col-span-8) */}
            <div className="lg:col-span-8 space-y-8">
              {/* Price History Card */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-6 sm:p-8 backdrop-blur-sm shadow-2xl">
                <PriceTrendsAndAlerts
                  phoneId={phone.id}
                  currentPrice={phone.price}
                  model={phone.model}
                />
              </div>

              {/* Performance Ratings */}
              <PerformanceCard
                scoreCamera={phone.score_camera}
                scoreGaming={phone.score_gaming}
                scoreBattery={phone.score_battery}
                displaySpecs={phone.display}
              />

              {/* AI Review */}
              <AiReviewCard
                pros={reviewPros}
                cons={reviewCons}
                verdict={reviewVerdict}
              />

              {/* Full Specifications Grid */}
              <DetailedSpecs phone={phone} formatPrice={formatPrice} />

              {/* Video Reviews */}
              <VideoReviews model={phone.model} brand={phone.brand} />

              {/* Similar Phones Alternatives */}
              <SimilarPhonesList
                phones={relatedPhones}
              />

              {/* Recently Viewed Session Tracker */}
              <RecentlyViewed
                currentPhone={phone}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
