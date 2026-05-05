import type { EventsFile } from "@/lib/types";
import { formatRefreshTime } from "@/lib/format";

export function ScrapeStatus({ file }: { file: EventsFile }) {
  const r = file.scrapeReport;
  const ok = r.sourcesSucceeded === r.sourcesAttempted;
  const partial = r.sourcesSucceeded > 0 && r.sourcesSucceeded < r.sourcesAttempted;

  const tone = ok
    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
    : partial
      ? "bg-amber-50 border-amber-200 text-amber-900"
      : "bg-red-50 border-red-200 text-red-900";

  return (
    <div className={`border-b ${tone}`}>
      <div className="max-w-7xl mx-auto px-6 py-3 text-sm flex items-center justify-between">
        <div>
          <span className="font-semibold">
            {ok ? "All sources OK" : partial ? "Partial scrape" : "Scrape failed"}:
          </span>{" "}
          {r.sourcesSucceeded}/{r.sourcesAttempted} sources · {r.eventsScored} events scored
          {r.failures.length > 0 && (
            <span className="ml-2 opacity-75">
              ({r.failures.map((f) => f.sourceSlug).join(", ")} failed)
            </span>
          )}
        </div>
        <div className="text-xs opacity-75">
          Last refresh: {formatRefreshTime(file.generatedAt)}
        </div>
      </div>
    </div>
  );
}
