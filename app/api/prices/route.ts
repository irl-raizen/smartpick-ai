import { NextResponse } from "next/server";
import { supabase, supabaseAdmin, getPhones } from "@/src/lib/supabase";

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
        const { error: histErr } = await (supabaseAdmin.from("price_history") as any)
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

      const { error: updateErr } = await (supabaseAdmin.from("store_prices") as any)
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
      const { error: insertErr } = await (supabaseAdmin.from("store_prices") as any)
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

      const { error: histErr } = await (supabaseAdmin.from("price_history") as any)
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
        const { error: phoneUpdateErr } = await (supabaseAdmin.from("phones") as any)
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
        await (supabaseAdmin.from("price_alerts") as any)
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

function getLevenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[a.length][b.length];
}

function scoreMatch(query: string, brand: string, model: string, aliasesStr: string | null = null): number {
  const q = query.toLowerCase().trim();
  const b = brand.toLowerCase().trim();
  const m = model.toLowerCase().trim();
  const bm = `${b} ${m}`;

  const qNoSpaces = q.replace(/\s+/g, "");
  const mNoSpaces = m.replace(/\s+/g, "");
  const bmNoSpaces = bm.replace(/\s+/g, "");

  let maxScore = 0;

  // 1. Exact Matches (Highest Priority)
  if (q === bm) return 1000;
  if (q === m) return 950;

  // 2. Alias exact matches
  if (aliasesStr) {
    const aliasList = aliasesStr.split(",").map(a => a.trim().toLowerCase());
    if (aliasList.includes(q)) return 980;
    if (aliasList.some(a => a.replace(/\s+/g, "") === qNoSpaces)) return 920;
  }

  // 2. Missing Spaces Matches (e.g. "iphone15" -> "iphone 15")
  if (qNoSpaces === bmNoSpaces) return 900;
  if (qNoSpaces === mNoSpaces) return 850;

  // Helper for word boundaries check
  const hasWordBoundary = (container: string, substring: string) => {
    try {
      const escaped = substring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(container);
    } catch (e) {
      return false;
    }
  };

  // 3. Global Levenshtein match (distance <= 2)
  const distBM = getLevenshteinDistance(q, bm);
  const distM = getLevenshteinDistance(q, m);
  if (distBM <= 2) {
    const score = 800 - distBM * 10;
    if (score > maxScore) maxScore = score;
  }
  if (distM <= 2) {
    const score = 750 - distM * 10;
    if (score > maxScore) maxScore = score;
  }

  // 4. Substring inclusion (exact)
  if (q.includes(bm)) {
    const score = 600 + bm.length + (hasWordBoundary(q, bm) ? 100 : 0);
    if (score > maxScore) maxScore = score;
  }
  if (q.includes(m)) {
    const score = 550 + m.length + (hasWordBoundary(q, m) ? 100 : 0);
    if (score > maxScore) maxScore = score;
  }
  if (bm.includes(q)) {
    const score = 450 + (q.length / bm.length) * 100 + (hasWordBoundary(bm, q) ? 50 : 0);
    if (score > maxScore) maxScore = score;
  }
  if (m.includes(q)) {
    const score = 400 + (q.length / m.length) * 100 + (hasWordBoundary(m, q) ? 50 : 0);
    if (score > maxScore) maxScore = score;
  }

  // 5. Substring inclusion (no spaces)
  if (qNoSpaces.includes(bmNoSpaces)) {
    const score = 350 + bmNoSpaces.length;
    if (score > maxScore) maxScore = score;
  }
  if (qNoSpaces.includes(mNoSpaces)) {
    const score = 300 + mNoSpaces.length;
    if (score > maxScore) maxScore = score;
  }
  if (bmNoSpaces.includes(qNoSpaces)) {
    const score = 250 + (qNoSpaces.length / bmNoSpaces.length) * 100;
    if (score > maxScore) maxScore = score;
  }
  if (mNoSpaces.includes(qNoSpaces)) {
    const score = 200 + (qNoSpaces.length / mNoSpaces.length) * 100;
    if (score > maxScore) maxScore = score;
  }

  // 6. Word-by-word token matching (typo tolerant)
  const qTokens = q.split(/\s+/).filter(t => t.length > 0);
  const mTokens = m.split(/\s+/).filter(t => t.length > 0);
  const bmTokens = bm.split(/\s+/).filter(t => t.length > 0);

  if (qTokens.length > 0) {
    // Check against brand + model tokens
    let allTokensMatchedBM = true;
    let totalDistBM = 0;
    for (const qToken of qTokens) {
      let minDist = Infinity;
      for (const bmToken of bmTokens) {
        const dist = getLevenshteinDistance(qToken, bmToken);
        if (dist < minDist) {
          minDist = dist;
        }
      }
      if (minDist > 2) {
        allTokensMatchedBM = false;
        break;
      }
      totalDistBM += minDist;
    }

    if (allTokensMatchedBM) {
      const coverage = qTokens.length / bmTokens.length;
      const tokenScore = 500 - totalDistBM * 15 + coverage * 50;
      if (tokenScore > maxScore) maxScore = tokenScore;
    }

    // Check against model tokens only
    let allTokensMatchedM = true;
    let totalDistM = 0;
    for (const qToken of qTokens) {
      let minDist = Infinity;
      for (const mToken of mTokens) {
        const dist = getLevenshteinDistance(qToken, mToken);
        if (dist < minDist) {
          minDist = dist;
        }
      }
      if (minDist > 2) {
        allTokensMatchedM = false;
        break;
      }
      totalDistM += minDist;
    }

    if (allTokensMatchedM) {
      const coverage = qTokens.length / mTokens.length;
      const tokenScore = 450 - totalDistM * 15 + coverage * 50;
      if (tokenScore > maxScore) maxScore = tokenScore;
    }
  }

  return maxScore;
}

export async function GET(request: Request) {
  try {
    // 0. Rate Limiting Check (30 requests / minute / IP)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim() === "") {
      return NextResponse.json({ error: "Query parameter 'q' is required." }, { status: 400 });
    }

    const searchQuery = q.trim();

    // 1. Fetch all phones and search index entries separately
    const [phones, { data: searchIndex }] = await Promise.all([
      getPhones(),
      (supabase.from("phones_search_index") as any).select("phone_id, search_terms, aliases")
    ]);

    // 2. Find matching phone in our database using scored match system with aliases
    let bestMatch: typeof phones[0] | null = null;
    let highestScore = 0;

    for (const p of phones) {
      const idxEntry = searchIndex?.find((si: any) => String(si.phone_id) === String(p.id));
      const score = scoreMatch(searchQuery, p.brand, p.model, idxEntry?.aliases || null);
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
