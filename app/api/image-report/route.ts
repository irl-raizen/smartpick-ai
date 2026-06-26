import { NextResponse } from "next/server";
import { getPhones } from "@/src/lib/supabase";

export async function GET() {
  try {
    const phones = await getPhones();
    const totalPhones = phones.length;

    const phonesWithImages = phones.filter(
      (phone) => phone.image_url && phone.image_url.trim() !== ""
    ).length;

    const missingImages = totalPhones - phonesWithImages;
    const coveragePercentage = totalPhones > 0 ? (phonesWithImages / totalPhones) * 100 : 0;

    const sourcesSummary: Record<string, number> = {
      gsmarena: 0,
      amazon: 0,
      flipkart: 0,
      other: 0,
      none: 0,
    };

    phones.forEach((phone) => {
      if (!phone.image_url || phone.image_url.trim() === "") {
        sourcesSummary.none++;
      } else {
        const src = (phone.image_source || "").toLowerCase();
        if (src.includes("gsmarena")) {
          sourcesSummary.gsmarena++;
        } else if (src.includes("amazon")) {
          sourcesSummary.amazon++;
        } else if (src.includes("flipkart")) {
          sourcesSummary.flipkart++;
        } else {
          sourcesSummary.other++;
        }
      }
    });

    return NextResponse.json({
      totalPhones,
      phonesWithImages,
      missingImages,
      coveragePercentage: Number(coveragePercentage.toFixed(2)),
      sourcesSummary,
    });
  } catch (error: any) {
    console.error("Failed to generate image report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate image report" },
      { status: 500 }
    );
  }
}
