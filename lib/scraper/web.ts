import type { Browser } from "playwright";
import type { Host } from "../types";
import type { RawLumaEvent } from "./luma";

/**
 * Generic event scraper for non-Lu.ma host pages (ai.engineer, anyscale.com,
 * personal blogs, etc.). Uses JSON-LD when available; otherwise returns [].
 *
 * Designed to fail soft: if a host site has no parseable structured data,
 * we record zero events and the source can be hand-augmented via manual
 * entries in data/manual-events.json.
 */
export async function scrapeWebHost(
  browser: Browser,
  host: Host,
): Promise<RawLumaEvent[]> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
  });

  const page = await context.newPage();

  try {
    const resp = await page.goto(host.url, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });
    if (!resp || !resp.ok()) return [];

    const jsonLd = await page
      .$$eval("script[type='application/ld+json']", (scripts) =>
        scripts.map((s) => s.textContent ?? ""),
      )
      .catch(() => [] as string[]);

    const out: RawLumaEvent[] = [];
    for (const blob of jsonLd) {
      try {
        const parsed = JSON.parse(blob);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item["@type"] === "Event" && item.startDate) {
            out.push({
              url: typeof item.url === "string" ? item.url : host.url,
              title: String(item.name ?? "").trim(),
              startDate: String(item.startDate),
              endDate: item.endDate ? String(item.endDate) : undefined,
              venue: extractVenueName(item.location),
              city: extractCityName(item.location),
              description: item.description
                ? String(item.description).slice(0, 800)
                : undefined,
              hostSlug: host.slug,
              hostName: host.name,
            });
          }
        }
      } catch {
        // ignore
      }
    }

    return out;
  } finally {
    await context.close();
  }
}

function extractVenueName(loc: unknown): string | undefined {
  if (!loc) return undefined;
  if (typeof loc === "string") return loc;
  if (typeof loc !== "object") return undefined;
  const l = loc as Record<string, unknown>;
  return typeof l.name === "string" ? l.name : undefined;
}

function extractCityName(loc: unknown): string | undefined {
  if (!loc || typeof loc !== "object") return undefined;
  const l = loc as Record<string, unknown>;
  const addr = l.address;
  if (addr && typeof addr === "object") {
    const a = addr as Record<string, unknown>;
    return typeof a.addressLocality === "string" ? a.addressLocality : undefined;
  }
  return undefined;
}
