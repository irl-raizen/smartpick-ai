import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKeyHeader = request.headers.get("x-api-key") || searchParams.get("apiKey");
    const configuredApiKey = process.env.N8N_API_KEY;

    if (!configuredApiKey) {
      return NextResponse.json(
        { error: "N8N_API_KEY is not configured in the application environment." },
        { status: 500 }
      );
    }

    if (apiKeyHeader !== configuredApiKey) {
      return NextResponse.json(
        { error: "Unauthorized. Missing or invalid credentials." },
        { status: 401 }
      );
    }

    const source = searchParams.get("source");
    const status = searchParams.get("status");
    
    // Pagination parameters
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("sync_logs")
      .select("*", { count: "exact" });

    if (source) {
      query = query.eq("source", source);
    }

    if (status) {
      query = query.eq("status", status);
    }

    query = query
      .order("started_at", { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error("Failed to query sync logs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      logs: data ?? [],
      total: count ?? 0
    });
  } catch (error: any) {
    console.error("Failed to get sync logs:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
