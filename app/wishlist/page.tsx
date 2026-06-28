import type { Metadata } from "next";
import { getPhones } from "@/src/lib/supabase";
import { WishlistCatalog } from "./WishlistCatalog";

export const revalidate = 1800; // 30 minutes cache

export const metadata: Metadata = {
  title: "My Wishlist & Saved Searches | SmartPick AI",
  description: "Access your bookmarked smartphones, saved side-by-side comparison matrices, and recently viewed listings.",
  alternates: {
    canonical: "https://smartpickai.vercel.app/wishlist",
  }
};

export default async function WishlistPage() {
  const phones = await getPhones();

  return (
    <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      {/* Glow effect */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 h-[30rem] w-[40rem] -translate-x-1/2 rounded-full bg-radial-gradient from-violet-600/10 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="relative z-10">
        <WishlistCatalog phones={phones} />
      </div>
    </main>
  );
}
