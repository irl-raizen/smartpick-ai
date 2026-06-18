import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://smartpick-ai.vercel.app"),
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-150">
        <header className="sticky top-0 z-50 w-full border-b border-zinc-900/60 bg-zinc-950/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-white text-lg tracking-tight hover:opacity-90">
              <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-650 to-fuchsia-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm ring-1 ring-violet-500/30">SP</span>
              SmartPick <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 font-extrabold text-[10px] uppercase tracking-widest bg-zinc-900/10 px-1 py-0.5 rounded">AI</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-sm font-semibold text-zinc-300 hover:text-violet-350 transition">
                Home
              </Link>
              <Link href="/phones" className="text-sm font-semibold text-zinc-300 hover:text-violet-350 transition">
                Browse
              </Link>
              <Link href="/compare" className="text-sm font-semibold text-zinc-300 hover:text-violet-350 transition">
                Compare
              </Link>
            </nav>
          </div>
        </header>
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
