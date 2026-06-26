import { NextResponse } from "next/server";
import { getPhones, supabase } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const issues: { issue: string; severity: "CRITICAL" | "WARNING" | "INFO"; recommendation: string }[] = [];
  
  let dbHealthy = false;
  let phonesCount = 0;
  let missingImages = 0;
  let coveragePercentage = 0;
  let brokenLinksCount = 0;
  let syncSuccessRate = 100;
  let totalSyncLogs = 0;
  let missingColumnsList: string[] = [];

  try {
    // 1. Check Database Health & Schema columns
    const { data: testPhone, error: colError } = await supabase
      .from("phones")
      .select("*")
      .limit(1);

    if (colError) {
      issues.push({
        issue: `Database check error: ${colError.message}`,
        severity: "CRITICAL",
        recommendation: "Verify Supabase connection variables in .env.local and run the seed queries in phones.sql."
      });
    } else {
      dbHealthy = true;
      const expectedColumns = [
        "image_url", "amazon_link", "flipkart_link", "image_source", "last_synced_at",
        "slug", "thumbnail_url", "processor", "ram", "storage", "os", "rating", "launch_year"
      ];

      if (testPhone && testPhone.length > 0) {
        const actualKeys = Object.keys(testPhone[0]);
        expectedColumns.forEach((col) => {
          if (!actualKeys.includes(col)) {
            missingColumnsList.push(col);
          }
        });
      } else {
        // Table is empty
        issues.push({
          issue: "Phones table exists but is empty.",
          severity: "WARNING",
          recommendation: "Seed the phones table with initial smartphone details."
        });
      }
    }

    // 2. Query Row counts & image stats
    const phones = await getPhones();
    phonesCount = phones.length;

    const phonesWithImages = phones.filter(
      (phone) => phone.image_url && phone.image_url.trim() !== ""
    ).length;
    missingImages = phonesCount - phonesWithImages;
    coveragePercentage = phonesCount > 0 ? (phonesWithImages / phonesCount) * 100 : 0;

    if (phonesCount < 300) {
      issues.push({
        issue: `Catalog size is small: ${phonesCount} phones.`,
        severity: "WARNING",
        recommendation: "Run scratch/expand-catalog.js locally to discover and sync more phones from GSMArena to reach 300+."
      });
    }

    if (coveragePercentage < 95) {
      issues.push({
        issue: `Image coverage is ${coveragePercentage.toFixed(1)}%, which is below the 95% target.`,
        severity: "WARNING",
        recommendation: "Trigger Amazon and Flipkart scrapers to find and fill in missing images."
      });
    }

    // 3. Affiliate links validation
    phones.forEach((phone) => {
      const missingAmazon = !phone.amazon_link || phone.amazon_link.trim() === "";
      const missingFlipkart = !phone.flipkart_link || phone.flipkart_link.trim() === "";
      if (missingAmazon && missingFlipkart) {
        brokenLinksCount++;
      }
    });

    if (brokenLinksCount > 0) {
      issues.push({
        issue: `${brokenLinksCount} phones have no Amazon or Flipkart links.`,
        severity: "WARNING",
        recommendation: "Run sync-amazon and sync-flipkart sync endpoints to resolve affiliate URLs."
      });
    }

    // 4. Sync Logs and Scraper Health
    try {
      const { data: logs, error: logsError } = await (supabase
        .from("sync_logs") as any)
        .select("status")
        .order("started_at", { ascending: false })
        .limit(50);

      if (logsError) {
        issues.push({
          issue: "sync_logs table is missing or cannot be queried.",
          severity: "CRITICAL",
          recommendation: "Execute the migration SQL file (supabase_migration.sql) to create the sync_logs table."
        });
      } else if (logs && logs.length > 0) {
        totalSyncLogs = logs.length;
        const successful = logs.filter((l: any) => l.status === "success").length;
        syncSuccessRate = (successful / totalSyncLogs) * 100;


        if (syncSuccessRate < 85) {
          issues.push({
            issue: `Sync success rate is low: ${syncSuccessRate.toFixed(1)}%.`,
            severity: "WARNING",
            recommendation: "Check sync logs for timeout or scraper block errors (Access Denied/Capthca) and rotate User-Agents."
          });
        }
      }
    } catch (e) {
      issues.push({
        issue: "Sync logs table is missing.",
        severity: "CRITICAL",
        recommendation: "Execute supabase_migration.sql in the Supabase SQL editor."
      });
    }

    // 5. Analytics Events table health
    try {
      const { error: analError } = await (supabase
        .from("analytics_events") as any)
        .select("id")
        .limit(1);

      if (analError) {
        issues.push({
          issue: "analytics_events table is missing or cannot be queried.",
          severity: "CRITICAL",
          recommendation: "Execute the migration SQL file (supabase_migration.sql) to create the analytics_events table."
        });
      }
    } catch (e) {
      issues.push({
        issue: "Analytics events table is missing.",
        severity: "CRITICAL",
        recommendation: "Execute supabase_migration.sql in the Supabase SQL editor."
      });
    }

    if (missingColumnsList.length > 0) {
      issues.push({
        issue: `Phones table is missing these columns: ${missingColumnsList.join(", ")}.`,
        severity: "CRITICAL",
        recommendation: "Execute the DDL alter statements in `supabase_migration.sql` in the Supabase SQL editor."
      });
    }

    return NextResponse.json({
      auditCompletedAt: new Date().toISOString(),
      healthSummary: {
        databaseHealthy: dbHealthy && missingColumnsList.length === 0,
        phonesCount,
        imageCoverage: `${coveragePercentage.toFixed(1)}%`,
        brokenLinks: brokenLinksCount,
        syncSuccessRate: `${syncSuccessRate.toFixed(1)}%`,
        missingColumns: missingColumnsList
      },
      issuesCount: issues.length,
      issues
    });

  } catch (error: any) {
    console.error("Audit API route failed:", error);
    return NextResponse.json({
      error: error.message || "Internal Server Error",
      issues: [{
        issue: "Audit pipeline crashed.",
        severity: "CRITICAL",
        recommendation: "Check Server logs and Supabase configuration variables."
      }]
    }, { status: 500 });
  }
}
