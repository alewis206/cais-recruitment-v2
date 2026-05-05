import type { Browser, Page } from "playwright";
import type { Host } from "../types";

/**
 * Raw event extracted from a Lu.ma calendar page.
 * The scoring layer turns these into full Event objects.
 */
export interface RawLumaEvent {
  url: string;
  title: string;
  startDate: string; // ISO
  endDate?: string;
  venue?: string;
  city?: string;
  description?: string;
  hostSlug: string;
  hostName: string;
}

const NAV_TIMEOUT_MS = 30_000;
const SF_KEYWORDS = [
  "san francisco",
  "sf,",
  ", sf",
  "bay area",
  "soma",
  "mission",
  "presidio",
  "hayes valley",
  "palo alto",
  "mountain view",
  "berkeley",
  "oakland",
  "menlo park",
  "hillsborough",
];

/**
 * Scrape one Lu.ma host calendar. Returns raw events; throws on hard failure
 * so the orchestrator can record the source as failed and continue.
 */
export async function scrapeLumaHost(
  browser: Browser,
  host: Host,
): Promise<RawLumaEvent[]> {
  if (host.sourceType !== "luma") {
    throw new Error(`Host ${host.slug} is not a Lu.ma source`);
  }

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
    await page.goto(host.url, {
      timeout: NAV_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });

    // Lu.ma renders client-side. Wait for the events list or the empty state.
    await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT_MS });

    const eventLinks = await collectEventLinks(page);
    const raw: RawLumaEvent[] = [];

    for (const link of eventLinks) {
      try {
        const ev = await scrapeLumaEvent(page, link, host);
        if (ev && isLikelySfEvent(ev)) {
          raw.push(ev);
        }
      } catch (err) {
        console.warn(`[luma] event ${link} failed:`, (err as Error).message);
      }
    }

    return raw;
  } finally {
    await context.close();
  }
}

/**
 * Lu.ma calendar pages render event cards as anchors to /<event-slug>.
 * We pick all links that look like event detail URLs.
 */
async function collectEventLinks(page: Page): Promise<string[]> {
  const hrefs = await page.$$eval("a[href^='/']", (anchors) =>
    anchors
      .map((a) => (a as HTMLAnchorElement).href)
      .filter((h) => /https?:\/\/(?:lu\.ma|luma\.com)\/[a-z0-9-]+\/?$/i.test(h)),
  );
  // Drop hub paths (calendar slugs) — we want individual event pages.
  // Lu.ma event slugs are lowercase alnum; calendar slugs are too, but events
  // tend to be short hashes. Conservative approach: dedupe and let the event
  // page filter handle the rest by failing to find event metadata.
  const uniq = Array.from(new Set(hrefs));
  return uniq.slice(0, 25); // cap per host to control runtime
}

async function scrapeLumaEvent(
  page: Page,
  url: string,
  host: Host,
): Promise<RawLumaEvent | null> {
  const resp = await page.goto(url, {
    timeout: NAV_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });
  if (!resp || !resp.ok()) return null;

  // Lu.ma includes JSON-LD with event metadata. Parse it preferentially —
  // it's stable across UI changes.
  const jsonLd = await page
    .$$eval("script[type='application/ld+json']", (scripts) =>
      scripts.map((s) => s.textContent ?? ""),
    )
    .catch(() => [] as string[]);

  for (const blob of jsonLd) {
    try {
      const parsed = JSON.parse(blob);
      const events = Array.isArray(parsed) ? parsed : [parsed];
      for (const e of events) {
        if (e["@type"] === "Event" && e.startDate) {
          return {
            url,
            title: String(e.name ?? "").trim(),
            startDate: String(e.startDate),
            endDate: e.endDate ? String(e.endDate) : undefined,
            venue: extractVenue(e.location),
            city: extractCity(e.location),
            description: e.description
              ? String(e.description).slice(0, 800)
              : undefined,
            hostSlug: host.slug,
            hostName: host.name,
          };
        }
      }
    } catch {
      // ignore malformed blob
    }
  }

  return null;
}

function extractVenue(loc: unknown): string | undefined {
  if (!loc || typeof loc !== "object") return undefined;
  const l = loc as Record<string, unknown>;
  const name = typeof l.name === "string" ? l.name : undefined;
  return name?.trim();
}

function extractCity(loc: unknown): string | undefined {
  if (!loc || typeof loc !== "object") return undefined;
  const l = loc as Record<string, unknown>;
  const addr = l.address;
  if (addr && typeof addr === "object") {
    const a = addr as Record<string, unknown>;
    const city = typeof a.addressLocality === "string" ? a.addressLocality : undefined;
    return city?.trim();
  }
  return undefined;
}

function isLikelySfEvent(ev: RawLumaEvent): boolean {
  const haystack = [ev.venue, ev.city, ev.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack) return true; // when in doubt, include and let scoring handle
  return SF_KEYWORDS.some((kw) => haystack.includes(kw));
}
