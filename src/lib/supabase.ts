import { createClient } from "@supabase/supabase-js";

import type { Phone } from "@/src/types/phone";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
  );
}

export const supabase = createClient<{
  public: {
    Tables: {
      phones: {
        Row: Phone;
        Insert: Omit<Phone, "id"> & { id?: string };
        Update: Partial<Omit<Phone, "id">>;
      };
    };
  };
}>(supabaseUrl, supabaseAnonKey);

export async function getPhones(): Promise<Phone[]> {
  const { data, error } = await supabase
    .from("phones")
    .select(
      "id, brand, model, price, chipset, battery, camera, display, score_camera, score_gaming, score_battery, image_url, amazon_link, flipkart_link, ai_review, amazon_price, flipkart_price, prices_last_scraped, amazon_available, flipkart_available, active, market_status, slug, thumbnail_url, processor, ram, storage, os, rating, image_source, last_synced_at, launch_year",
    )
    .order("brand", { ascending: true })
    .order("model", { ascending: true });

  if (error) {
    // Handle table not existing (42P01)
    if (error.code === "42P01" || (error.message && error.message.includes("relation") && error.message.includes("does not exist"))) {
      throw new Error("Table 'phones' does not exist in your Supabase database. Please open the Supabase SQL Editor and run the setup queries in phones.sql to create the table and seed the data.");
    }

    // Fallback if DDL columns (image_url, amazon_link, flipkart_link) don't exist in Supabase yet (42703)
    if (
      error.code === "42703" ||
      (error.message && (error.message.includes("column") || error.message.includes("does not exist")))
    ) {
      console.warn("DDL columns (image_url/amazon_link/flipkart_link) do not exist in Supabase yet. Falling back to basic columns.");
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("phones")
        .select(
          "id, brand, model, price, chipset, battery, camera, display, score_camera, score_gaming, score_battery",
        )
        .order("brand", { ascending: true })
        .order("model", { ascending: true });

      if (fallbackError) {
        throw new Error(fallbackError.message);
      }
      return fallbackData ?? [];
    }

    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getPhoneById(id: string): Promise<Phone | null> {
  const { data, error } = await supabase
    .from("phones")
    .select(
      "id, brand, model, price, chipset, battery, camera, display, score_camera, score_gaming, score_battery, image_url, amazon_link, flipkart_link, ai_review, amazon_price, flipkart_price, prices_last_scraped, amazon_available, flipkart_available, active, market_status, slug, thumbnail_url, processor, ram, storage, os, rating, image_source, last_synced_at, launch_year",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    // Handle table not existing (42P01)
    if (error.code === "42P01" || (error.message && error.message.includes("relation") && error.message.includes("does not exist"))) {
      throw new Error("Table 'phones' does not exist in your Supabase database. Please open the Supabase SQL Editor and run the setup queries in phones.sql to create the table and seed the data.");
    }

    // Fallback if DDL columns don't exist
    if (
      error.code === "42703" ||
      (error.message && (error.message.includes("column") || error.message.includes("does not exist")))
    ) {
      console.warn("DDL columns (image_url/amazon_link/flipkart_link) do not exist in Supabase yet. Falling back to basic columns.");
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("phones")
        .select(
          "id, brand, model, price, chipset, battery, camera, display, score_camera, score_gaming, score_battery",
        )
        .eq("id", id)
        .maybeSingle();

      if (fallbackError) {
        throw new Error(fallbackError.message);
      }
      return fallbackData;
    }

    throw new Error(error.message);
  }

  return data;
}

export function generatePhoneSlug(brand: string, model: string): string {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function getPhoneByIdOrSlug(idOrSlug: string): Promise<Phone | null> {
  const isNumeric = /^\d+$/.test(idOrSlug);
  if (isNumeric) {
    try {
      const phone = await getPhoneById(idOrSlug);
      if (phone) return phone;
    } catch (e) {
      console.warn(`getPhoneById failed for numeric ID ${idOrSlug}:`, e);
    }
  }

  // First try direct slug query from DB
  try {
    const { data, error } = await supabase
      .from("phones")
      .select(
        "id, brand, model, price, chipset, battery, camera, display, score_camera, score_gaming, score_battery, image_url, amazon_link, flipkart_link, ai_review, amazon_price, flipkart_price, prices_last_scraped, amazon_available, flipkart_available, active, market_status, slug, thumbnail_url, processor, ram, storage, os, rating, image_source, last_synced_at, launch_year"
      )
      .eq("slug", idOrSlug)
      .maybeSingle();
    
    if (!error && data) return data;
  } catch (e) {
    console.warn(`Direct slug lookup failed for ${idOrSlug}:`, e);
  }

  // Fallback or slug resolution: fetch all phones and match slug (handles legacy generated slugs)
  try {
    const phones = await getPhones();
    const phone = phones.find(
      (p) => p.slug === idOrSlug || generatePhoneSlug(p.brand, p.model) === idOrSlug
    );
    return phone || null;
  } catch (e) {
    console.error("Failed resolving phone by slug:", e);
    return null;
  }
}

export async function startSyncLog(source: string): Promise<string | number | null> {
  try {
    const { data, error } = await (supabase.from("sync_logs") as any)
      .insert({
        source,
        status: "running",
        started_at: new Date().toISOString()
      })
      .select("id")
      .single();
    if (error) {
      console.error("Failed to start sync log:", error);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.error("Failed to start sync log:", err);
    return null;
  }
}

export async function finishSyncLog(
  id: string | number | null,
  payload: {
    status: "success" | "failed";
    phones_processed?: number;
    phones_inserted?: number;
    phones_updated?: number;
    phones_marked_inactive?: number;
    images_updated?: number;
    errors?: number;
    error_message?: string;
  }
) {
  if (!id) return;
  try {
    const finishedAt = new Date();
    const { data: logEntry } = await (supabase.from("sync_logs") as any)
      .select("started_at")
      .eq("id", id)
      .maybeSingle();

    let durationMs = null;
    if (logEntry?.started_at) {
      durationMs = finishedAt.getTime() - new Date(logEntry.started_at).getTime();
    }

    const { error } = await (supabase.from("sync_logs") as any)
      .update({
        status: payload.status,
        phones_processed: payload.phones_processed ?? 0,
        phones_inserted: payload.phones_inserted ?? 0,
        phones_updated: payload.phones_updated ?? 0,
        phones_marked_inactive: payload.phones_marked_inactive ?? 0,
        images_updated: payload.images_updated ?? 0,
        errors: payload.errors ?? 0,
        finished_at: finishedAt.toISOString(),
        duration_ms: durationMs,
        error_message: payload.error_message || null
      })
      .eq("id", id);

    if (error) {
      console.error("Failed to finish sync log:", error);
    }
  } catch (err) {
    console.error("Failed to finish sync log:", err);
  }
}



