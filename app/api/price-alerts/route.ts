import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/src/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone_id, email, target_price } = body;

    if (!phone_id || !email || !target_price) {
      return NextResponse.json({ error: "Missing required fields: phone_id, email, target_price" }, { status: 400 });
    }

    const phoneId = parseInt(phone_id, 10);
    const priceVal = parseFloat(target_price);

    if (isNaN(phoneId) || isNaN(priceVal) || priceVal <= 0) {
      return NextResponse.json({ error: "Invalid phone_id or target_price values." }, { status: 400 });
    }

    if (!email.includes("@")) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    // 1. Check if the phone actually exists
    const { data: phone, error: phoneErr } = await (supabase.from("phones") as any)
      .select("id, model, brand")
      .eq("id", phoneId)
      .maybeSingle();

    if (phoneErr || !phone) {
      return NextResponse.json({ error: "Phone not found in catalog." }, { status: 404 });
    }

    // 2. Upsert subscription in price_alerts table
    // Fetch if existing alert for same email and phone
    const { data: existingAlert, error: alertFetchErr } = await (supabase.from("price_alerts") as any)
      .select("id")
      .eq("phone_id", phoneId)
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (alertFetchErr) {
      return NextResponse.json({ error: alertFetchErr.message }, { status: 500 });
    }

    if (existingAlert) {
      // Update existing alert
      const { error: updateErr } = await (supabaseAdmin.from("price_alerts") as any)
        .update({
          target_price: priceVal,
          is_triggered: false,
          triggered_at: null,
          enabled: true,
          created_at: new Date().toISOString()
        })
        .eq("id", existingAlert.id);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    } else {
      // Insert new alert
      const { error: insertErr } = await (supabaseAdmin.from("price_alerts") as any)
        .insert({
          phone_id: phoneId,
          email: email.toLowerCase().trim(),
          target_price: priceVal,
          is_triggered: false,
          enabled: true,
          created_at: new Date().toISOString()
        });

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Alert activated successfully for ${phone.brand} ${phone.model}.` 
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}
