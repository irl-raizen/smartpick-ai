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

function extractPricesFromHtml(html: string): number[] {
  const prices: number[] = [];
  let match;

  const currencyRegex = /(?:₹|Rs\.?)\s?([\d,]+)/gi;
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

const findBestPrice = (html: string | null, targetPrice: number): number | null => {
  if (!html) return null;
  const parsedPrices = extractPricesFromHtml(html);
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
        
        // Concurrent scrape for Amazon and Flipkart
        const [amazonScraped, flipkartScraped] = await Promise.allSettled([
          scrapeAmazonHtml(query),
          scrapeFlipkartHtml(query)
        ]);

        const amazonHtml = amazonScraped.status === "fulfilled" ? amazonScraped.value : null;
        const flipkartHtml = flipkartScraped.status === "fulfilled" ? flipkartScraped.value : null;

        const amazonPrice = findBestPrice(amazonHtml, phone.price);
        const flipkartPrice = findBestPrice(flipkartHtml, phone.price);

        const amazonAvailable = !!amazonPrice && checkAvailability(amazonHtml);
        const flipkartAvailable = !!flipkartPrice && checkAvailability(flipkartHtml);

        const updatePayload: any = {
          prices_last_scraped: new Date().toISOString()
        };

        if (amazonPrice) {
          updatePayload.amazon_price = Math.round(amazonPrice / 10) * 10;
          updatePayload.amazon_available = amazonAvailable;
        } else {
          updatePayload.amazon_available = false;
        }

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

        return {
          id: phone.id,
          brand: phone.brand,
          model: phone.model,
          amazon: {
            price: updatePayload.amazon_price || null,
            available: updatePayload.amazon_available
          },
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
      message: "Sync completed successfully.",
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
