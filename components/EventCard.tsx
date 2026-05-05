import type { Event } from "@/lib/types";
import { formatEventDate } from "@/lib/format";

const TIER_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: "TIER 1",
  2: "TIER 2",
  3: "TIER 3",
  4: "TIER 4",
};

const FORMAT_PILL: Record<string, string> = {
  conference: "bg-emerald-100 text-emerald-900",
  talk: "bg-emerald-100 text-emerald-900",
  meetup: "bg-blue-100 text-blue-900",
  hackathon: "bg-amber-100 text-amber-900",
  dinner: "bg-purple-100 text-purple-900",
  demo: "bg-blue-100 text-blue-900",
  other: "bg-stone-100 text-stone-700",
};

export function EventCard({ event }: { event: Event }) {
  const score = event.score.fitScore;
  const scoreColor =
    score >= 85
      ? "bg-emerald-100 text-emerald-900"
      : score >= 70
        ? "bg-blue-100 text-blue-900"
        : score >= 55
          ? "bg-amber-100 text-amber-900"
          : "bg-stone-200 text-stone-700";

  const tierClass = `tier-${event.tier}` as const;

  return (
    <article className="bg-white rounded-lg border border-stone-200 p-5 hover:border-stone-400 transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`${tierClass} text-xs font-semibold px-2 py-0.5 rounded`}>
              {TIER_LABEL[event.tier]}
            </span>
            <span
              className={`${FORMAT_PILL[event.format] ?? FORMAT_PILL.other} text-xs font-medium px-2 py-0.5 rounded`}
            >
              {event.format}
            </span>
            <span className="text-xs text-stone-500">{event.hostName}</span>
            {event.score.warmIntroNeeded && (
              <span className="text-xs text-amber-700 font-medium">⚠ Warm intro needed</span>
            )}
          </div>

          <h3 className="font-semibold text-base leading-snug">{event.title}</h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-stone-600">
            <span>📅 {formatEventDate(event)}</span>
            {event.venue && <span>📍 {event.venue}</span>}
            {event.city && !event.venue && <span>📍 {event.city}</span>}
          </div>

          <p className="text-sm text-stone-700 mt-3 leading-relaxed">
            <span className="font-medium">Why it fits:</span> {event.score.reasoning}
          </p>

          {event.score.archetypeMatches.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {event.score.archetypeMatches.map((a) => (
                <span
                  key={a}
                  className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div
            className={`${scoreColor} text-xs font-semibold px-2 py-1 rounded`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            FIT {score}
          </div>
          <div className="mt-3 space-y-2">
            <a
              href={event.url}
              target="_blank"
              rel="noreferrer"
              className="block text-xs bg-stone-900 text-white px-3 py-1.5 rounded hover:bg-stone-700 whitespace-nowrap"
            >
              View event →
            </a>
            <div className="text-xs text-stone-500 italic max-w-[12rem]">
              {event.score.suggestedAction}
            </div>
          </div>
        </div>
      </div>

      {event.score.scoringMethod === "rules" && (
        <div className="mt-3 pt-2 border-t border-stone-100 text-xs text-stone-400">
          Rule-based score (LLM unavailable for this run)
        </div>
      )}
    </article>
  );
}
