import { z } from "zod";

export const TierSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
export type Tier = z.infer<typeof TierSchema>;

export const FormatSchema = z.enum([
  "conference",
  "talk",
  "meetup",
  "hackathon",
  "dinner",
  "demo",
  "other",
]);
export type Format = z.infer<typeof FormatSchema>;

export const SourceTypeSchema = z.enum([
  "luma",
  "eventbrite",
  "web",
  "manual",
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

/**
 * A Host is a recurring organizer/community we monitor (Latent Space, AGI House, etc.)
 * Tier reflects priority for the CAIS Head of Delivery search.
 */
export const HostSchema = z.object({
  slug: z.string(),
  name: z.string(),
  tier: TierSchema,
  baseScore: z.number().min(0).max(100),
  url: z.string().url(),
  sourceType: SourceTypeSchema,
  notes: z.string().optional(),
});
export type Host = z.infer<typeof HostSchema>;

export const ScoreSchema = z.object({
  fitScore: z.number().min(0).max(100),
  reasoning: z.string(),
  suggestedAction: z.string(),
  archetypeMatches: z.array(z.string()),
  warmIntroNeeded: z.boolean().default(false),
  scoringMethod: z.enum(["llm", "rules"]),
});
export type Score = z.infer<typeof ScoreSchema>;

export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  hostSlug: z.string(),
  hostName: z.string(),
  tier: TierSchema,
  format: FormatSchema,
  startDate: z.string(),
  endDate: z.string().optional(),
  venue: z.string().optional(),
  city: z.string().default("San Francisco"),
  description: z.string().optional(),
  rsvpCount: z.number().optional(),
  speakers: z.array(z.string()).default([]),
  score: ScoreSchema,
  scrapedAt: z.string(),
  verified: z.boolean().default(true),
});
export type Event = z.infer<typeof EventSchema>;

export const EventsFileSchema = z.object({
  generatedAt: z.string(),
  generatedBy: z.string(),
  events: z.array(EventSchema),
  scrapeReport: z.object({
    sourcesAttempted: z.number(),
    sourcesSucceeded: z.number(),
    eventsFound: z.number(),
    eventsScored: z.number(),
    failures: z.array(
      z.object({
        sourceSlug: z.string(),
        reason: z.string(),
      }),
    ),
  }),
});
export type EventsFile = z.infer<typeof EventsFileSchema>;
