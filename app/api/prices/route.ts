import { NextResponse } from "next/server";
import { getPhones } from "@/src/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim() === "") {
      return NextResponse.json({ error: "Query parameter 'q' is required." }, { status: 400 });
    }

    const searchQuery = q.trim();
    const queryKey = searchQuery.toLowerCase();

    // 1. Fetch all phones from Supabase
    const phones = await getPhones();

    // 2. Find matching phone in our database
    const match = phones.find(p => 
      queryKey.includes(p.model.toLowerCase()) || 
      queryKey.includes(p.brand.toLowerCase() + " " + p.model.toLowerCase()) ||
      p.model.toLowerCase().includes(queryKey)
    );

    if (!match) {
      return NextResponse.json({ error: "Phone not found in catalog." }, { status: 404 });
    }

    // 3. Extract prices and availability
    const basePrice = match.price;
    
    // Check if scraped cache is available and fresh (within last 24 hours)
    const lastScraped = match.prices_last_scraped ? new Date(match.prices_last_scraped).getTime() : 0;
    const isFresh = lastScraped > 0 && (Date.now() - lastScraped < 24 * 60 * 60 * 1000);
    
    // Determine sources and confidence
    const source = isFresh ? "scraped" : "fallback";
    const confidence = isFresh ? 0.95 : 0.45;

    // Amazon Details
    let amazonPrice = match.amazon_price;
    let amazonAvailable = match.amazon_available !== undefined && match.amazon_available !== null
      ? match.amazon_available
      : true;
    
    if (!amazonPrice) {
      // Generate fallback price with slight variance if never scraped
      const variance = Math.floor(basePrice * (Math.random() * 0.03 - 0.01));
      amazonPrice = Math.round((basePrice + variance) / 10) * 10;
    }

    // Flipkart Details
    let flipkartPrice = match.flipkart_price;
    let flipkartAvailable = match.flipkart_available !== undefined && match.flipkart_available !== null
      ? match.flipkart_available
      : true;
    
    if (!flipkartPrice) {
      // Generate fallback price with slight variance if never scraped
      const variance = Math.floor(basePrice * (Math.random() * 0.03 - 0.02));
      flipkartPrice = Math.round((basePrice + variance) / 10) * 10;
    }

    return NextResponse.json({
      product: searchQuery,
      brand: match.brand,
      model: match.model,
      stores: [
        {
          name: "Amazon",
          price: amazonPrice,
          link: match.amazon_link || `https://www.amazon.in/s?k=${encodeURIComponent(match.brand + " " + match.model)}`,
          available: amazonAvailable,
          source,
          confidence
        },
        {
          name: "Flipkart",
          price: flipkartPrice,
          link: match.flipkart_link || `https://www.flipkart.com/search?q=${encodeURIComponent(match.brand + " " + match.model)}`,
          available: flipkartAvailable,
          source,
          confidence
        }
      ]
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}
