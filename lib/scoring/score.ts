import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Event, Format, Score } from "../types";
import type { Host } from "../types";
import type { RawLumaEvent } from "../scraper/luma";
import { SCORING_SYSTEM_PROMPT } from "./rubric";

const LlmResponseSchema = z.object({
  fit_score: z.number().min(0).max(100),
  reasoning: z.string().min(1),
  suggested_action: z.string().min(1),
  archetype_matches: z.array(z.string()).default([]),
  warm_intro_needed: z.boolean().default(false),
  format: z.enum([
    "conference",
    "talk",
    "meetup",
    "hackathon",
    "dinner",
    "demo",
    "other",
  ]),
});

const MODEL = "claude-haiku-4-5-20251001";

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  cached = new Anthropic({ apiKey });
  return cached;
}

interface ScoringInput {
  raw: RawLumaEvent;
  host: Host;
}

interface ScoringOutput {
  score: Score;
  format: Format;
}

/**
 * Score one event using Claude Haiku 4.5. Falls back to rule-based scoring
 * on any error so the run never fails because of one bad event.
 */
export async function scoreEvent(input: ScoringInput): Promise<ScoringOutput> {
  if (process.env.SCORING_RULES_ONLY === "1") {
    return ruleBasedScore(input);
  }

  try {
    const userMsg = renderEventForScoring(input);
    const resp = await client().messages.create({
      model: MODEL,
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: SCORING_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMsg }],
    });

    const text = resp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");

    const parsed = LlmResponseSchema.parse(JSON.parse(stripFence(text)));

    return {
      score: {
        fitScore: parsed.fit_score,
        reasoning: parsed.reasoning,
        suggestedAction: parsed.suggested_action,
        archetypeMatches: parsed.archetype_matches,
        warmIntroNeeded: parsed.warm_intro_needed,
        scoringMethod: "llm",
      },
      format: parsed.format,
    };
  } catch (err) {
    console.warn(
      `[scoring] LLM failed for ${input.raw.url}, falling back to rules:`,
      (err as Error).message,
    );
    return ruleBasedScore(input);
  }
}

function renderEventForScoring(input: ScoringInput): string {
  const { raw, host } = input;
  const lines = [
    `Event title: ${raw.title}`,
    `URL: ${raw.url}`,
    `Host: ${host.name} (tier ${host.tier}, base score ${host.baseScore})`,
    `Host notes: ${host.notes ?? "(none)"}`,
    `Start: ${raw.startDate}`,
  ];
  if (raw.endDate) lines.push(`End: ${raw.endDate}`);
  if (raw.venue) lines.push(`Venue: ${raw.venue}`);
  if (raw.city) lines.push(`City: ${raw.city}`);
  if (raw.description) lines.push(`Description: ${raw.description}`);
  return lines.join("\n");
}

function stripFence(s: string): string {
  // Tolerate ```json ... ``` even though we asked for raw JSON.
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * Rule-based fallback. Used when LLM scoring is disabled or errors out.
 * Honest fit scores grounded in the host tier + format inference.
 */
function ruleBasedScore(input: ScoringInput): ScoringOutput {
  const { raw, host } = input;
  const format = inferFormat(raw.title, raw.description ?? "");
  const formatBonus: Record<Format, number> = {
    dinner: 12,
    hackathon: 6,
    talk: 4,
    conference: 2,
    demo: 2,
    meetup: 0,
    other: -4,
  };
  const tierBonus: Record<1 | 2 | 3 | 4, number> = { 1: 8, 2: 4, 3: 6, 4: 0 };

  const score = clamp(
    Math.round(host.baseScore + formatBonus[format] + tierBonus[host.tier]),
    0,
    100,
  );

  return {
    score: {
      fitScore: score,
      reasoning: `Rule-based score: ${host.tier === 1 ? "Tier 1 host" : `Tier ${host.tier} host`} (${host.name}) running a ${format}. ${host.notes ?? ""}`.trim(),
      suggestedAction:
        format === "dinner"
          ? "Request warm intro"
          : format === "hackathon"
            ? "Apply as judge or mentor"
            : "Attend as participant",
      archetypeMatches: archetypeFromHost(host.slug),
      warmIntroNeeded: format === "dinner" || host.tier === 3,
      scoringMethod: "rules",
    },
    format,
  };
}

function inferFormat(title: string, description: string): Format {
  const hay = (title + " " + description).toLowerCase();
  if (/\bdinner\b|\bsalon\b|\bsupper\b/.test(hay)) return "dinner";
  if (/\bhackathon\b|\bbuildathon\b|\bjam\b/.test(hay)) return "hackathon";
  if (/\bdemo (night|day)\b|\bdemo faire\b/.test(hay)) return "demo";
  if (/\bconference\b|\bsummit\b|\bworld'?s? fair\b/.test(hay)) return "conference";
  if (/\btalk\b|\bfireside\b|\bkeynote\b|\bpaper club\b/.test(hay)) return "talk";
  if (/\bmeetup\b|\bmixer\b/.test(hay)) return "meetup";
  return "other";
}

function archetypeFromHost(slug: string): string[] {
  if (["spc-private", "south-park-commons", "hf0"].includes(slug)) {
    return ["failed-founder"];
  }
  if (["anthropic-events", "openai-events", "ai-engineer", "latent-space"].includes(slug)) {
    return ["ai-native-staff"];
  }
  if (["mlops-community", "ray-summit"].includes(slug)) {
    return ["ai-native-staff", "consulting-lead"];
  }
  return ["ai-native-staff", "failed-founder"];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Build a final Event from a raw scrape + score. Generates a stable id
 * derived from the URL so re-scrapes don't churn ids.
 */
export function buildEvent(
  raw: RawLumaEvent,
  host: Host,
  score: Score,
  format: Format,
): Event {
  return {
    id: stableId(raw.url),
    title: raw.title,
    url: raw.url,
    hostSlug: host.slug,
    hostName: host.name,
    tier: host.tier,
    format,
    startDate: raw.startDate,
    endDate: raw.endDate,
    venue: raw.venue,
    city: raw.city ?? "San Francisco",
    description: raw.description,
    speakers: [],
    score,
    scrapedAt: new Date().toISOString(),
    verified: true,
  };
}

function stableId(url: string): string {
  // Lightweight deterministic hash; collisions are fine for our scale.
  let h = 5381;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) + h + url.charCodeAt(i)) | 0;
  }
  return `evt_${(h >>> 0).toString(36)}`;
}
