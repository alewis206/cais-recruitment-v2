import type { Event } from "@/lib/types";

/**
 * Find the densest 7-day window of high-fit events in the next 60 days
 * and surface it as a suggested trip.
 */
export function TripPlanner({ events }: { events: Event[] }) {
  const cluster = findBestCluster(events);

  if (!cluster) {
    return (
      <section className="bg-gradient-to-br from-stone-900 to-stone-700 text-white rounded-lg p-6">
        <div className="text-xs uppercase tracking-wider text-stone-300">Suggested Trip</div>
        <p className="text-sm text-stone-300 mt-2">
          No high-fit cluster found in the next 60 days. Check back next Monday.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-br from-stone-900 to-stone-700 text-white rounded-lg p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-stone-300">Suggested Trip</div>
          <h2 className="text-lg font-semibold mt-1">
            {formatRange(cluster.start, cluster.end)} · SF
          </h2>
          <p className="text-sm text-stone-300 mt-2 max-w-2xl leading-relaxed">
            {cluster.events.length} events in this window with average fit{" "}
            <span className="font-semibold text-white">{Math.round(cluster.avgScore)}</span>.{" "}
            Includes{" "}
            {cluster.events
              .slice(0, 3)
              .map((e) => `${e.hostName} · ${e.title}`)
              .join("; ")}
            {cluster.events.length > 3 ? "…" : "."}
          </p>
        </div>
      </div>
    </section>
  );
}

interface Cluster {
  start: Date;
  end: Date;
  events: Event[];
  avgScore: number;
}

function findBestCluster(events: Event[]): Cluster | null {
  const future = events
    .map((e) => ({ e, t: new Date(e.startDate).getTime() }))
    .filter((x) => x.t >= Date.now())
    .sort((a, b) => a.t - b.t);

  if (future.length === 0) return null;

  const windowMs = 7 * 24 * 60 * 60 * 1000;
  let best: Cluster | null = null;

  for (let i = 0; i < future.length; i++) {
    const startT = future[i]!.t;
    const inWindow = future.filter(
      (x) => x.t >= startT && x.t < startT + windowMs,
    );
    if (inWindow.length < 2) continue;
    const avg =
      inWindow.reduce((s, x) => s + x.e.score.fitScore, 0) / inWindow.length;
    // Prefer windows that combine breadth (count) with quality (avg score).
    const heuristic = avg + inWindow.length * 4;
    if (!best || heuristic > best.avgScore + best.events.length * 4) {
      best = {
        start: new Date(startT),
        end: new Date(inWindow[inWindow.length - 1]!.t),
        events: inWindow.map((x) => x.e),
        avgScore: avg,
      };
    }
  }
  return best;
}

function formatRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
  };
  const s = start.toLocaleDateString("en-US", opts);
  const e = end.toLocaleDateString("en-US", opts);
  return s === e ? s : `${s} – ${e}`;
}
