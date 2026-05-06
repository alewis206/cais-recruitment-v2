import { AgentMailClient } from "agentmail";
import { render } from "@react-email/render";
import type { Event } from "../types";
import { DigestEmail } from "./digest";

interface SendDigestArgs {
  events: Event[];
  generatedAt: string;
  dashboardUrl: string;
}

/**
 * Send the Monday digest via AgentMail. Picks the top 5 events by fit
 * score and ships them to DIGEST_TO from the configured AGENTMAIL_INBOX.
 *
 * Returns ok=true on success, otherwise an error payload — never throws
 * so the cron run never fails because of an email failure.
 */
export async function sendDigest(
  args: SendDigestArgs,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  const inboxId = process.env.AGENTMAIL_INBOX;
  const toRaw = process.env.DIGEST_TO;

  if (!apiKey) return { ok: false, error: "AGENTMAIL_API_KEY not set" };
  if (!inboxId) return { ok: false, error: "AGENTMAIL_INBOX not set" };
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

  const text = renderPlainText(top, totals, args.dashboardUrl);

  try {
    const client = new AgentMailClient({ apiKey });
    const result = await client.inboxes.messages.send(inboxId, {
      to,
      subject,
      html,
      text,
      labels: ["cais-sourcing", "weekly-digest"],
    });
    return { ok: true, id: (result as { messageId?: string }).messageId ?? "unknown" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Plain-text fallback for clients that don't render HTML.
 * Also functions as the email-archive log line in AgentMail's inbox view.
 */
function renderPlainText(
  top: Event[],
  totals: { total: number; tier1: number },
  dashboardUrl: string,
): string {
  const lines = [
    `CAIS Sourcing — Weekly Digest`,
    ``,
    `${totals.total} events in the next 60 days · ${totals.tier1} Tier 1.`,
    ``,
    `Top ${top.length}:`,
  ];
  top.forEach((e, i) => {
    lines.push(``);
    lines.push(`${i + 1}. ${e.title}`);
    lines.push(`   ${new Date(e.startDate).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric" })} · ${e.hostName} · FIT ${e.score.fitScore}`);
    lines.push(`   ${e.score.reasoning}`);
    lines.push(`   → ${e.score.suggestedAction}`);
    lines.push(`   ${e.url}`);
  });
  lines.push(``);
  lines.push(`Open the dashboard: ${dashboardUrl}`);
  return lines.join("\n");
}
