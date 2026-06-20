import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone_id, email } = body;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    if (!phone_id) {
      return NextResponse.json(
        { error: "Phone ID is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const pId = typeof phone_id === "string" ? parseInt(phone_id, 10) : phone_id;
    if (isNaN(pId)) {
      return NextResponse.json(
        { error: "Invalid Phone ID." },
        { status: 400 }
      );
    }

    // Verify phone exists
    const { data: phone, error: phoneError } = await supabase
      .from("phones")
      .select("id")
      .eq("id", pId)
      .maybeSingle();

    if (phoneError || !phone) {
      return NextResponse.json(
        { error: "Phone does not exist in catalog." },
        { status: 404 }
      );
    }

    // Prevent duplicate subscriptions for the same phone + email where notified is false
    const { data: existingAlert } = await (supabase.from("stock_alerts") as any)
      .select("id")
      .eq("phone_id", pId)
      .eq("email", cleanEmail)
      .eq("notified", false)
      .maybeSingle();

    if (existingAlert) {
      return NextResponse.json({
        success: true,
        message: "We'll notify you when this phone is back in stock."
      });
    }

    // Insert new subscription
    const { error: insertError } = await (supabase.from("stock_alerts") as any)
      .insert({
        phone_id: pId,
        email: cleanEmail,
        notified: false
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || "Failed to register stock alert." },
        { status: 550 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "We'll notify you when this phone is back in stock."
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
