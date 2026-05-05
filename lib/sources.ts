import { type Host } from "./types";

/**
 * Sources we monitor for SF AI events.
 *
 * Tier reflects priority for the CAIS Head of Delivery search:
 *   1 = highest archetype density (FDE / Staff Eng / failed founder)
 *   2 = strong adjacent communities
 *   3 = invite-only dinners and salons (often need warm intros)
 *   4 = hackathons (sourcing-rich but require a specific approach)
 *
 * baseScore (0-100) seeds the LLM scorer; LLM can override per event.
 * sourceType tells the scraper which adapter to use.
 */
export const HOSTS: Host[] = [
  // ───────────────────────── Tier 1 ─────────────────────────
  {
    slug: "latent-space",
    name: "Latent Space (swyx)",
    tier: 1,
    baseScore: 92,
    url: "https://lu.ma/ls",
    sourceType: "luma",
    notes: "Highest-density Tier 1. Includes AI Engineer World's Fair org.",
  },
  {
    slug: "ai-engineer",
    name: "AI Engineer Conferences",
    tier: 1,
    baseScore: 95,
    url: "https://www.ai.engineer/",
    sourceType: "web",
    notes: "World's Fair (June) + AI Engineer Summit (Feb). Apply to speak.",
  },
  {
    slug: "mlops-community",
    name: "MLOps Community SF",
    tier: 1,
    baseScore: 86,
    url: "https://lu.ma/mlops-community",
    sourceType: "luma",
    notes: "Demetrios Brinkmann. Production-focused = the scars.",
  },
  {
    slug: "anthropic-events",
    name: "Anthropic Developer Events",
    tier: 1,
    baseScore: 90,
    url: "https://www.anthropic.com/events",
    sourceType: "web",
    notes: "DevDays, partner events. SAs themselves are candidates.",
  },
  {
    slug: "openai-events",
    name: "OpenAI Developer Events",
    tier: 1,
    baseScore: 88,
    url: "https://openai.com/events",
    sourceType: "web",
    notes: "DevDay, hackathons. SAs are candidates.",
  },
  {
    slug: "langchain",
    name: "LangChain",
    tier: 1,
    baseScore: 78,
    url: "https://lu.ma/langchain",
    sourceType: "luma",
    notes: "Framework-specific = active builders. Skews junior; filter hard.",
  },
  {
    slug: "dspy",
    name: "DSPy Community",
    tier: 1,
    baseScore: 80,
    url: "https://lu.ma/dspy",
    sourceType: "luma",
    notes: "Stanford-adjacent, high-signal builders.",
  },

  // ───────────────────────── Tier 2 ─────────────────────────
  {
    slug: "agi-house",
    name: "AGI House SF",
    tier: 2,
    baseScore: 82,
    url: "https://lu.ma/agi-house",
    sourceType: "luma",
    notes: "Multiple hackathons/month. Solo builders = failed-founder density.",
  },
  {
    slug: "cerebral-valley",
    name: "Cerebral Valley",
    tier: 2,
    baseScore: 78,
    url: "https://lu.ma/cerebralvalley",
    sourceType: "luma",
    notes: "Demo nights, larger rooms (~200). Wider net.",
  },
  {
    slug: "south-park-commons",
    name: "South Park Commons (public events)",
    tier: 2,
    baseScore: 88,
    url: "https://lu.ma/southparkcommons-events",
    sourceType: "luma",
    notes: "'Between things' demographic. Public events only without sponsor.",
  },
  {
    slug: "ai-tinkerers",
    name: "AI Tinkerers SF",
    tier: 2,
    baseScore: 76,
    url: "https://sf.aitinkerers.org/",
    sourceType: "web",
    notes: "Monthly demos, free. 120k+ Bond AI overlap.",
  },
  {
    slug: "bond-ai",
    name: "Bond AI / GenAI SF",
    tier: 2,
    baseScore: 70,
    url: "https://lu.ma/genai-sf",
    sourceType: "luma",
    notes: "Largest aggregator. High frequency, lower archetype density.",
  },
  {
    slug: "shack15",
    name: "Shack15 (Ferry Building)",
    tier: 2,
    baseScore: 75,
    url: "https://lu.ma/shack15",
    sourceType: "luma",
    notes: "Tech/AI community space. Hosts many Tier 1 evening events.",
  },
  {
    slug: "ray-summit",
    name: "Ray Summit (Anyscale)",
    tier: 2,
    baseScore: 80,
    url: "https://www.anyscale.com/ray-summit",
    sourceType: "web",
    notes: "Annual conference (~Sept). Infra-savvy production practitioners.",
  },
  {
    slug: "ai-council",
    name: "AI Council Conference",
    tier: 2,
    baseScore: 78,
    url: "https://aicouncil.com/sf-2026",
    sourceType: "web",
    notes: "Multi-track SF conference, OpenAI/Anthropic/Databricks speakers.",
  },

  // ───────────────────────── Tier 3 ─────────────────────────
  // Invite-only — most don't surface publicly. We track host pages for any
  // public talks they do, then flag warm-intro paths.
  {
    slug: "hamel-husain",
    name: "Hamel Husain (operator dinners)",
    tier: 3,
    baseScore: 94,
    url: "https://hamel.dev/",
    sourceType: "web",
    notes: "Curates aggressively for the exact archetype. Warm intro required.",
  },
  {
    slug: "eugene-yan",
    name: "Eugene Yan (reading group/dinners)",
    tier: 3,
    baseScore: 88,
    url: "https://eugeneyan.com/",
    sourceType: "web",
    notes: "Production AI focus. Smaller rooms.",
  },
  {
    slug: "jason-liu",
    name: "Jason Liu (Instructor meetups)",
    tier: 3,
    baseScore: 84,
    url: "https://jxnl.co/",
    sourceType: "web",
    notes: "Structured outputs / production patterns crowd.",
  },
  {
    slug: "spc-private",
    name: "South Park Commons (member dinners)",
    tier: 3,
    baseScore: 90,
    url: "https://www.southparkcommons.com/events",
    sourceType: "web",
    notes: "Member-only. Need SPC sponsor for invite.",
  },
  {
    slug: "hf0",
    name: "HF0 (Hacker Fellowship Zero)",
    tier: 3,
    baseScore: 86,
    url: "https://www.hf0.com/",
    sourceType: "web",
    notes: "Fellow demo events. Failed-founder hunting ground.",
  },
];

export function getHost(slug: string): Host | undefined {
  return HOSTS.find((h) => h.slug === slug);
}

export const HOSTS_BY_SLUG = new Map(HOSTS.map((h) => [h.slug, h]));
