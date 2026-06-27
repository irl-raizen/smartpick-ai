import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://smartpickai.vercel.app"),
  title: {
    default: "SmartPick AI - Find & Compare Smartphones",
    template: "%s | SmartPick AI"
  },
  description: "AI-powered smartphone recommendations and side-by-side comparison engine.",
  alternates: {
    canonical: "./",
  },
  openGraph: {
    title: "SmartPick AI - Find & Compare Smartphones",
    description: "AI-powered smartphone recommendations and side-by-side comparison engine.",
    url: "./",
    siteName: "SmartPick AI",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartPick AI - Find & Compare Smartphones",
    description: "AI-powered smartphone recommendations and side-by-side comparison engine.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "wtBknhQ0EFHv83LuvD9ImK3GV91viO2CLhxJuhSuvb4"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SmartPick AI",
    "url": "https://smartpickai.vercel.app",
    "logo": "https://smartpickai.vercel.app/logo.png"
  };

  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SmartPick AI",
    "url": "https://smartpickai.vercel.app",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://smartpickai.vercel.app/phones?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-150">
        <header className="sticky top-0 z-50 w-full border-b border-zinc-900/60 bg-zinc-950/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-white text-lg tracking-tight hover:opacity-90 transition duration-300">
              <span className="h-7 w-7 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-650 to-fuchsia-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-violet-900/20 ring-1 ring-violet-500/30">SP</span>
              <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">SmartPick</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 font-extrabold text-[9px] uppercase tracking-widest bg-zinc-900/80 border border-zinc-800 px-1.5 py-0.5 rounded-md">AI</span>
            </Link>
            <nav className="flex items-center gap-5 sm:gap-7">
              <Link href="/" className="text-xs sm:text-sm font-bold text-zinc-400 hover:text-white transition duration-300">
                Home
              </Link>
              <Link href="/phones" className="text-xs sm:text-sm font-bold text-zinc-400 hover:text-white transition duration-300">
                Browse
              </Link>
              <Link href="/compare" className="text-xs sm:text-sm font-bold text-zinc-400 hover:text-white transition duration-300">
                Compare
              </Link>
              <Link href="/best-deals" className="text-xs sm:text-sm font-bold text-zinc-400 hover:text-white transition duration-300 flex items-center gap-1">
                Deals
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              </Link>
              <Link href="/chat" className="text-xs sm:text-sm font-bold text-zinc-400 hover:text-white transition duration-300">
                Chat
              </Link>
            </nav>
          </div>
        </header>

        <div className="flex-1 flex flex-col">
          {children}
        </div>

        {/* Premium Footer */}
        <footer className="border-t border-zinc-900 bg-zinc-950/80 py-12 sm:py-16 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 pb-12 border-b border-zinc-900">
              {/* Col 1: About */}
              <div className="col-span-2 space-y-4">
                <Link href="/" className="flex items-center gap-2 font-bold text-white text-lg tracking-tight hover:opacity-90">
                  <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-650 to-fuchsia-600 flex items-center justify-center text-[9px] font-black text-white shadow-sm ring-1 ring-violet-500/30">SP</span>
                  <span>SmartPick AI</span>
                </Link>
                <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
                  Next-generation smartphone intelligence platform. Find, compare, track price trends, and get AI-powered shopping recommendations instantly.
                </p>
                <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2">
                  <span>© {new Date().getFullYear()} SmartPick AI.</span>
                  <span>All rights reserved.</span>
                </div>
              </div>

              {/* Col 2: Services */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-300">Features</h4>
                <ul className="space-y-2.5 text-sm">
                  <li>
                    <Link href="/phones" className="text-zinc-450 hover:text-violet-400 transition">Browse Catalog</Link>
                  </li>
                  <li>
                    <Link href="/compare" className="text-zinc-450 hover:text-violet-400 transition">Compare Engine</Link>
                  </li>
                  <li>
                    <Link href="/best-deals" className="text-zinc-450 hover:text-violet-400 transition">Best Deals</Link>
                  </li>
                  <li>
                    <Link href="/chat" className="text-zinc-450 hover:text-violet-400 transition">AI Assistant Chat</Link>
                  </li>
                </ul>
              </div>

              {/* Col 3: Legal & Resources */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-300">Affiliate Disclosure</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  SmartPick AI is a participant in the Amazon Services LLC Associates Program and Flipkart Affiliate Program. We may earn a small commission on purchases made through our referral links at no extra cost to you.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-zinc-500">
              <div className="flex gap-4">
                <span className="hover:text-zinc-400 cursor-pointer">Privacy Policy</span>
                <span>•</span>
                <span className="hover:text-zinc-400 cursor-pointer">Terms of Service</span>
                <span>•</span>
                <span className="hover:text-zinc-400 cursor-pointer">Contact Us</span>
              </div>
              <div className="text-zinc-650">
                Designed for visual excellence. Production-ready.
              </div>
            </div>
          </div>
        </footer>

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
