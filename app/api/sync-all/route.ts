import { NextResponse } from "next/server";
import { POST as syncGsmarena } from "../sync-gsmarena/route";
import { POST as syncAmazon } from "../sync-amazon/route";
import { POST as syncFlipkart } from "../sync-flipkart/route";
import { supabase, startSyncLog, finishSyncLog } from "@/src/lib/supabase";

export async function POST(request: Request) {
  let logId: string | number | null = null;
  let phonesProcessed = 0;
  let phonesInserted = 0;
  let phonesUpdated = 0;
  let phonesMarkedInactive = 0;
  let imagesUpdated = 0;
  let errorsCount = 0;

  try {
    // 0. Authorization
    const apiKeyHeader = request.headers.get("x-api-key");
    const authHeader = request.headers.get("authorization");
    const configuredApiKey = process.env.N8N_API_KEY;
    const cronSecret = process.env.CRON_SECRET;

    const isAuthorized = 
      (configuredApiKey && apiKeyHeader === configuredApiKey) ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      process.env.NODE_ENV === "development";

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized. Missing or invalid credentials." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 3;
    const dryRun = searchParams.get("dryRun") === "true";

    // Start logging sync job
    logId = await startSyncLog(dryRun ? "sync-all (dry run)" : "sync-all");

    // Prepare headers for sub-routes
    const subHeaders = new Headers();
    if (apiKeyHeader) subHeaders.set("x-api-key", apiKeyHeader);
    if (authHeader) subHeaders.set("authorization", authHeader);

    const baseUrl = "http://localhost:3000"; // Dummy base URL for Request constructor
    const dryRunQueryStr = dryRun ? "&dryRun=true" : "";

    // 1. Run GSMArena Sync
    console.log("Running GSMArena Sync...");
    const gsmUrl = `${baseUrl}/api/sync-gsmarena?limit=${limit}${dryRunQueryStr}`;
    const gsmReq = new Request(gsmUrl, { method: "POST", headers: subHeaders });
    const gsmRes = await syncGsmarena(gsmReq);
    
    let gsmData: any = {};
    if (gsmRes.ok) {
      gsmData = await gsmRes.json();
    } else {
      console.error("GSMArena sync failed with status:", gsmRes.status);
      errorsCount++;
    }

    // Brief sleep between routes to avoid hitting rate limits on external stores
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 2. Run Amazon Sync
    console.log("Running Amazon Sync...");
    const amazonUrl = `${baseUrl}/api/sync-amazon?limit=${limit}${dryRunQueryStr}`;
    const amazonReq = new Request(amazonUrl, { method: "POST", headers: subHeaders });
    const amazonRes = await syncAmazon(amazonReq);
    
    let amazonData: any = {};
    if (amazonRes.ok) {
      amazonData = await amazonRes.json();
    } else {
      console.error("Amazon sync failed with status:", amazonRes.status);
      errorsCount++;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. Run Flipkart Sync
    console.log("Running Flipkart Sync...");
    const flipkartUrl = `${baseUrl}/api/sync-flipkart?limit=${limit}${dryRunQueryStr}`;
    const flipkartReq = new Request(flipkartUrl, { method: "POST", headers: subHeaders });
    const flipkartRes = await syncFlipkart(flipkartReq);
    
    let flipkartData: any = {};
    if (flipkartRes.ok) {
      flipkartData = await flipkartRes.json();
    } else {
      console.error("Flipkart sync failed with status:", flipkartRes.status);
      errorsCount++;
    }

    // Aggregate counts
    phonesProcessed = (gsmData.phonesProcessed || 0) + (amazonData.phonesProcessed || 0) + (flipkartData.phonesProcessed || 0);
    phonesInserted = (gsmData.phonesInserted || 0);
    phonesUpdated = (gsmData.phonesUpdated || 0) + (amazonData.phonesUpdated || 0) + (flipkartData.phonesUpdated || 0);
    phonesMarkedInactive = (amazonData.phonesMarkedInactive || 0) + (flipkartData.phonesMarkedInactive || 0);
    imagesUpdated = (gsmData.imagesUpdated || 0) + (amazonData.imagesUpdated || 0) + (flipkartData.imagesUpdated || 0);
    errorsCount += (gsmData.errorsCount || 0) + (amazonData.errorsCount || 0) + (flipkartData.errorsCount || 0);

    // Success sync log update
    await finishSyncLog(logId, {
      status: "success",
      phones_processed: phonesProcessed,
      phones_inserted: phonesInserted,
      phones_updated: phonesUpdated,
      phones_marked_inactive: phonesMarkedInactive,
      images_updated: imagesUpdated,
      errors: errorsCount
    });

    return NextResponse.json({
      success: true,
      message: dryRun ? "Unified dry run sync completed." : "Unified catalog synchronization completed successfully.",
      summary: {
        phonesProcessed,
        phonesInserted,
        phonesUpdated,
        phonesMarkedInactive,
        imagesUpdated,
        errorsCount
      },
      details: {
        gsmarena: gsmData,
        amazon: amazonData,
        flipkart: flipkartData
      }
    });

  } catch (error: any) {
    console.error("Unified sync-all route failed:", error);
    if (logId) {
      await finishSyncLog(logId, {
        status: "failed",
        error_message: error.message || String(error),
        phones_processed: phonesProcessed,
        phones_inserted: phonesInserted,
        phones_updated: phonesUpdated,
        phones_marked_inactive: phonesMarkedInactive,
        images_updated: imagesUpdated,
        errors: errorsCount + 1
      });
    }
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
