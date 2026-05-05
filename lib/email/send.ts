import { Resend } from "resend";
import { render } from "@react-email/render";
import type { Event } from "../types";
import { DigestEmail } from "./digest";

interface SendDigestArgs {
  events: Event[];
  generatedAt: string;
  dashboardUrl: string;
}

/**
 * Send the Monday digest. Picks the top 5 events by fit score and ships them
 * to DIGEST_TO via Resend. Returns ok=true on success, otherwise an error
 * payload — never throws so the cron can keep going.
 */
export async function sendDigest(
  args: SendDigestArgs,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DIGEST_FROM;
  const toRaw = process.env.DIGEST_TO;

  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };
  if (!from) return { ok: false, error: "DIGEST_FROM not set" };
  if (!toRaw) return { ok: false, error: "DIGEST_TO not set" };

  const to = toRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const future = args.events
    .filter((e) => new Date(e.startDate).getTime() >= Date.now())
    .sort((a, b) => b.score.fitScore - a.score.fitScore);

  const top = future.slice(0, 5);

  if (top.length === 0) {
    return { ok: false, error: "No future events to email" };
  }

  const totals = {
    total: future.length,
    tier1: future.filter((e) => e.tier === 1).length,
    tier2: future.filter((e) => e.tier === 2).length,
    tier3: future.filter((e) => e.tier === 3).length,
    hackathons: future.filter((e) => e.format === "hackathon").length,
  };

  const subject = `CAIS Sourcing · ${totals.tier1} Tier 1 · ${top.length} top picks`;

  const html = await render(
    DigestEmail({
      generatedAt: args.generatedAt,
      topEvents: top,
      totals,
      dashboardUrl: args.dashboardUrl,
    }),
  );

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, id: result.data?.id ?? "unknown" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
