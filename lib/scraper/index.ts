import { chromium } from "playwright";
import { HOSTS } from "../sources";
import { scrapeLumaHost, type RawLumaEvent } from "./luma";
import { scrapeWebHost } from "./web";

export interface ScrapeFailure {
  sourceSlug: string;
  reason: string;
}

export interface ScrapeResult {
  events: RawLumaEvent[];
  failures: ScrapeFailure[];
  sourcesAttempted: number;
  sourcesSucceeded: number;
}

/**
 * Run the full scrape across all configured hosts.
 *
 * Strategy:
 *   - Single shared Chromium instance to amortize startup cost.
 *   - Process hosts sequentially to be polite (no parallelism).
 *   - Per-host timeout via Promise.race; failed hosts are recorded but
 *     don't abort the run.
 *   - Dedupe by URL across all hosts.
 */
export async function runScrape(opts: {
  perHostTimeoutMs?: number;
} = {}): Promise<ScrapeResult> {
  const perHostTimeoutMs = opts.perHostTimeoutMs ?? 90_000;

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const failures: ScrapeFailure[] = [];
  const collected: RawLumaEvent[] = [];

  try {
    for (const host of HOSTS) {
      const label = `[scrape] ${host.slug} (${host.sourceType})`;
      console.log(`${label} starting…`);

      try {
        const events = await Promise.race([
          host.sourceType === "luma"
            ? scrapeLumaHost(browser, host)
            : scrapeWebHost(browser, host),
          new Promise<RawLumaEvent[]>((_, reject) =>
            setTimeout(
              () => reject(new Error(`timeout after ${perHostTimeoutMs}ms`)),
              perHostTimeoutMs,
            ),
          ),
        ]);

        collected.push(...events);
        console.log(`${label} OK (${events.length} events)`);
      } catch (err) {
        const reason = (err as Error).message ?? String(err);
        failures.push({ sourceSlug: host.slug, reason });
        console.warn(`${label} FAILED: ${reason}`);
      }
    }
  } finally {
    await browser.close();
  }

  const deduped = dedupeByUrl(collected);

  return {
    events: deduped,
    failures,
    sourcesAttempted: HOSTS.length,
    sourcesSucceeded: HOSTS.length - failures.length,
  };
}

function dedupeByUrl(events: RawLumaEvent[]): RawLumaEvent[] {
  const seen = new Map<string, RawLumaEvent>();
  for (const e of events) {
    const key = e.url.replace(/\/$/, "").toLowerCase();
    if (!seen.has(key)) seen.set(key, e);
  }
  return Array.from(seen.values());
}
