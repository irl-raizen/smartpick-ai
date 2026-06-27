import { NextResponse } from "next/server";
import { supabase, supabaseAdmin, getPhones, generatePhoneSlug, startSyncLog, finishSyncLog } from "@/src/lib/supabase";
import * as cheerio from "cheerio";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
];

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 5000) {
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

// Scrape specs from a GSMArena phone specs page HTML
function parseSpecs(html: string, url: string) {
  const $ = cheerio.load(html);
  
  // Extract Title (e.g. "Samsung Galaxy S24 Ultra")
  const rawTitle = $("h1.specs-phone-name-title").text().trim() || $("h1").text().trim();
  
  // Extract main image URL
  const imageUrl = $(".specs-photo-main img").attr("src") || $(".specs-photo-main a img").attr("src") || "";
  
  // GSMArena URL slug is part of the URL path (e.g., apple_iphone_15_pro_max-12548)
  let gsmSlug = "";
  try {
    const urlParts = url.split("/");
    const filename = urlParts[urlParts.length - 1];
    gsmSlug = filename.replace(/\.php$/, "");
  } catch (e) {
    gsmSlug = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  // Parse spec tables
  const specs: Record<string, Record<string, string>> = {};
  $("#specs-list table").each((_, table) => {
    const category = $(table).find("th").text().trim();
    if (!category) return;
    
    specs[category] = {};
    $(table).find("tr").each((_, tr) => {
      const ttl = $(tr).find("td.ttl").text().trim();
      const nfo = $(tr).find("td.nfo").text().trim();
      if (ttl) {
        specs[category][ttl] = nfo;
      }
    });
  });

  const os = specs["Platform"]?.["OS"] || "";
  const processor = specs["Platform"]?.["Chipset"] || specs["Platform"]?.["CPU"] || "";
  const batteryInfo = specs["Battery"]?.["Type"] || specs["Battery"]?.["Description"] || "";
  
  const memoryInfo = specs["Memory"]?.["Internal"] || "";
  
  const displayType = specs["Display"]?.["Type"] || "";
  const displaySize = specs["Display"]?.["Size"] || "";
  const displayResolution = specs["Display"]?.["Resolution"] || "";
  const display = [displayType, displaySize, displayResolution].filter(Boolean).join(", ");
  
  const cameraInfo = specs["Main Camera"]?.["Triple"] || 
                     specs["Main Camera"]?.["Dual"] || 
                     specs["Main Camera"]?.["Single"] || 
                     specs["Main Camera"]?.["Quad"] || 
                     specs["Main Camera"]?.["Five"] ||
                     "";

  // Parse RAM and Storage
  let ram = "";
  let storage = "";
  if (memoryInfo) {
    const ramMatch = memoryInfo.match(/(\d+GB|\d+MB)\s*RAM/i);
    if (ramMatch) ram = ramMatch[1];
    
    const storageMatch = memoryInfo.match(/(\d+GB|\d+TB)/i);
    if (storageMatch) storage = storageMatch[1];
  }

  // Extract Rating
  let rating = null;
  const ratingText = $(".rating-value").text() || $(".rating-stars").text() || $("#vote-info").text() || "";
  const ratingMatch = ratingText.match(/([\d.]+)\s*\/\s*5/) || ratingText.match(/([\d.]+)\s*\/\s*10/);
  if (ratingMatch) {
    rating = parseFloat(ratingMatch[1]);
  } else {
    const popularityText = $(".help-popularity strong").text() || "";
    const popMatch = popularityText.match(/([\d.]+)%/);
    if (popMatch) {
      // Scale popularity 0-100% to 0-10 rating
      rating = Math.round((parseFloat(popMatch[1]) / 10) * 10) / 10;
    }
  }

  // Extract baseline price if available
  let rupeePrice = null;
  const priceText = specs["Misc"]?.["Price"] || "";
  const rupeeMatch = priceText.match(/(?:₹|Rs\.?)\s?([\d,]+)/i);
  if (rupeeMatch) {
    rupeePrice = parseInt(rupeeMatch[1].replace(/,/g, ""), 10);
  } else {
    // Check for Euro and Dollar fallbacks
    const euroMatch = priceText.match(/(?:€|EUR)\s?([\d,.]+)/i);
    const dollarMatch = priceText.match(/(?:\$|USD)\s?([\d,.]+)/i);
    if (euroMatch) {
      rupeePrice = Math.round(parseFloat(euroMatch[1]) * 90);
    } else if (dollarMatch) {
      rupeePrice = Math.round(parseFloat(dollarMatch[1]) * 83);
    }
  }

  // Extract launch year
  const announced = specs["Launch"]?.["Announced"] || "";
  const status = specs["Launch"]?.["Status"] || "";
  const launchText = `${announced} ${status}`;
  const yearMatch = launchText.match(/\b(20\d{2})\b/);
  const launchYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

  return {
    rawTitle,
    gsmSlug,
    imageUrl,
    display,
    processor,
    ram,
    storage,
    battery: batteryInfo,
    camera: cameraInfo,
    os,
    rating: rating ? Number(rating) : null,
    price: rupeePrice,
    launchYear
  };
}

async function searchGSMArena(brand: string, model: string): Promise<{ html: string; url: string } | null> {
  const query = `${brand} ${model}`;
  const searchUrl = `https://www.gsmarena.com/results.php3?sName=${encodeURIComponent(query)}`;
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  try {
    const response = await fetchWithTimeout(searchUrl, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      }
    });
    
    if (!response.ok) return null;
    const html = await response.text();
    
    if (html.includes("id=\"specs-list\"")) {
      return { html, url: searchUrl };
    }
    
    const $ = cheerio.load(html);
    const results: { name: string; url: string }[] = [];
    
    $(".makers ul li a").each((_, a) => {
      const name = $(a).text().trim();
      const href = $(a).attr("href");
      if (href) {
        results.push({ name, url: href.startsWith("http") ? href : `https://www.gsmarena.com/${href}` });
      }
    });
    
    if (results.length === 0) return null;
    
    const bestMatch = results[0];
    console.log(`Found GSMArena URL: ${bestMatch.url} for query: ${query}`);
    
    const detailResponse = await fetchWithTimeout(bestMatch.url, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      }
    });
    
    if (!detailResponse.ok) return null;
    return { html: await detailResponse.text(), url: bestMatch.url };
  } catch (e) {
    console.error(`Search GSMArena failed for ${query}:`, e);
    return null;
  }
}

async function scrapeLatestDevices(): Promise<string[]> {
  const url = "https://www.gsmarena.com/";
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      }
    });
    
    if (!response.ok) return [];
    const html = await response.text();
    const $ = cheerio.load(html);
    const deviceUrls: string[] = [];
    
    $(".module-latest-devices-index ul li a").each((_, a) => {
      const href = $(a).attr("href");
      if (href) {
        deviceUrls.push(href.startsWith("http") ? href : `https://www.gsmarena.com/${href}`);
      }
    });
    
    return deviceUrls;
  } catch (e) {
    console.error("Scrape latest devices failed:", e);
    return [];
  }
}

// Heuristics for scoring & AI reviews
function calculateCameraScore(camera: string): number {
  const mpMatch = camera.match(/(\d+)\s*MP/i);
  if (mpMatch) {
    const mp = parseInt(mpMatch[1], 10);
    if (mp >= 108) return 10;
    if (mp >= 50) return 9;
    if (mp >= 48) return 8;
    if (mp >= 12) return 7;
  }
  return 6;
}

function calculateBatteryScore(battery: string): number {
  const mahMatch = battery.match(/(\d+)\s*mAh/i);
  if (mahMatch) {
    const mah = parseInt(mahMatch[1], 10);
    if (mah >= 6000) return 10;
    if (mah >= 5000) return 9;
    if (mah >= 4500) return 8;
    if (mah >= 4000) return 7;
  }
  return 6;
}

function calculateGamingScore(processor: string): number {
  const p = processor.toLowerCase();
  if (p.includes("snapdragon 8") || p.includes("a17 pro") || p.includes("a18") || p.includes("dimensity 9") || p.includes("tensor g3")) return 10;
  if (p.includes("snapdragon 7") || p.includes("a16") || p.includes("dimensity 8") || p.includes("tensor g2")) return 9;
  if (p.includes("snapdragon 6") || p.includes("a15") || p.includes("dimensity 7") || p.includes("helio g99")) return 8;
  if (p.includes("helio") || p.includes("exynos")) return 7;
  return 6;
}

function generateAiReview(brand: string, model: string, display: string, processor: string, battery: string, camera: string, cameraScore: number, gamingScore: number, batteryScore: number): string {
  return `### Pros
${gamingScore >= 9 ? `- Elite-level processing performance with ${processor || "advanced processor"}.` : `- Capable daily performance with ${processor || "reliable processor"}.`}
${batteryScore >= 9 ? `- Long-lasting battery backup powered by a ${battery || "massive battery"}.` : `- Reliable battery life suitable for full-day usage.`}
${cameraScore >= 9 ? `- Exceptional photography capabilities featuring a high-resolution ${camera || "main camera"}.` : `- Decent camera performance for daily social media captures.`}
- Gorgeous display experience: ${display || "high-quality screen"}.

### Cons
- Charging speed may vary compared to competitors.
- Lacks heavy graphics optimizations for extreme gaming.

### Verdict
The ${brand} ${model} offers a highly balanced smartphone experience. With a strong focus on ${gamingScore > batteryScore ? "processing power" : "battery longevity"} and display quality, it stands out as a solid choice in its segment.`;
}

function extractBrandAndModel(rawTitle: string) {
  const parts = rawTitle.trim().split(/\s+/);
  const brand = parts[0];
  const model = parts.slice(1).join(" ");
  return { brand, model };
}

export async function POST(request: Request) {
  let logId: string | number | null = null;
  let phonesProcessed = 0;
  let phonesInserted = 0;
  let phonesUpdated = 0;
  let imagesUpdated = 0;
  let errorsCount = 0;
  const syncedDevices = [];

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
    const queryParam = searchParams.get("query");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 3;
    const dryRun = searchParams.get("dryRun") === "true";
    const mode = searchParams.get("mode");

    // Start logging sync job
    logId = await startSyncLog(dryRun ? `gsmarena (${mode || "sync"} dry run)` : `gsmarena (${mode || "sync"})`);

    const BRAND_URLS: Record<string, string> = {
      "Samsung": "https://www.gsmarena.com/samsung-phones-9.php",
      "Apple": "https://www.gsmarena.com/apple-phones-48.php",
      "OnePlus": "https://www.gsmarena.com/oneplus-phones-95.php",
      "Xiaomi": "https://www.gsmarena.com/xiaomi-phones-80.php",
      "Google": "https://www.gsmarena.com/google-phones-107.php",
      "Motorola": "https://www.gsmarena.com/motorola-phones-4.php",
      "Realme": "https://www.gsmarena.com/realme-phones-118.php",
      "Vivo": "https://www.gsmarena.com/vivo-phones-98.php",
      "Oppo": "https://www.gsmarena.com/oppo-phones-82.php",
      "Infinix": "https://www.gsmarena.com/infinix-phones-119.php",
      "Nothing": "https://www.gsmarena.com/nothing-phones-128.php"
    };

    if (mode === "expand") {
      const brand = searchParams.get("brand") || "Samsung";
      const brandUrl = BRAND_URLS[brand];
      if (!brandUrl) {
        return NextResponse.json({ error: `Unsupported brand for expansion: ${brand}` }, { status: 400 });
      }

      console.log(`Expanding catalog for brand: ${brand} from URL: ${brandUrl}`);
      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      
      const response = await fetchWithTimeout(brandUrl, {
        headers: {
          "User-Agent": userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch brand page for ${brand} (status ${response.status})`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const discovered: { brand: string; model: string; url: string }[] = [];

      $(".makers ul li a").each((_, a) => {
        const href = $(a).attr("href");
        const text = $(a).text().trim();
        if (href) {
          const fullUrl = href.startsWith("http") ? href : `https://www.gsmarena.com/${href}`;
          // Clean the model name by removing leading brand name if it starts with it
          let model = text;
          if (model.toLowerCase().startsWith(brand.toLowerCase())) {
            model = model.slice(brand.length).trim();
          }
          discovered.push({ brand, model, url: fullUrl });
        }
      });

      const allPhones = await getPhones();
      const existingSet = new Set(allPhones.map(p => `${p.brand.toLowerCase()}|${p.model.toLowerCase()}`));

      const newPhones = discovered.filter(p => !existingSet.has(`${p.brand.toLowerCase()}|${p.model.toLowerCase()}`));
      console.log(`Discovered ${discovered.length} phones for ${brand}. New ones to insert: ${newPhones.length}`);

      const targetNewPhones = newPhones.slice(0, limit);

      for (const phone of targetNewPhones) {
        phonesProcessed++;
        console.log(`Scraping new device details for: ${phone.brand} ${phone.model} (${phone.url})`);
        
        try {
          const detailResponse = await fetchWithTimeout(phone.url, {
            headers: {
              "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            }
          });

          if (!detailResponse.ok) {
            errorsCount++;
            continue;
          }

          const detailHtml = await detailResponse.text();
          const specs = parseSpecs(detailHtml, phone.url);
          const localSlug = generatePhoneSlug(phone.brand, phone.model);

          const scoreCamera = calculateCameraScore(specs.camera);
          const scoreBattery = calculateBatteryScore(specs.battery);
          const scoreGaming = calculateGamingScore(specs.processor);
          const basePrice = specs.price || 24999;

          const aiReview = generateAiReview(
            phone.brand,
            phone.model,
            specs.display,
            specs.processor,
            specs.battery,
            specs.camera,
            scoreCamera,
            scoreGaming,
            scoreBattery
          );

          const insertPayload = {
            brand: phone.brand,
            model: phone.model,
            price: basePrice,
            display: specs.display,
            chipset: specs.processor,
            processor: specs.processor,
            battery: specs.battery,
            camera: specs.camera,
            ram: specs.ram,
            storage: specs.storage,
            os: specs.os,
            rating: specs.rating,
            launch_year: specs.launchYear,
            slug: localSlug,
            image_url: specs.imageUrl,
            thumbnail_url: specs.imageUrl,
            image_source: specs.imageUrl ? "gsmarena" : null,
            score_camera: scoreCamera,
            score_gaming: scoreGaming,
            score_battery: scoreBattery,
            ai_review: aiReview,
            active: true,
            market_status: "ACTIVE",
            prices_last_scraped: new Date().toISOString(),
            last_synced_at: new Date().toISOString()
          };

          if (dryRun) {
            phonesInserted++;
            if (specs.imageUrl) imagesUpdated++;
            syncedDevices.push({ brand: phone.brand, model: phone.model, action: "inserted (dry run)" });
          } else {
            const { error: insertErr } = await (supabaseAdmin.from("phones") as any)
              .insert(insertPayload);

            if (!insertErr) {
              phonesInserted++;
              if (specs.imageUrl) imagesUpdated++;
              syncedDevices.push({ brand: phone.brand, model: phone.model, action: "inserted" });
            } else {
              errorsCount++;
              console.error("DB insert error in expansion sync:", insertErr);
            }
          }
        } catch (scrapeErr) {
          errorsCount++;
          console.error(`Failed to scrape specs for ${phone.brand} ${phone.model}:`, scrapeErr);
        }

        // Sleep to be nice to GSMArena
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      await finishSyncLog(logId, {
        status: "success",
        phones_processed: phonesProcessed,
        phones_inserted: phonesInserted,
        phones_updated: phonesUpdated,
        images_updated: imagesUpdated,
        errors: errorsCount
      });

      return NextResponse.json({
        message: dryRun ? "GSMArena catalog expansion dry run completed." : "GSMArena catalog expansion completed.",
        brand,
        discoveredCount: discovered.length,
        newPhonesCount: newPhones.length,
        phonesProcessed,
        phonesInserted,
        errorsCount,
        syncedDevices
      });
    }

    // Mode A: Query specific device or batch update existing catalog
    if (queryParam || !queryParam) {
      let phonesToSync: any[] = [];


      if (queryParam) {
        const parts = queryParam.split(" ");
        phonesToSync = [{ brand: parts[0], model: parts.slice(1).join(" ") }];
      } else {
        // Fetch existing phones in catalog to update their specs
        const allPhones = await getPhones();
        // Take a slice sorted by oldest last scraped or simple slice to sync in batch
        phonesToSync = allPhones.slice(0, limit);
      }

      for (const phone of phonesToSync) {
        phonesProcessed++;
        console.log(`Syncing specs with GSMArena for: ${phone.brand} ${phone.model}`);
        const result = await searchGSMArena(phone.brand, phone.model);
        
        if (result) {
          const specs = parseSpecs(result.html, result.url);
          const localSlug = generatePhoneSlug(phone.brand, phone.model);

          // Find if phone exists by matching brand/model
          const { data: dbPhone, error: fetchErr } = await (supabase.from("phones") as any)
            .select("id, image_url, display, chipset, battery, camera, processor, ram, storage, os, rating, image_source, launch_year")
            .eq("brand", phone.brand)
            .eq("model", phone.model)
            .maybeSingle();

          if (fetchErr) {
            errorsCount++;
            console.error("DB fetch error in GSMArena sync:", fetchErr);
            continue;
          }

          if (dbPhone) {
            // Check if specs changed
            const specsChanged = 
              dbPhone.display !== specs.display ||
              dbPhone.chipset !== specs.processor ||
              dbPhone.battery !== specs.battery ||
              dbPhone.camera !== specs.camera ||
              dbPhone.processor !== specs.processor ||
              dbPhone.ram !== specs.ram ||
              dbPhone.storage !== specs.storage ||
              dbPhone.os !== specs.os ||
              Number(dbPhone.rating) !== Number(specs.rating) ||
              dbPhone.launch_year !== specs.launchYear;

            const imageChanged = dbPhone.image_url !== specs.imageUrl && specs.imageUrl !== "";

            if (specsChanged || imageChanged) {
              const updatePayload: any = {
                display: specs.display,
                chipset: specs.processor, // back-compat
                processor: specs.processor,
                battery: specs.battery,
                camera: specs.camera,
                ram: specs.ram,
                storage: specs.storage,
                os: specs.os,
                rating: specs.rating,
                launch_year: specs.launchYear,
                slug: localSlug,
                prices_last_scraped: new Date().toISOString(),
                last_synced_at: new Date().toISOString()
              };

              if (imageChanged) {
                updatePayload.image_url = specs.imageUrl;
                updatePayload.thumbnail_url = specs.imageUrl; // update thumbnail
                updatePayload.image_source = "gsmarena";
              }

              if (dryRun) {
                phonesUpdated++;
                if (imageChanged) imagesUpdated++;
                syncedDevices.push({ brand: phone.brand, model: phone.model, action: "updated (dry run)" });
              } else {
                const { error: updateErr } = await (supabaseAdmin.from("phones") as any)
                   .update(updatePayload)
                   .eq("id", dbPhone.id);

                if (!updateErr) {
                  phonesUpdated++;
                  if (imageChanged) imagesUpdated++;
                  syncedDevices.push({ brand: phone.brand, model: phone.model, action: "updated" });
                } else {
                  errorsCount++;
                  console.error("DB update error in GSMArena sync:", updateErr);
                }
              }
            } else {
              if (!dryRun) {
                // Always update last_synced_at to mark successful sync
                await (supabaseAdmin.from("phones") as any)
                  .update({ last_synced_at: new Date().toISOString() })
                  .eq("id", dbPhone.id);
              }
              syncedDevices.push({ brand: phone.brand, model: phone.model, action: "no_change" });
            }
          } else {
            // Phone does not exist (e.g. query mode found something new)
            const scoreCamera = calculateCameraScore(specs.camera);
            const scoreBattery = calculateBatteryScore(specs.battery);
            const scoreGaming = calculateGamingScore(specs.processor);
            const basePrice = specs.price || 24999;

            const aiReview = generateAiReview(
              phone.brand,
              phone.model,
              specs.display,
              specs.processor,
              specs.battery,
              specs.camera,
              scoreCamera,
              scoreGaming,
              scoreBattery
            );

            const insertPayload = {
              brand: phone.brand,
              model: phone.model,
              price: basePrice,
              display: specs.display,
              chipset: specs.processor,
              processor: specs.processor,
              battery: specs.battery,
              camera: specs.camera,
              ram: specs.ram,
              storage: specs.storage,
              os: specs.os,
              rating: specs.rating,
              launch_year: specs.launchYear,
              slug: localSlug,
              image_url: specs.imageUrl,
              thumbnail_url: specs.imageUrl,
              image_source: specs.imageUrl ? "gsmarena" : null,
              score_camera: scoreCamera,
              score_gaming: scoreGaming,
              score_battery: scoreBattery,
              ai_review: aiReview,
              active: true,
              market_status: "ACTIVE",
              prices_last_scraped: new Date().toISOString(),
              last_synced_at: new Date().toISOString()
            };


            if (dryRun) {
              phonesInserted++;
              if (specs.imageUrl) imagesUpdated++;
              syncedDevices.push({ brand: phone.brand, model: phone.model, action: "inserted (dry run)" });
            } else {
              const { error: insertErr } = await (supabaseAdmin.from("phones") as any)
                 .insert(insertPayload);

              if (!insertErr) {
                phonesInserted++;
                if (specs.imageUrl) imagesUpdated++;
                syncedDevices.push({ brand: phone.brand, model: phone.model, action: "inserted" });
              } else {
                errorsCount++;
                console.error("DB insert error in GSMArena sync:", insertErr);
              }
            }
          }
        } else {
          errorsCount++;
        }
        
        // Brief sleep to be nice to GSMArena
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    // Mode B: Discover new devices from GSMArena homepage (Latest devices)
    if (!queryParam) {
      console.log("Checking GSMArena homepage for latest devices...");
      const latestUrls = await scrapeLatestDevices();
      
      // Sync up to 3 new devices found on homepage to stay in batch limits
      let discoveryCount = 0;
      for (const url of latestUrls) {
        if (discoveryCount >= limit) break;

        const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        let html = "";
        try {
          const detailResponse = await fetchWithTimeout(url, { headers: { "User-Agent": userAgent } });
          if (detailResponse.ok) html = await detailResponse.text();
        } catch (e) {
          errorsCount++;
          continue;
        }

        if (!html) {
          errorsCount++;
          continue;
        }
        
        phonesProcessed++;
        const specs = parseSpecs(html, url);
        const { brand, model } = extractBrandAndModel(specs.rawTitle);
        const localSlug = generatePhoneSlug(brand, model);

        // Check if device already exists
        const { data: existing, error: existErr } = await (supabase.from("phones") as any)
          .select("id")
          .eq("brand", brand)
          .eq("model", model)
          .maybeSingle();

        if (existErr) {
          errorsCount++;
          console.error("DB check existence error in discovery sync:", existErr);
          continue;
        }

        if (!existing) {
          console.log(`Discovered new device on GSMArena homepage: ${brand} ${model}`);
          const scoreCamera = calculateCameraScore(specs.camera);
          const scoreBattery = calculateBatteryScore(specs.battery);
          const scoreGaming = calculateGamingScore(specs.processor);
          const basePrice = specs.price || 29999;

          const aiReview = generateAiReview(
            brand,
            model,
            specs.display,
            specs.processor,
            specs.battery,
            specs.camera,
            scoreCamera,
            scoreGaming,
            scoreBattery
          );

          const insertPayload = {
            brand,
            model,
            price: basePrice,
            display: specs.display,
            chipset: specs.processor,
            processor: specs.processor,
            battery: specs.battery,
            camera: specs.camera,
            ram: specs.ram,
            storage: specs.storage,
            os: specs.os,
            rating: specs.rating,
            slug: localSlug,
            image_url: specs.imageUrl,
            thumbnail_url: specs.imageUrl,
            image_source: specs.imageUrl ? "gsmarena" : null,
            score_camera: scoreCamera,
            score_gaming: scoreGaming,
            score_battery: scoreBattery,
            ai_review: aiReview,
            active: true,
            market_status: "ACTIVE",
            prices_last_scraped: new Date().toISOString(),
            last_synced_at: new Date().toISOString()
          };

          if (dryRun) {
            phonesInserted++;
            discoveryCount++;
            if (specs.imageUrl) imagesUpdated++;
            syncedDevices.push({ brand, model, action: "discovered_inserted (dry run)" });
          } else {
            const { error: insertErr } = await (supabaseAdmin.from("phones") as any)
              .insert(insertPayload);

            if (!insertErr) {
              phonesInserted++;
              discoveryCount++;
              if (specs.imageUrl) imagesUpdated++;
              syncedDevices.push({ brand, model, action: "discovered_inserted" });
            } else {
              errorsCount++;
              console.error("DB discovery insert error:", insertErr);
            }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    // Success sync log update
    await finishSyncLog(logId, {
      status: "success",
      phones_processed: phonesProcessed,
      phones_inserted: phonesInserted,
      phones_updated: phonesUpdated,
      images_updated: imagesUpdated,
      errors: errorsCount
    });

    return NextResponse.json({
      message: dryRun ? "GSMArena dry run completed." : "GSMArena sync completed.",
      phonesProcessed,
      phonesInserted,
      phonesUpdated,
      imagesUpdated,
      errorsCount,
      syncedCount: syncedDevices.length,
      syncedDevices
    });

  } catch (error: any) {
    console.error("GSMArena sync API route failed:", error);
    if (logId) {
      await finishSyncLog(logId, {
        status: "failed",
        error_message: error.message || String(error),
        phones_processed: phonesProcessed,
        phones_inserted: phonesInserted,
        phones_updated: phonesUpdated,
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
