import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || id.trim() === "") {
      return NextResponse.json({ error: "Query parameter 'id' (phone ID) is required." }, { status: 400 });
    }

    const phoneId = parseInt(id, 10);
    if (isNaN(phoneId)) {
      return NextResponse.json({ error: "Invalid phone ID." }, { status: 400 });
    }

    // 1. Query price history
    const { data: history, error: histErr } = await (supabase.from("price_history") as any)
      .select("store_name, old_price, new_price, changed_at")
      .eq("phone_id", phoneId)
      .order("changed_at", { ascending: true });

    if (histErr) {
      return NextResponse.json({ error: histErr.message }, { status: 500 });
    }

    // 2. Query current store prices to append the latest pricing data point
    const { data: currentPrices, error: currentErr } = await (supabase.from("store_prices") as any)
      .select("store_name, price, last_updated")
      .eq("phone_id", phoneId);

    if (currentErr) {
      return NextResponse.json({ error: currentErr.message }, { status: 500 });
    }

    // 3. Process history and construct chronological Best Price timeline (daily minimums)
    const dailyMinPrices = new Map<string, number>();

    // Process historical price updates
    if (history && history.length > 0) {
      for (const record of history) {
        if (!record.changed_at || record.new_price === null || record.new_price === undefined) continue;
        const dateStr = new Date(record.changed_at).toISOString().split("T")[0];
        const price = Number(record.new_price);
        const existing = dailyMinPrices.get(dateStr);
        if (existing === undefined || price < existing) {
          dailyMinPrices.set(dateStr, price);
        }
      }
    }

    // Process current prices
    if (currentPrices && currentPrices.length > 0) {
      for (const store of currentPrices) {
        if (!store.last_updated || store.price === null || store.price === undefined) continue;
        const dateStr = new Date(store.last_updated).toISOString().split("T")[0];
        const price = Number(store.price);
        const existing = dailyMinPrices.get(dateStr);
        if (existing === undefined || price < existing) {
          dailyMinPrices.set(dateStr, price);
        }
      }
    }

    // Convert map to sorted array
    const sortedTimeline = Array.from(dailyMinPrices.entries())
      .map(([date, price]) => ({ date, price }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // If there is no history at all, fall back to the base phone price
    if (sortedTimeline.length === 0) {
      const { data: phone, error: phoneErr } = await (supabase.from("phones") as any)
        .select("price, created_at")
        .eq("id", phoneId)
        .maybeSingle();

      if (!phoneErr && phone) {
        const todayStr = new Date().toISOString().split("T")[0];
        const createdStr = phone.created_at 
          ? new Date(phone.created_at).toISOString().split("T")[0]
          : new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        sortedTimeline.push({ date: createdStr, price: Number(phone.price) });
        if (createdStr !== todayStr) {
          sortedTimeline.push({ date: todayStr, price: Number(phone.price) });
        }
      }
    }

    // Ensure we don't have single data point for charting (duplicate it to today if only one exists)
    if (sortedTimeline.length === 1) {
      const todayStr = new Date().toISOString().split("T")[0];
      if (sortedTimeline[0].date !== todayStr) {
        sortedTimeline.push({ date: todayStr, price: sortedTimeline[0].price });
      }
    }

    return NextResponse.json(sortedTimeline);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}
