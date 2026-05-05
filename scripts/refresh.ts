/**
 * Weekly refresh: scrape → score → write events.json → send Monday digest.
 *
 * Run locally:    npm run refresh
 * Run via cron:   .github/workflows/weekly-refresh.yml
 *
 * Flags:
 *   --no-email     skip the Resend digest (for dry runs)
 *   --no-write     skip writing data/events.json (for testing scrapers)
 *   --no-llm       force rule-based scoring (cheaper, deterministic)
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { runScrape } from "../lib/scraper";
import { scoreEvent, buildEvent } from "../lib/scoring/score";
import { writeEventsFile } from "../lib/data";
import { sendDigest } from "../lib/email/send";
import { HOSTS_BY_SLUG } from "../lib/sources";
import type { Event, EventsFile } from "../lib/types";

interface Flags {
  email: boolean;
  write: boolean;
  llm: boolean;
}

function parseFlags(argv: string[]): Flags {
  return {
    email: !argv.includes("--no-email"),
    write: !argv.includes("--no-write"),
    llm: !argv.includes("--no-llm"),
  };
}

async function loadManualEvents(): Promise<Event[]> {
  // Optional override file: hand-curated events that the scraper can't
  // reliably surface (Tier 3 dinners, leaked invite-onlys, etc.)
  const p = path.join(process.cwd(), "data", "manual-events.json");
  try {
    const text = await fs.readFile(p, "utf8");
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed as Event[];
    return [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    console.warn("[refresh] manual-events.json invalid, ignoring:", err);
    return [];
  }
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (!flags.llm) process.env.SCORING_RULES_ONLY = "1";

  const startedAt = Date.now();
  console.log("[refresh] starting weekly run");
  console.log("[refresh] flags:", flags);

  // 1. Scrape
  const scrape = await runScrape();
  console.log(
    `[refresh] scraped ${scrape.events.length} raw events from ` +
      `${scrape.sourcesSucceeded}/${scrape.sourcesAttempted} sources`,
  );

  // 2. Score
  const scored: Event[] = [];
  for (const raw of scrape.events) {
    const host = HOSTS_BY_SLUG.get(raw.hostSlug);
    if (!host) {
      console.warn(`[refresh] missing host registry for slug=${raw.hostSlug}`);
      continue;
    }
    try {
      const { score, format } = await scoreEvent({ raw, host });
      scored.push(buildEvent(raw, host, score, format));
    } catch (err) {
      console.warn(`[refresh] scoring failed for ${raw.url}:`, err);
    }
  }
  console.log(`[refresh] scored ${scored.length} events`);

  // 3. Merge in manual events
  const manual = await loadManualEvents();
  const seen = new Set(scored.map((e) => e.id));
  for (const m of manual) {
    if (!seen.has(m.id)) scored.push(m);
  }
  if (manual.length > 0) {
    console.log(`[refresh] merged ${manual.length} manual events`);
  }

  // 4. Sort by score, drop past events
  const now = Date.now();
  const finalEvents = scored
    .filter((e) => new Date(e.startDate).getTime() >= now - 24 * 60 * 60 * 1000)
    .sort((a, b) => b.score.fitScore - a.score.fitScore);

  const file: EventsFile = {
    generatedAt: new Date().toISOString(),
    generatedBy: "weekly-refresh",
    events: finalEvents,
    scrapeReport: {
      sourcesAttempted: scrape.sourcesAttempted,
      sourcesSucceeded: scrape.sourcesSucceeded,
      eventsFound: scrape.events.length,
      eventsScored: scored.length,
      failures: scrape.failures,
    },
  };

  // 5. Write
  if (flags.write) {
    await writeEventsFile(file);
    console.log("[refresh] wrote data/events.json");
  } else {
    console.log("[refresh] --no-write set, skipping disk write");
  }

  // 6. Email
  if (flags.email) {
    const dashboardUrl = process.env.DASHBOARD_URL ?? "https://example.com";
    const result = await sendDigest({
      events: finalEvents,
      generatedAt: file.generatedAt,
      dashboardUrl,
    });
    if (result.ok) {
      console.log(`[refresh] digest sent (id=${result.id})`);
    } else {
      console.warn(`[refresh] digest send failed: ${result.error}`);
    }
  } else {
    console.log("[refresh] --no-email set, skipping digest");
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[refresh] done in ${elapsed}s`);
}

main().catch((err) => {
  console.error("[refresh] fatal:", err);
  process.exit(1);
});
