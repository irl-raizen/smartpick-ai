import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export async function POST(request: Request) {
  try {
    const apiKeyHeader = request.headers.get("x-api-key");
    const configuredApiKey = process.env.N8N_API_KEY;

    if (!configuredApiKey) {
      return NextResponse.json(
        { error: "N8N_API_KEY is not configured in the application environment." },
        { status: 500 }
      );
    }

    if (apiKeyHeader !== configuredApiKey) {
      return NextResponse.json(
        { error: "Unauthorized. Missing or invalid x-api-key header." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      brand,
      model,
      price,
      chipset,
      battery,
      camera,
      display,
      score_camera,
      score_gaming,
      score_battery,
      image_url,
      amazon_link,
      flipkart_link,
      ai_review,
    } = body;

    // Validate required fields
    if (!brand || !model || price === undefined) {
      return NextResponse.json(
        { error: "Brand, model, and price are required fields." },
        { status: 400 }
      );
    }

    // Lookup existing phone by brand and model to decide between insert/update
    const { data: existingData, error: selectError } = await (supabase.from("phones") as any)
      .select("id")
      .eq("brand", brand)
      .eq("model", model)
      .maybeSingle();

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    const phoneData = {
      brand,
      model,
      price: Number(price),
      chipset: chipset || "Unknown",
      battery: battery || "Unknown",
      camera: camera || "",
      display: display || "",
      score_camera: score_camera !== undefined ? Number(score_camera) : 5,
      score_gaming: score_gaming !== undefined ? Number(score_gaming) : 5,
      score_battery: score_battery !== undefined ? Number(score_battery) : 5,
      image_url: image_url || "",
      amazon_link: amazon_link || "",
      flipkart_link: flipkart_link || "",
      ai_review: ai_review || "",
    };

    if (existingData) {
      // Update existing record
      const { data: updateData, error: updateError } = await (supabase.from("phones") as any)
        .update(phoneData)
        .eq("id", existingData.id)
        .select();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        message: "Smartphone updated successfully in catalog.",
        phone: updateData?.[0] || existingData,
      });
    } else {
      // Insert new record
      const { data: insertData, error: insertError } = await (supabase.from("phones") as any)
        .insert(phoneData)
        .select();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({
        message: "Smartphone added successfully to catalog.",
        phone: insertData?.[0],
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
