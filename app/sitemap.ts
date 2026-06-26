import type { MetadataRoute } from "next";
import { getPhones, generatePhoneSlug } from "@/src/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartpickai.vercel.app";

  // Static routes
  const routes = [
    "",
    "/phones",
    "/compare",
    "/best-deals",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  try {
    const phones = await getPhones();
    const activePhones = phones.filter((phone) => phone.active !== false);
    
    // Dynamic phone slug routes
    const phoneRoutes = activePhones.map((phone) => ({
      url: `${baseUrl}/phones/${phone.slug || generatePhoneSlug(phone.brand, phone.model)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    // Dynamic pairwise comparison routes
    const compareRoutes: { url: string; lastModified: Date; changeFrequency: "weekly"; priority: number }[] = [];
    for (let i = 0; i < activePhones.length; i++) {
      for (let j = i + 1; j < activePhones.length; j++) {
        const slug1 = generatePhoneSlug(activePhones[i].brand, activePhones[i].model);
        const slug2 = generatePhoneSlug(activePhones[j].brand, activePhones[j].model);
        const pairSlug = [slug1, slug2].sort().join("-vs-");
        compareRoutes.push({
          url: `${baseUrl}/compare/${pairSlug}`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.5,
        });
      }
    }

    return [...routes, ...phoneRoutes, ...compareRoutes];
  } catch (error) {
    console.error("Failed to generate sitemap routes:", error);
    return routes;
  }
}
