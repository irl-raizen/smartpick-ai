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
      "id, brand, model, price, chipset, battery, camera, display, score_camera, score_gaming, score_battery, image_url, amazon_link, flipkart_link, ai_review",
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
      "id, brand, model, price, chipset, battery, camera, display, score_camera, score_gaming, score_battery, image_url, amazon_link, flipkart_link, ai_review",
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

