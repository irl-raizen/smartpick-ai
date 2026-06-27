import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/src/lib/supabase";

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { eventType, eventData } = body;
    if (!eventType || !eventData) {
      return NextResponse.json({ error: "Missing eventType or eventData" }, { status: 400 });
    }

    const { error } = await (supabaseAdmin
      .from("analytics_events") as any)
      .insert({
        event_type: eventType,
        event_data: eventData
      });


    if (error) {
      console.warn("Failed to insert analytics event (table may be missing):", error.message);
      // Return 200/success anyway so it doesn't break client-side apps
      return NextResponse.json({ success: false, warning: "Table not migrated yet" });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Analytics logging endpoint error:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
