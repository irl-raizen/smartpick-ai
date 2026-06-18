import { NextResponse } from "next/server";
import { supabase, getPhones } from "@/src/lib/supabase";

// In-memory fallback cache if Supabase columns are not migrated yet
type CacheEntry = {
  amazonPrice: number;
  flipkartPrice: number;
  source: "scraped" | "fallback";
  confidence: number;
  timestamp: number;
};
const memoryCache = new Map<string, CacheEntry>();

// User agents list to rotate and look like a real browser
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
  const url = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
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
    console.warn(`Amazon scrape failed for: ${query}`);
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
    console.warn(`Flipkart scrape failed for: ${query}`);
    return null;
  }
}

function extractPricesFromHtml(html: string): number[] {
  const prices: number[] = [];
  
  const currencyRegex = /(?:₹|Rs\.?)\s?([\d,]+)/gi;
  let match;
  while ((match = currencyRegex.exec(html)) !== null) {
    const val = parseInt(match[1].replace(/,/g, ""), 10);
    if (!isNaN(val) && val > 0) {
      prices.push(val);
    }
  }

  const amazonWholeRegex = /class="a-price-whole">([\d,]+)/gi;
  while ((match = amazonWholeRegex.exec(html)) !== null) {
    const val = parseInt(match[1].replace(/,/g, ""), 10);
    if (!isNaN(val) && val > 0) {
      prices.push(val);
    }
  }

  return prices;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim() === "") {
      return NextResponse.json({ error: "Query parameter 'q' is required." }, { status: 400 });
    }

    const searchQuery = q.trim();
    const queryKey = searchQuery.toLowerCase();

    // 1. Check in-memory cache first
    const memCached = memoryCache.get(queryKey);
    if (memCached && Date.now() - memCached.timestamp < 30 * 60 * 1000) {
      console.log(`[Memory Cache Hit] for: ${searchQuery}`);
      return NextResponse.json({
        product: searchQuery,
        stores: [
          {
            name: "Amazon",
            price: memCached.amazonPrice,
            link: `https://www.amazon.in/s?k=${encodeURIComponent(searchQuery)}`,
            source: memCached.source,
            confidence: memCached.confidence
          },
          {
            name: "Flipkart",
            price: memCached.flipkartPrice,
            link: `https://www.flipkart.com/search?q=${encodeURIComponent(searchQuery)}`,
            source: memCached.source,
            confidence: memCached.confidence
          }
        ]
      });
    }

    // 2. Fetch baseline metadata and check Supabase cache
    let matchedPhoneId: string | null = null;
    let baseDbPrice = 45000;
    let brand = "";
    let model = "";

    try {
      const phones = await getPhones();
      // Find closest matches
      const match = phones.find(p => 
        queryKey.includes(p.model.toLowerCase()) || 
        queryKey.includes(p.brand.toLowerCase() + " " + p.model.toLowerCase())
      );
      if (match) {
        matchedPhoneId = match.id;
        baseDbPrice = match.price;
        brand = match.brand;
        model = match.model;

        // If the database has cache columns and the cache is valid (< 30 min)
        if (
          match.prices_last_scraped && 
          match.amazon_price && 
          match.flipkart_price &&
          Date.now() - new Date(match.prices_last_scraped).getTime() < 30 * 60 * 1000
        ) {
          console.log(`[DB Cache Hit] for: ${searchQuery}`);
          return NextResponse.json({
            product: searchQuery,
            brand,
            model,
            stores: [
              {
                name: "Amazon",
                price: match.amazon_price,
                link: `https://www.amazon.in/s?k=${encodeURIComponent(searchQuery)}`,
                source: "scraped",
                confidence: 0.95
              },
              {
                name: "Flipkart",
                price: match.flipkart_price,
                link: `https://www.flipkart.com/search?q=${encodeURIComponent(searchQuery)}`,
                source: "scraped",
                confidence: 0.95
              }
            ]
          });
        }
      }
    } catch (dbError) {
      console.error("Database lookup failed inside prices API", dbError);
    }

    // 3. Cache missed. Perform scraping concurrently.
    const [amazonScraped, flipkartScraped] = await Promise.allSettled([
      scrapeAmazonHtml(searchQuery),
      scrapeFlipkartHtml(searchQuery)
    ]);

    const amazonHtml = amazonScraped.status === "fulfilled" ? amazonScraped.value : null;
    const flipkartHtml = flipkartScraped.status === "fulfilled" ? flipkartScraped.value : null;

    const findBestPrice = (html: string | null, targetPrice: number): number | null => {
      if (!html) return null;
      const parsedPrices = extractPricesFromHtml(html);
      if (parsedPrices.length === 0) return null;

      // Filter: primary segment within 70% to 145% of expected baseline
      let filtered = parsedPrices.filter(p => p >= targetPrice * 0.7 && p <= targetPrice * 1.45);
      
      // Fallback segment: within 50% to 210%
      if (filtered.length === 0) {
        filtered = parsedPrices.filter(p => p >= targetPrice * 0.5 && p <= targetPrice * 2.1);
      }

      if (filtered.length === 0) return null;

      filtered.sort((a, b) => Math.abs(a - targetPrice) - Math.abs(b - targetPrice));
      return filtered[0];
    };

    let amazonPrice = findBestPrice(amazonHtml, baseDbPrice);
    let flipkartPrice = findBestPrice(flipkartHtml, baseDbPrice);

    const isAmazonScraped = !!amazonPrice;
    const isFlipkartScraped = !!flipkartPrice;

    // Fallbacks with variance if scrapers are blocked/throttled
    if (!amazonPrice) {
      const variance = Math.floor(baseDbPrice * (Math.random() * 0.03 - 0.01));
      amazonPrice = baseDbPrice + variance;
    }

    if (!flipkartPrice) {
      const variance = Math.floor(baseDbPrice * (Math.random() * 0.03 - 0.02));
      flipkartPrice = baseDbPrice + variance;
    }

    // Round to nearest 10 for clean look
    amazonPrice = Math.round(amazonPrice / 10) * 10;
    flipkartPrice = Math.round(flipkartPrice / 10) * 10;

    const amazonSource = isAmazonScraped ? "scraped" : "fallback";
    const amazonConfidence = isAmazonScraped ? 0.92 : 0.45;

    const flipkartSource = isFlipkartScraped ? "scraped" : "fallback";
    const flipkartConfidence = isFlipkartScraped ? 0.92 : 0.45;

    // 4. Update the caches (Supabase remote DB or local memory fallback)
    const scrapeSuccess = isAmazonScraped || isFlipkartScraped;
    if (scrapeSuccess) {
      let dbUpdated = false;

      if (matchedPhoneId) {
        try {
          const { error: updateError } = await (supabase.from("phones") as any)
            .update({
              amazon_price: amazonPrice,
              flipkart_price: flipkartPrice,
              prices_last_scraped: new Date().toISOString()
            })
            .eq("id", matchedPhoneId);

          if (!updateError) {
            dbUpdated = true;
            console.log(`[DB Cache Updated] for ID: ${matchedPhoneId}`);
          } else {
            console.warn(`DB cache update returned error: ${updateError.message}`);
          }
        } catch (dbErr) {
          console.warn("DB cache columns not supported yet, falling back to memory cache.");
        }
      }

      if (!dbUpdated) {
        memoryCache.set(queryKey, {
          amazonPrice,
          flipkartPrice,
          source: "scraped",
          confidence: 0.92,
          timestamp: Date.now()
        });
        console.log(`[Memory Cache Updated] for: ${searchQuery}`);
      }
    }

    return NextResponse.json({
      product: searchQuery,
      brand,
      model,
      stores: [
        {
          name: "Amazon",
          price: amazonPrice,
          link: `https://www.amazon.in/s?k=${encodeURIComponent(searchQuery)}`,
          source: amazonSource,
          confidence: amazonConfidence
        },
        {
          name: "Flipkart",
          price: flipkartPrice,
          link: `https://www.flipkart.com/search?q=${encodeURIComponent(searchQuery)}`,
          source: flipkartSource,
          confidence: flipkartConfidence
        }
      ]
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}
