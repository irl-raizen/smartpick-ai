import { NextResponse } from "next/server";
import { supabase, getPhones } from "@/src/lib/supabase";

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

async function scrapeAmazonHtml(query: string): Promise<string | null> {
  const url = `https://www.amazon.in/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=${encodeURIComponent(query)}`;
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
      }
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    return null;
  }
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
  } catch (error) {
    console.error(`Sync error for store ${storeName}`, error);
  }
}

function scoreMatch(query: string, brand: string, model: string): number {
  const q = query.toLowerCase().trim();
  const b = brand.toLowerCase().trim();
  const m = model.toLowerCase().trim();
  const bm = `${b} ${m}`;

  // 1. Exact match (highest priority)
  if (q === bm) return 1000;
  if (q === m) return 900;

  // Helper for word boundaries check
  const hasWordBoundary = (container: string, substring: string) => {
    try {
      const escaped = substring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(container);
    } catch (e) {
      return false;
    }
  };

  // 2. Query contains brand + model or model
  if (q.includes(bm)) {
    return 500 + bm.length + (hasWordBoundary(q, bm) ? 100 : 0);
  }
  if (q.includes(m)) {
    return 400 + m.length + (hasWordBoundary(q, m) ? 100 : 0);
  }

  // 3. Brand + model or model contains the query
  if (bm.includes(q)) {
    const coverage = q.length / bm.length;
    return 200 + coverage * 100 + (hasWordBoundary(bm, q) ? 50 : 0);
  }
  if (m.includes(q)) {
    const coverage = q.length / m.length;
    return 100 + coverage * 100 + (hasWordBoundary(m, q) ? 50 : 0);
  }

  return 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim() === "") {
      return NextResponse.json({ error: "Query parameter 'q' is required." }, { status: 400 });
    }

    const searchQuery = q.trim();

    // 1. Fetch all phones from Supabase
    const phones = await getPhones();

    // 2. Find matching phone in our database using scored match system
    let bestMatch: typeof phones[0] | null = null;
    let highestScore = 0;

    for (const p of phones) {
      const score = scoreMatch(searchQuery, p.brand, p.model);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = p;
      }
    }

    const match = bestMatch;

    if (!match) {
      return NextResponse.json({ error: "Phone not found in catalog." }, { status: 404 });
    }

    // 3. Query cached store prices
    const { data: cachedPrices } = await (supabase.from("store_prices") as any)
      .select("id, store_name, price, available, product_url, affiliate_url, source, last_updated, scrape_status, scrape_error, availability_message")
      .eq("phone_id", match.id);

    const nowTime = Date.now();
    const cacheThreshold = 30 * 60 * 1000; // 30 minutes cache

    const amazonCache = cachedPrices?.find((p: any) => p.store_name === "Amazon");
    const flipkartCache = cachedPrices?.find((p: any) => p.store_name === "Flipkart");

    const isAmazonFresh = amazonCache && amazonCache.last_updated && (nowTime - new Date(amazonCache.last_updated).getTime() < cacheThreshold);
    const isFlipkartFresh = flipkartCache && flipkartCache.last_updated && (nowTime - new Date(flipkartCache.last_updated).getTime() < cacheThreshold);

    // 4. If both are fresh in cache, return them directly
    if (isAmazonFresh && isFlipkartFresh) {
      return NextResponse.json({
        product: searchQuery,
        brand: match.brand,
        model: match.model,
        stores: [
          {
            name: "Amazon",
            price: Number(amazonCache.price),
            link: amazonCache.affiliate_url || amazonCache.product_url,
            available: amazonCache.available,
            source: amazonCache.source || "scraped",
            confidence: amazonCache.source === "scraped" ? 0.95 : 0.45,
            availability_message: amazonCache.availability_message || "In stock"
          },
          {
            name: "Flipkart",
            price: Number(flipkartCache.price),
            link: flipkartCache.affiliate_url || flipkartCache.product_url,
            available: flipkartCache.available,
            source: flipkartCache.source || "scraped",
            confidence: flipkartCache.source === "scraped" ? 0.95 : 0.45,
            availability_message: flipkartCache.availability_message || "In stock"
          }
        ]
      });
    }

    const basePrice = match.price;
    const scrapeQuery = `${match.brand} ${match.model}`;

    // 5. Scrape missing or stale data concurrently
    const [amazonScraped, flipkartScraped] = await Promise.allSettled([
      scrapeAmazonHtml(scrapeQuery),
      scrapeFlipkartHtml(scrapeQuery)
    ]);

    const amazonHtml = amazonScraped.status === "fulfilled" ? amazonScraped.value : null;
    const flipkartHtml = flipkartScraped.status === "fulfilled" ? flipkartScraped.value : null;

    // Amazon Extraction
    const amazonScrapedPrice = findBestPrice(amazonHtml, basePrice, "Amazon");
    const isAmazonScraped = !!amazonScrapedPrice;
    
    let finalAmazonPrice = amazonScrapedPrice;
    if (!finalAmazonPrice) {
      const variance = Math.floor(basePrice * (Math.random() * 0.03 - 0.01));
      finalAmazonPrice = Math.round((basePrice + variance) / 10) * 10;
    }
    const amazonAvailDetails = getAvailabilityDetails(amazonHtml, isAmazonScraped);
    const amazonUrls = generateAmazonAffiliateUrl(amazonHtml, scrapeQuery, match.amazon_link);
    const amazonScrapeStatus = isAmazonScraped ? "success" : "failed";
    const amazonScrapeError = isAmazonScraped ? null : detectScrapeError(amazonHtml);

    // Flipkart Extraction
    const flipkartScrapedPrice = findBestPrice(flipkartHtml, basePrice, "Flipkart");
    const isFlipkartScraped = !!flipkartScrapedPrice;

    let finalFlipkartPrice = flipkartScrapedPrice;
    if (!finalFlipkartPrice) {
      const variance = Math.floor(basePrice * (Math.random() * 0.03 - 0.02));
      finalFlipkartPrice = Math.round((basePrice + variance) / 10) * 10;
    }
    const flipkartAvailDetails = getAvailabilityDetails(flipkartHtml, isFlipkartScraped);
    const flipkartUrls = generateFlipkartAffiliateUrl(flipkartHtml, scrapeQuery, match.flipkart_link);
    const flipkartScrapeStatus = isFlipkartScraped ? "success" : "failed";
    const flipkartScrapeError = isFlipkartScraped ? null : detectScrapeError(flipkartHtml);

    // 6. Async update cache
    await Promise.all([
      syncStoreData(
        match.id,
        "Amazon",
        finalAmazonPrice,
        amazonAvailDetails.available,
        amazonUrls.productUrl,
        amazonUrls.affiliateUrl,
        isAmazonScraped ? "scraped" : "fallback",
        amazonScrapeStatus,
        amazonScrapeError,
        amazonAvailDetails.message
      ),
      syncStoreData(
        match.id,
        "Flipkart",
        finalFlipkartPrice,
        flipkartAvailDetails.available,
        flipkartUrls.productUrl,
        flipkartUrls.affiliateUrl,
        isFlipkartScraped ? "scraped" : "fallback",
        flipkartScrapeStatus,
        flipkartScrapeError,
        flipkartAvailDetails.message
      )
    ]);

    return NextResponse.json({
      product: searchQuery,
      brand: match.brand,
      model: match.model,
      stores: [
        {
          name: "Amazon",
          price: finalAmazonPrice,
          link: amazonUrls.affiliateUrl,
          available: amazonAvailDetails.available,
          source: isAmazonScraped ? "scraped" : "fallback",
          confidence: isAmazonScraped ? 0.95 : 0.45,
          availability_message: amazonAvailDetails.message
        },
        {
          name: "Flipkart",
          price: finalFlipkartPrice,
          link: flipkartUrls.affiliateUrl,
          available: flipkartAvailDetails.available,
          source: isFlipkartScraped ? "scraped" : "fallback",
          confidence: isFlipkartScraped ? 0.95 : 0.45,
          availability_message: flipkartAvailDetails.message
        }
      ]
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}
