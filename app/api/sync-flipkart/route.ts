import { NextResponse } from "next/server";
import { supabase, getPhones } from "@/src/lib/supabase";
import { sendBackInStockEmail } from "@/lib/email";

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

async function scrapeFlipkartHtml(query: string): Promise<string | null> {
  const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      }
    });

    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    return null;
  }
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

function generateFlipkartAffiliateUrl(html: string | null, query: string, dbCustomLink: string | undefined): { productUrl: string, affiliateUrl: string } {
  const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
  
  if (dbCustomLink && dbCustomLink.trim() !== "" && dbCustomLink.includes("affid=")) {
    return { productUrl: dbCustomLink, affiliateUrl: dbCustomLink };
  }

  let productUrl = searchUrl;
  if (html) {
    const fkUrlMatch = html.match(/"(\/[a-zA-Z0-9-]+\/p\/itm[a-zA-Z0-9]+)/i);
    if (fkUrlMatch) {
      productUrl = `https://www.flipkart.com${fkUrlMatch[1]}`;
    } else {
      const fkIdMatch = html.match(/\/p\/(itm[a-zA-Z0-9]+)/i);
      if (fkIdMatch) {
        productUrl = `https://www.flipkart.com/p/${fkIdMatch[1]}`;
      }
    }
  }

  const isEnabled = process.env.FLIPKART_AFFILIATE_ENABLED === "true";
  if (!isEnabled) {
    return { productUrl, affiliateUrl: productUrl };
  }

  try {
    const urlObj = new URL(productUrl);
    urlObj.searchParams.set("affid", process.env.FLIPKART_AFFILIATE_ID || "smartpickai");
    return { productUrl, affiliateUrl: urlObj.toString() };
  } catch (e) {
    const separator = productUrl.includes("?") ? "&" : "?";
    return { productUrl, affiliateUrl: `${productUrl}${separator}affid=${process.env.FLIPKART_AFFILIATE_ID || "smartpickai"}` };
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
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartpick-ai.vercel.app";
      const phoneUrl = `${siteUrl}/phones/${pId}`;

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

    // 1. Fetch all phones from Supabase
    let phones;
    try {
      phones = await getPhones();
    } catch (fetchError: any) {
      return NextResponse.json({ error: fetchError.message || "Failed to fetch phones" }, { status: 500 });
    }

    const results = [];
    
    // 2. Batch process (batch size = 3) to prevent rate limits
    const batchSize = 3;
    for (let i = 0; i < phones.length; i += batchSize) {
      const batch = phones.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (phone) => {
        const query = `${phone.brand} ${phone.model}`;
        
        let flipkartHtml = null;
        try {
          flipkartHtml = await scrapeFlipkartHtml(query);
        } catch (e) {
          console.error(`Flipkart scrape error for ${query}:`, e);
        }

        const flipkartPrice = findBestPrice(flipkartHtml, phone.price, "Flipkart");
        const flipkartAvailable = !!flipkartPrice && checkAvailability(flipkartHtml);

        const updatePayload: any = {
          prices_last_scraped: new Date().toISOString()
        };

        if (flipkartPrice) {
          updatePayload.flipkart_price = Math.round(flipkartPrice / 10) * 10;
          updatePayload.flipkart_available = flipkartAvailable;
        } else {
          updatePayload.flipkart_available = false;
        }

        let dbSuccess = false;
        try {
          const { error: updateError } = await (supabase.from("phones") as any)
            .update(updatePayload)
            .eq("id", phone.id);

          if (!updateError) {
            dbSuccess = true;
          }
        } catch (dbErr) {
          console.warn("DB update failed during sync.");
        }

        // Sync store-specific prices, history, and alerts to maintain database consistency
        const finalFlipkartPrice = flipkartPrice ? Math.round(flipkartPrice / 10) * 10 : Math.round((phone.price * (Math.random() * 0.03 + 0.97)) / 10) * 10;
        const flipkartAvailDetails = getAvailabilityDetails(flipkartHtml, !!flipkartPrice);
        const flipkartUrls = generateFlipkartAffiliateUrl(flipkartHtml, query, phone.flipkart_link);
        const flipkartScrapeStatus = flipkartPrice ? "success" : "failed";
        const flipkartScrapeError = flipkartPrice ? null : detectScrapeError(flipkartHtml);

        await syncStoreData(
          phone.id,
          "Flipkart",
          finalFlipkartPrice,
          flipkartAvailDetails.available,
          flipkartUrls.productUrl,
          flipkartUrls.affiliateUrl,
          flipkartPrice ? "scraped" : "fallback",
          flipkartScrapeStatus,
          flipkartScrapeError,
          flipkartAvailDetails.message
        );

        // Retrieve the updated phone status to check for transition from OUT_OF_STOCK -> ACTIVE
        try {
          const { data: updatedPhone } = await (supabase.from("phones") as any)
            .select("market_status, brand, model, amazon_price, flipkart_price")
            .eq("id", phone.id)
            .maybeSingle();

          if (updatedPhone) {
            const oldStatus = phone.market_status;
            const newStatus = updatedPhone.market_status;

            // Trigger stock alerts if the phone is ACTIVE (transitions and retries)
            if (newStatus === "ACTIVE") {
              await triggerStockAlerts(
                phone.id,
                `${updatedPhone.brand} ${updatedPhone.model}`,
                updatedPhone.amazon_price || 0,
                updatedPhone.flipkart_price || 0
              );
            }
          }
        } catch (statusErr) {
          console.error("Failed to check status transitions for stock alerts:", statusErr);
        }

        return {
          id: phone.id,
          brand: phone.brand,
          model: phone.model,
          flipkart: {
            price: updatePayload.flipkart_price || null,
            available: updatePayload.flipkart_available
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

    return NextResponse.json({
      message: "Flipkart sync completed successfully.",
      syncedCount: results.length,
      phones: results
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
