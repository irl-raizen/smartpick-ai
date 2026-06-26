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

    const { message } = body;
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const cleanMsg = message.toLowerCase();
    const phones = await getPhones();

    // 1. NLP Parser: Extract budget
    let budget = 150000; // default large budget
    
    // Check for "k" notation, e.g. "30k", "15 k"
    const kMatch = cleanMsg.match(/\b(\d+)\s*k\b/i);
    if (kMatch) {
      budget = parseInt(kMatch[1], 10) * 1000;
    } else {
      // Check for raw numbers like "30000", "50000"
      const numMatch = cleanMsg.match(/\b(\d{5,6})\b/);
      if (numMatch) {
        budget = parseInt(numMatch[1], 10);
      } else {
        const lowerNumMatch = cleanMsg.match(/\b(\d{4})\b/); // under 9000
        if (lowerNumMatch) {
          budget = parseInt(lowerNumMatch[1], 10);
        }
      }
    }

    // 2. NLP Parser: Extract Priorities
    let cameraImportance = 5;
    let gamingImportance = 5;
    let batteryImportance = 5;
    let priorityDesc = "";

    const isGaming = cleanMsg.includes("gaming") || cleanMsg.includes("game") || cleanMsg.includes("performance") || cleanMsg.includes("processor") || cleanMsg.includes("pubg") || cleanMsg.includes("fast");
    const isCamera = cleanMsg.includes("camera") || cleanMsg.includes("photo") || cleanMsg.includes("video") || cleanMsg.includes("selfie") || cleanMsg.includes("photography");
    const isBattery = cleanMsg.includes("battery") || cleanMsg.includes("backup") || cleanMsg.includes("charging") || cleanMsg.includes("mah") || cleanMsg.includes("lasts");

    if (isGaming && isCamera) {
      gamingImportance = 10;
      cameraImportance = 10;
      batteryImportance = 4;
      priorityDesc = "gaming performance and camera quality";
    } else if (isGaming && isBattery) {
      gamingImportance = 10;
      batteryImportance = 10;
      cameraImportance = 4;
      priorityDesc = "gaming performance and battery life";
    } else if (isCamera && isBattery) {
      cameraImportance = 10;
      batteryImportance = 10;
      gamingImportance = 4;
      priorityDesc = "camera quality and battery life";
    } else if (isGaming) {
      gamingImportance = 10;
      cameraImportance = 3;
      batteryImportance = 5;
      priorityDesc = "gaming performance";
    } else if (isCamera) {
      cameraImportance = 10;
      gamingImportance = 3;
      batteryImportance = 5;
      priorityDesc = "camera quality";
    } else if (isBattery) {
      batteryImportance = 10;
      gamingImportance = 4;
      cameraImportance = 4;
      priorityDesc = "battery endurance";
    } else {
      priorityDesc = "balanced features";
    }

    // 3. NLP Parser: Check for "similar to" or "alternative to" a specific phone
    let targetPhone = null;
    let searchAlternative = false;

    // Check if user mentions standard brands
    const brands = ["apple", "iphone", "samsung", "oneplus", "xiaomi", "redmi", "realme", "iqoo", "nothing", "motorola", "vivo", "poco", "google", "pixel"];
    let mentionedBrand = brands.find(b => cleanMsg.includes(b));
    
    if (mentionedBrand) {
      // Find the closest phone in our database that matches the query
      const matchingPhones = phones.filter(p => {
        const fullTitle = `${p.brand} ${p.model}`.toLowerCase();
        // Check if query contains model keywords (e.g. "iphone 15" or "pixel 8a")
        const modelKeywords = p.model.toLowerCase().split(" ");
        return fullTitle.includes(mentionedBrand!) && modelKeywords.some(kw => kw.length > 2 && cleanMsg.includes(kw));
      });

      if (matchingPhones.length > 0) {
        // Sort to get best match (e.g. longest name match)
        matchingPhones.sort((a, b) => b.model.length - a.model.length);
        targetPhone = matchingPhones[0];
        
        if (cleanMsg.includes("similar") || cleanMsg.includes("alternative") || cleanMsg.includes("cheaper") || cleanMsg.includes("like")) {
          searchAlternative = true;
        }
      }
    }

    let recommendations: any[] = [];
    let assistantMessage = "";

    if (searchAlternative && targetPhone) {
      // Find similar phones but cheaper
      budget = targetPhone.price; // Target cheaper than this phone
      cameraImportance = targetPhone.score_camera;
      gamingImportance = targetPhone.score_gaming;
      batteryImportance = targetPhone.score_battery;

      const altRecommendations = getRecommendations(
        phones,
        {
          budget: budget * 0.95, // must be at least 5% cheaper
          cameraImportance,
          gamingImportance,
          batteryImportance
        },
        3
      );

      recommendations = altRecommendations.map(rec => {
        const p = phones.find(ph => ph.id === rec.id)!;
        return { ...rec, scoreBreakdown: getPhoneSpecsScores(p, budget) };
      });

      if (recommendations.length > 0) {
        assistantMessage = `I found that you are looking for alternatives to the **${targetPhone.brand} ${targetPhone.model}** (which costs ₹${targetPhone.price.toLocaleString("en-IN")}). 

Here are the top 3 similar smartphones that offer a comparable experience (similar camera, gaming, and battery ratings) but at a **cheaper price** within your budget:`;
      } else {
        assistantMessage = `I found the **${targetPhone.brand} ${targetPhone.model}** in our catalog, but I couldn't find any cheaper alternatives with comparable specs in our database. Here are some of our best value phones overall:`;
        
        const backupRecs = getRecommendations(
          phones,
          { budget: targetPhone.price, cameraImportance: 8, gamingImportance: 8, batteryImportance: 8 },
          3
        );
        recommendations = backupRecs.map(rec => {
          const p = phones.find(ph => ph.id === rec.id)!;
          return { ...rec, scoreBreakdown: getPhoneSpecsScores(p, targetPhone.price) };
        });
      }

    } else {
      // Standard search based on budget and priorities
      const rawRecommendations = getRecommendations(
        phones,
        {
          budget,
          cameraImportance,
          gamingImportance,
          batteryImportance
        },
        3
      );

      recommendations = rawRecommendations.map(rec => {
        const p = phones.find(ph => ph.id === rec.id)!;
        return { ...rec, scoreBreakdown: getPhoneSpecsScores(p, budget) };
      });

      const formattedBudget = budget < 150000 ? `under ₹${budget.toLocaleString("en-IN")}` : "overall";
      
      if (recommendations.length > 0) {
        assistantMessage = `Based on your request, I searched our catalog for the best phones **${formattedBudget}** prioritizing **${priorityDesc}**. 

Here are my top recommendations for you:`;
      } else {
        assistantMessage = `I couldn't find any phones in our database within your budget of ₹${budget.toLocaleString("en-IN")}. Try adjusting your budget limit. 

Here are some popular mid-range options that might interest you:`;
        const backupRecs = getRecommendations(
          phones,
          { budget: 35000, cameraImportance: 7, gamingImportance: 7, batteryImportance: 7 },
          3
        );
        recommendations = backupRecs.map(rec => {
          const p = phones.find(ph => ph.id === rec.id)!;
          return { ...rec, scoreBreakdown: getPhoneSpecsScores(p, 35000) };
        });
      }
    }

    return NextResponse.json({
      message: assistantMessage,
      recommendations,
      detectedParams: {
        budget: budget === 150000 ? null : budget,
        priorities: {
          camera: cameraImportance,
          gaming: gamingImportance,
          battery: batteryImportance
        },
        targetPhone: targetPhone ? `${targetPhone.brand} ${targetPhone.model}` : null
      }
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
