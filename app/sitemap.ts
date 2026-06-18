import type { MetadataRoute } from "next";
import { getPhones } from "@/src/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartpick-ai.vercel.app";

  // Static routes
  const routes = [
    "",
    "/phones",
    "/compare",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  try {
    const phones = await getPhones();
    const phoneRoutes = phones.map((phone) => ({
      url: `${baseUrl}/phones/${phone.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
    return [...routes, ...phoneRoutes];
  } catch (error) {
    console.error("Failed to generate sitemap routes:", error);
    return routes;
  }
}
