import { NextResponse } from "next/server";
import { getPhones } from "@/src/lib/supabase";
import { getRecommendations, getPhoneSpecsScores } from "@/src/lib/recommendations";

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { budget, cameraImportance, gamingImportance, batteryImportance } = body;

    if (!budget || typeof budget !== "number" || budget < 5000) {
      return NextResponse.json(
        { error: "Invalid budget. Must be a number >= 5000" },
        { status: 400 }
      );
    }

    const parsedCamera = typeof cameraImportance === "number" ? cameraImportance : 5;
    const parsedGaming = typeof gamingImportance === "number" ? gamingImportance : 5;
    const parsedBattery = typeof batteryImportance === "number" ? batteryImportance : 5;

    const phones = await getPhones();
    
    // Get recommendations (limit to top 5)
    const rawRecommendations = getRecommendations(
      phones,
      {
        budget,
        cameraImportance: parsedCamera,
        gamingImportance: parsedGaming,
        batteryImportance: parsedBattery,
      },
      5
    );

    // Hydrate recommendations with detailed sub-score breakdown
    const recommendations = rawRecommendations.map((rec) => {
      const dbPhone = phones.find((p) => p.id === rec.id);
      let scoreBreakdown = {
        camera: 5,
        performance: 5,
        battery: 5,
        value: 5,
        rating: 7.0,
      };

      if (dbPhone) {
        scoreBreakdown = getPhoneSpecsScores(dbPhone, budget);
      }

      return {
        ...rec,
        scoreBreakdown,
      };
    });

    return NextResponse.json({
      recommendations,
      weightsUsed: {
        camera: parsedCamera,
        performance: parsedGaming,
        battery: parsedBattery,
        value: 5,
        rating: 5,
      },
    });
  } catch (error: any) {
    console.error("Recommendations API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
