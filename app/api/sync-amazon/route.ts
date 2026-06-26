import { NextResponse } from "next/server";
import { supabase, getPhones, startSyncLog, finishSyncLog } from "@/src/lib/supabase";
import { sendBackInStockEmail } from "@/lib/email";
import * as cheerio from "cheerio";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
];

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// In-memory rate limiter state
const ipRequests = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string, limit = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const clientData = ipRequests.get(ip);
  
  if (!clientData || now > clientData.resetTime) {
    ipRequests.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (clientData.count >= limit) {
    return true;
  }
  
  clientData.count++;
  return false;
}

async function scrapeAmazonHtml(query: string): Promise<string | null> {
  const searchUrl = `https://www.amazon.in/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=${encodeURIComponent(query)}`;
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  try {
    const searchRes = await fetchWithTimeout(searchUrl, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
      }
    });
    if (!searchRes.ok) return null;
    const searchHtml = await searchRes.text();

    // Extract first organic ASIN
    const asinMatch = searchHtml.match(/\/dp\/([A-Z0-9]{10})/i) || searchHtml.match(/data-asin="([A-Z0-9]{10})"/i);
    if (!asinMatch) {
      console.warn(`No ASIN found for query: ${query}, using search results HTML.`);
      return searchHtml;
    }

    const asin = asinMatch[1];
    const productUrl = `https://www.amazon.in/dp/${asin}`;
    console.log(`Scraping direct Amazon page for ASIN: ${asin} (${productUrl})`);

    const dpRes = await fetchWithTimeout(productUrl, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
      }
    });

    if (!dpRes.ok) {
      console.warn(`ASIN fetch failed for ${asin}, falling back to search results HTML.`);
      return searchHtml;
    }

    return await dpRes.text();
  } catch (e) {
    console.error(`Amazon scraping failed:`, e);
    return null;
  }
}

function extractAmazonProductImage(html: string | null): string | null {
  if (!html) return null;
  try {
    const $ = cheerio.load(html);
    
    // 1. Direct page main image
    const landingImage = $("#landingImage").attr("src") || $("#imgBlkFront").attr("src");
    if (landingImage && landingImage.startsWith("http")) return landingImage;

    // 2. Search results grid image
    let searchImage: string | null = null;
    $(".s-image").each((_, img) => {
      const src = $(img).attr("src") || $(img).attr("data-src");
      if (src && src.startsWith("http") && !src.includes("sprite") && !src.includes("pixel")) {
        searchImage = src;
        return false;
      }
    });
    if (searchImage) return searchImage;

    // 3. Regex fallback for Amazon image host patterns
    const imgRegex = /https:\/\/(?:m\.media-amazon\.com|images-na\.ssl-images-amazon\.com|images-eu\.ssl-images-amazon\.com)\/images\/I\/[a-zA-Z0-9%_.-]+\.(?:jpg|jpeg|png|gif)/gi;
    const matches = html.match(imgRegex);
    if (matches && matches.length > 0) {
      const validMatches = matches.filter(m => !m.includes("sprite") && !m.includes("pixel") && !m.includes("icon"));
      if (validMatches.length > 0) {
        return validMatches[0];
      }
    }
  } catch (e) {
    console.error("Failed to extract Amazon product image:", e);
  }
  return null;
}


function extractPricesFromHtml(html: string, storeName: string): number[] {
  const prices: number[] = [];
  let match;

  if (storeName.toLowerCase() === "amazon") {
    const amazonWholeRegex = /class="a-price-whole">([\d,]+)/gi;
    while ((match = amazonWholeRegex.exec(html)) !== null) {
      const val = parseInt(match[1].replace(/,/g, ""), 10);
      if (!isNaN(val) && val > 0) {
        prices.push(val);
      }
    }
  } else {
    const currencyRegex = /(?:₹|Rs\.?)\s?([\d,]+)/gi;
    while ((match = currencyRegex.exec(html)) !== null) {
      const val = parseInt(match[1].replace(/,/g, ""), 10);
      if (!isNaN(val) && val > 0) {
        prices.push(val);
      }
    }
  }

  return prices;
}

const findBestPrice = (html: string | null, targetPrice: number, storeName: string): number | null => {
  if (!html) return null;
  const parsedPrices = extractPricesFromHtml(html, storeName);
  if (parsedPrices.length === 0) return null;

  let filtered = parsedPrices.filter(p => p >= targetPrice * 0.7 && p <= targetPrice * 1.45);
  
  if (filtered.length === 0) {
    filtered = parsedPrices.filter(p => p >= targetPrice * 0.5 && p <= targetPrice * 2.1);
  }

  if (filtered.length === 0) return null;

  filtered.sort((a, b) => Math.abs(a - targetPrice) - Math.abs(b - targetPrice));
  return filtered[0];
};

function checkAvailability(html: string | null): boolean {
  if (!html) return false;
  const text = html.toLowerCase();
  
  if (
    text.includes("currently unavailable") ||
    text.includes("out of stock") ||
    text.includes("sold out") ||
    text.includes("temporarily out of stock")
  ) {
    return false;
  }
  return true;
}

function getAvailabilityDetails(html: string | null, isScraped: boolean): { available: boolean; message: string } {
  if (!isScraped || !html) {
    return { available: true, message: "Unable to verify availability" };
  }
  const text = html.toLowerCase();
  if (text.includes("currently unavailable")) {
    return { available: false, message: "Currently unavailable" };
  }
  if (text.includes("out of stock") || text.includes("sold out")) {
    return { available: false, message: "Out of stock" };
  }
  if (text.includes("temporarily out of stock")) {
    return { available: false, message: "Temporarily out of stock" };
  }
  return { available: true, message: "In stock" };
}

function detectScrapeError(html: string | null): string | null {
  if (html === null) return "timeout";
  const text = html.toLowerCase();
  if (text.includes("access denied") || text.includes("robot check") || text.includes("captcha") || text.includes("automated access")) {
    return "blocked";
  }
  return "parser_error";
}

function generateAmazonAffiliateUrl(html: string | null, query: string, dbCustomLink: string | undefined): { productUrl: string, affiliateUrl: string } {
  const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
  
  if (dbCustomLink && dbCustomLink.trim() !== "" && (dbCustomLink.includes("amzn.to") || dbCustomLink.includes("tag="))) {
    return { productUrl: dbCustomLink, affiliateUrl: dbCustomLink };
  }

  let productUrl = searchUrl;
  if (html) {
    const dpMatch = html.match(/\/dp\/([A-Z0-9]{10})/i);
    if (dpMatch) {
      productUrl = `https://www.amazon.in/dp/${dpMatch[1]}`;
    }
  }

  try {
    const urlObj = new URL(productUrl);
    urlObj.searchParams.set("tag", process.env.AMAZON_ASSOCIATE_TAG || "smartpickai-21");
    return { productUrl, affiliateUrl: urlObj.toString() };
  } catch (e) {
    const separator = productUrl.includes("?") ? "&" : "?";
    return { productUrl, affiliateUrl: `${productUrl}${separator}tag=${process.env.AMAZON_ASSOCIATE_TAG || "smartpickai-21"}` };
  }
}


async function syncStoreData(
  phoneId: string, 
  storeName: string, 
  newPrice: number, 
  available: boolean, 
  productUrl: string, 
  affiliateUrl: string, 
  source: string,
  scrapeStatus: string,
  scrapeError: string | null,
  availabilityMessage: string
) {
  try {
    const { data: existingPrice, error: fetchErr } = await (supabase.from("store_prices") as any)
      .select("id, price")
      .eq("phone_id", phoneId)
      .eq("store_name", storeName)
      .maybeSingle() as { data: { id: string; price: number } | null; error: any };

    if (fetchErr) {
      console.error(`Failed to fetch store price for ${storeName}`, fetchErr);
      return;
    }

    const nowIso = new Date().toISOString();

    if (existingPrice) {
      const oldPrice = Number(existingPrice.price);
      if (oldPrice !== newPrice) {
        const { error: histErr } = await (supabase.from("price_history") as any)
          .insert({
            phone_id: phoneId,
            store_name: storeName,
            old_price: oldPrice,
            new_price: newPrice,
            changed_at: nowIso
          });
        if (histErr) {
          console.error("Failed to insert price history", histErr);
        }
      }

      const { error: updateErr } = await (supabase.from("store_prices") as any)
        .update({
          price: newPrice,
          available: available,
          product_url: productUrl,
          affiliate_url: affiliateUrl,
          source: source,
          last_updated: nowIso,
          scrape_status: scrapeStatus,
          scrape_error: scrapeError,
          scraped_at: scrapeStatus === "success" ? nowIso : null,
          availability_message: availabilityMessage
        })
        .eq("id", existingPrice.id);
      if (updateErr) {
        console.error(`Failed to update store price for ${storeName}`, updateErr);
      }
    } else {
      const { error: insertErr } = await (supabase.from("store_prices") as any)
        .insert({
          phone_id: phoneId,
          store_name: storeName,
          price: newPrice,
          available: available,
          product_url: productUrl,
          affiliate_url: affiliateUrl,
          source: source,
          last_updated: nowIso,
          scrape_status: scrapeStatus,
          scrape_error: scrapeError,
          scraped_at: scrapeStatus === "success" ? nowIso : null,
          availability_message: availabilityMessage
        });

      if (insertErr) {
        console.error(`Failed to insert store price for ${storeName}`, insertErr);
      }

      const { error: histErr } = await (supabase.from("price_history") as any)
        .insert({
          phone_id: phoneId,
          store_name: storeName,
          old_price: null,
          new_price: newPrice,
          changed_at: nowIso
        });
      if (histErr) {
        console.error("Failed to insert price history", histErr);
      }
    }

    // Check and trigger active price drop alerts for this phone
    if (available && newPrice > 0) {
      await checkAndTriggerPriceAlerts(phoneId, newPrice);
    }

    // Recalculate phone active and market_status based on store_prices
    try {
      const { data: stores, error: storesErr } = await (supabase.from("store_prices") as any)
        .select("available")
        .eq("phone_id", phoneId);
      
      if (!storesErr && stores && stores.length > 0) {
        const hasAvailableStore = stores.some((s: any) => s.available === true);
        const { error: phoneUpdateErr } = await (supabase.from("phones") as any)
          .update({
            active: hasAvailableStore,
            market_status: hasAvailableStore ? "ACTIVE" : "OUT_OF_STOCK"
          })
          .eq("id", phoneId);
        
        if (phoneUpdateErr) {
          console.error(`Failed to update phone active status for ID ${phoneId}:`, phoneUpdateErr);
        }
      }
    } catch (dbErr) {
      console.error("Failed to update phone status:", dbErr);
    }
  } catch (error) {
    console.error(`Sync error for store ${storeName}`, error);
  }
}

async function checkAndTriggerPriceAlerts(phoneId: number | string, newPrice: number) {
  try {
    const pId = typeof phoneId === "string" ? parseInt(phoneId, 10) : phoneId;
    if (isNaN(pId)) return;

    // Fetch phone details first
    const { data: phone } = await (supabase.from("phones") as any)
      .select("brand, model")
      .eq("id", pId)
      .maybeSingle();

    if (!phone) return;

    // Query active alerts for this phone where target_price >= newPrice
    const { data: alerts } = await (supabase.from("price_alerts") as any)
      .select("id, email, target_price")
      .eq("phone_id", pId)
      .eq("is_triggered", false)
      .eq("enabled", true)
      .gte("target_price", newPrice);

    if (alerts && alerts.length > 0) {
      for (const alert of alerts) {
        console.log(`\n==================================================`);
        console.log(`🔥 PRICE ALERT TRIGGERED:`);
        console.log(`   Smartphone : ${phone.brand} ${phone.model}`);
        console.log(`   User Email : ${alert.email}`);
        console.log(`   Target     : ₹${Number(alert.target_price).toLocaleString("en-IN")}`);
        console.log(`   Current    : ₹${newPrice.toLocaleString("en-IN")}`);
        console.log(`   Action     : Simulated alert email sent to ${alert.email}!`);
        console.log(`==================================================\n`);

        // Mark alert as triggered
        await (supabase.from("price_alerts") as any)
          .update({
            is_triggered: true,
            triggered_at: new Date().toISOString()
          })
          .eq("id", alert.id);
      }
    }
  } catch (error) {
    console.error("Failed to run price alerts check:", error);
  }
}

async function triggerStockAlerts(
  phoneId: number | string, 
  phoneName: string, 
  amazonPrice: number, 
  flipkartPrice: number
) {
  try {
    const pId = typeof phoneId === "string" ? parseInt(phoneId, 10) : phoneId;
    if (isNaN(pId)) return;

    // Find all stock_alerts where notified=false
    const { data: alerts, error: alertsErr } = await (supabase.from("stock_alerts") as any)
      .select("id, email, retry_count")
      .eq("phone_id", pId)
      .eq("notified", false);

    if (alertsErr) {
      console.error("Failed to query stock alerts:", alertsErr);
      return;
    }

    if (alerts && alerts.length > 0) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartpickai.vercel.app";
      const slug = phoneName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const phoneUrl = `${siteUrl}/phones/${slug}`;

      for (const alert of alerts) {
        try {
          await sendBackInStockEmail(
            alert.email,
            phoneName,
            amazonPrice,
            flipkartPrice,
            phoneUrl
          );

          // Update stock_alerts for success
          const { error: updateErr } = await (supabase.from("stock_alerts") as any)
            .update({
              notified: true,
              notified_at: new Date().toISOString(),
              email_status: "sent",
              email_error: null
            })
            .eq("id", alert.id);

          if (updateErr) {
            console.error(`Failed to update stock alert status after sending email to ${alert.email}:`, updateErr);
          } else {
            console.log(`Successfully sent stock alert email to ${alert.email} and updated DB.`);
          }

        } catch (emailErr) {
          const errMsg = emailErr instanceof Error ? emailErr.message : String(emailErr);
          console.error(`Failed to send stock alert email to ${alert.email}:`, errMsg);

          // Update stock_alerts for failure (retry logic)
          const currentRetryCount = alert.retry_count || 0;
          const { error: updateErr } = await (supabase.from("stock_alerts") as any)
            .update({
              notified: false,
              email_status: "failed",
              email_error: errMsg,
              retry_count: currentRetryCount + 1
            })
            .eq("id", alert.id);

          if (updateErr) {
            console.error(`Failed to update failure status in DB for alert ${alert.id}:`, updateErr);
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to trigger stock alerts:", error);
  }
}

export async function POST(request: Request) {
  let logId: string | number | null = null;
  let phonesProcessed = 0;
  let phonesInserted = 0;
  let phonesUpdated = 0;
  let phonesMarkedInactive = 0;
  let imagesUpdated = 0;
  let errorsCount = 0;
  const results = [];

  try {
    // 0. Rate Limiting Check (30 requests / minute / IP)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

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

    // 1. Fetch all phones from Supabase (slicing by limit if provided)
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : null;
    const dryRun = searchParams.get("dryRun") === "true";

    // Start logging sync job
    logId = await startSyncLog(dryRun ? "amazon (dry run)" : "amazon");

    let phones;
    try {
      phones = await getPhones();
      if (limit !== null && !isNaN(limit)) {
        phones = phones.slice(0, limit);
      }
    } catch (fetchError: any) {
      errorsCount++;
      if (logId) {
        await finishSyncLog(logId, {
          status: "failed",
          error_message: fetchError.message || "Failed to fetch phones",
          errors: errorsCount
        });
      }
      return NextResponse.json({ error: fetchError.message || "Failed to fetch phones" }, { status: 500 });
    }

    // 2. Batch process (batch size = 3) to prevent rate limits
    const batchSize = 3;
    for (let i = 0; i < phones.length; i += batchSize) {
      const batch = phones.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (phone) => {
        phonesProcessed++;
        const query = `${phone.brand} ${phone.model}`;
        
        let amazonHtml = null;
        try {
          amazonHtml = await scrapeAmazonHtml(query);
        } catch (e) {
          console.error(`Amazon scrape error for ${query}:`, e);
          errorsCount++;
        }

        const amazonPrice = findBestPrice(amazonHtml, phone.price, "Amazon");
        const amazonAvailable = !!amazonPrice && checkAvailability(amazonHtml);
        const amazonImage = extractAmazonProductImage(amazonHtml);

        const updatePayload: any = {
          prices_last_scraped: new Date().toISOString(),
          last_synced_at: new Date().toISOString()
        };

        if (amazonPrice) {
          updatePayload.amazon_price = Math.round(amazonPrice / 10) * 10;
          updatePayload.amazon_available = amazonAvailable;
        } else {
          updatePayload.amazon_available = false;
          errorsCount++; // Count as scrape failure / fallback
        }

        const hasNewImage = amazonImage && (!phone.image_url || phone.image_url.trim() === "" || phone.image_source === "flipkart");
        if (hasNewImage) {
          updatePayload.image_url = amazonImage;
          updatePayload.thumbnail_url = amazonImage;
          updatePayload.image_source = "amazon";
        }

        let dbSuccess = false;
        if (dryRun) {
          dbSuccess = true;
          phonesUpdated++;
          if (hasNewImage) imagesUpdated++;
        } else {
          try {
            const { error: updateError } = await (supabase.from("phones") as any)
              .update(updatePayload)
              .eq("id", phone.id);

            if (!updateError) {
              dbSuccess = true;
              phonesUpdated++;
              if (hasNewImage) imagesUpdated++;
            } else {
              errorsCount++;
              console.error("DB update error in Amazon sync:", updateError);
            }
          } catch (dbErr) {
            errorsCount++;
            console.warn("DB update failed during sync.");
          }
        }

        // Sync store-specific prices, history, and alerts to maintain database consistency
        const finalAmazonPrice = amazonPrice ? Math.round(amazonPrice / 10) * 10 : Math.round((phone.price * (Math.random() * 0.03 + 0.98)) / 10) * 10;
        const amazonAvailDetails = getAvailabilityDetails(amazonHtml, !!amazonPrice);
        const amazonUrls = generateAmazonAffiliateUrl(amazonHtml, query, phone.amazon_link);
        const amazonScrapeStatus = amazonPrice ? "success" : "failed";
        const amazonScrapeError = amazonPrice ? null : detectScrapeError(amazonHtml);

        if (!dryRun) {
          await syncStoreData(
            phone.id,
            "Amazon",
            finalAmazonPrice,
            amazonAvailDetails.available,
            amazonUrls.productUrl,
            amazonUrls.affiliateUrl,
            amazonPrice ? "scraped" : "fallback",
            amazonScrapeStatus,
            amazonScrapeError,
            amazonAvailDetails.message
          );
        }

        // Recalculate phone active and market_status based on store_prices
        let hasAvailableStore = amazonAvailDetails.available;
        if (!dryRun) {
          try {
            const { data: stores, error: storesErr } = await (supabase.from("store_prices") as any)
              .select("available")
              .eq("phone_id", phone.id);
            
            if (!storesErr && stores && stores.length > 0) {
              hasAvailableStore = stores.some((s: any) => s.available === true);
              const { error: phoneUpdateErr } = await (supabase.from("phones") as any)
                .update({
                  active: hasAvailableStore,
                  market_status: hasAvailableStore ? "ACTIVE" : "OUT_OF_STOCK"
                })
                .eq("id", phone.id);
              
              if (phoneUpdateErr) {
                console.error(`Failed to update phone active status for ID ${phone.id}:`, phoneUpdateErr);
              }
            }
          } catch (dbErr) {
            console.error("Failed to update phone status:", dbErr);
          }
        }

        if (!hasAvailableStore) {
          phonesMarkedInactive++;
        }

        // Retrieve the updated phone status to check for transition from OUT_OF_STOCK -> ACTIVE
        if (!dryRun && hasAvailableStore) {
          try {
            const { data: updatedPhone } = await (supabase.from("phones") as any)
              .select("market_status, brand, model, amazon_price, flipkart_price")
              .eq("id", phone.id)
              .maybeSingle();

            if (updatedPhone && updatedPhone.market_status === "ACTIVE") {
              await triggerStockAlerts(
                phone.id,
                `${updatedPhone.brand} ${updatedPhone.model}`,
                updatedPhone.amazon_price || 0,
                updatedPhone.flipkart_price || 0
              );
            }
          } catch (statusErr) {
            console.error("Failed to check status transitions for stock alerts:", statusErr);
          }
        }

        return {
          id: phone.id,
          brand: phone.brand,
          model: phone.model,
          amazon: {
            price: updatePayload.amazon_price || null,
            available: updatePayload.amazon_available
          },
          dbSuccess
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (i + batchSize < phones.length) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

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
      message: dryRun ? "Amazon dry run completed." : "Amazon sync completed successfully.",
      phonesProcessed,
      phonesUpdated,
      phonesMarkedInactive,
      imagesUpdated,
      errorsCount,
      syncedCount: results.length,
      phones: results
    });

  } catch (error: any) {
    console.error("Amazon sync API route failed:", error);
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
