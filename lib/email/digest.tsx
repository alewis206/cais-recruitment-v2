import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { Event } from "@/lib/types";
import { formatEventDate } from "@/lib/format";

interface DigestProps {
  generatedAt: string;
  topEvents: Event[];
  totals: {
    total: number;
    tier1: number;
    tier2: number;
    tier3: number;
    hackathons: number;
  };
  dashboardUrl: string;
  tripWindow?: { start: string; end: string; count: number };
}

export function DigestEmail({
  topEvents,
  totals,
  dashboardUrl,
  tripWindow,
}: DigestProps) {
  const preview = `${totals.tier1} Tier 1, ${totals.tier3} dinners, ${totals.hackathons} hackathons in the next 60 days`;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>CAIS Sourcing — Weekly Digest</Heading>
          <Text style={subhead}>SF AI events for the Head of Delivery search</Text>
          <Hr style={hr} />

          <Text style={p}>
            <strong>{totals.total}</strong> events in the next 60 days ·{" "}
            <strong>{totals.tier1}</strong> Tier 1 · {totals.tier2} Tier 2 ·{" "}
            {totals.tier3} dinners · {totals.hackathons} hackathons.
          </Text>

          {tripWindow && (
            <Section style={tripBox}>
              <Text style={tripLabel}>SUGGESTED TRIP</Text>
              <Text style={tripTitle}>
                {tripWindow.start} – {tripWindow.end}, SF
              </Text>
              <Text style={tripDesc}>
                {tripWindow.count} high-fit events in this window. Open the
                dashboard for the full itinerary.
              </Text>
            </Section>
          )}

          <Heading as="h2" style={h2}>
            Top {topEvents.length} this period
          </Heading>

          {topEvents.map((e, i) => (
            <Section key={e.id} style={eventBox}>
              <Text style={eventTitle}>
                {i + 1}.{" "}
                <Link href={e.url} style={eventLink}>
                  {e.title}
                </Link>
              </Text>
              <Text style={eventMeta}>
                {formatEventDate(e)} · {e.hostName} · FIT {e.score.fitScore}
                {e.score.warmIntroNeeded ? " · ⚠ warm intro needed" : ""}
              </Text>
              <Text style={eventReason}>{e.score.reasoning}</Text>
              <Text style={eventAction}>→ {e.score.suggestedAction}</Text>
            </Section>
          ))}

          <Hr style={hr} />
          <Section style={ctaSection}>
            <Link href={dashboardUrl} style={cta}>
              Open the full dashboard →
            </Link>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            CAIS Recruitment · automated Monday digest · sources scraped via Lu.ma
            and host calendars · scored by Claude Haiku 4.5 against the
            Head of Delivery archetype rubric.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#fafaf9",
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};
const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "640px",
  backgroundColor: "#ffffff",
  border: "1px solid #e7e5e4",
  borderRadius: "8px",
};
const h1: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 600,
  color: "#1c1917",
  margin: "0 0 4px 0",
};
const subhead: React.CSSProperties = {
  fontSize: "14px",
  color: "#78716c",
  margin: "0 0 8px 0",
};
const h2: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#57534e",
  margin: "24px 0 12px 0",
};
const hr: React.CSSProperties = {
  borderColor: "#e7e5e4",
  margin: "16px 0",
};
const p: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#1c1917",
  margin: "0 0 12px 0",
};
const tripBox: React.CSSProperties = {
  backgroundColor: "#1c1917",
  color: "#fafaf9",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
};
const tripLabel: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.1em",
  color: "#a8a29e",
  textTransform: "uppercase",
  margin: 0,
};
const tripTitle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#fafaf9",
  margin: "4px 0 8px 0",
};
const tripDesc: React.CSSProperties = {
  fontSize: "13px",
  color: "#d6d3d1",
  margin: 0,
};
const eventBox: React.CSSProperties = {
  borderLeft: "3px solid #d6d3d1",
  paddingLeft: "12px",
  margin: "12px 0",
};
const eventTitle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#1c1917",
  margin: "0 0 4px 0",
};
const eventLink: React.CSSProperties = {
  color: "#1c1917",
  textDecoration: "underline",
};
const eventMeta: React.CSSProperties = {
  fontSize: "12px",
  color: "#78716c",
  margin: "0 0 6px 0",
};
const eventReason: React.CSSProperties = {
  fontSize: "13px",
  color: "#44403c",
  margin: "0 0 4px 0",
  lineHeight: "1.5",
};
const eventAction: React.CSSProperties = {
  fontSize: "12px",
  color: "#0c4a6e",
  fontStyle: "italic",
  margin: 0,
};
const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  padding: "12px 0",
};
const cta: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#1c1917",
  color: "#fafaf9",
  padding: "10px 20px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 500,
  textDecoration: "none",
};
const footer: React.CSSProperties = {
  fontSize: "11px",
  color: "#a8a29e",
  margin: 0,
  lineHeight: "1.5",
};
