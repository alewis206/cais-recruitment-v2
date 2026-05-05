import { readEventsFile } from "@/lib/data";
import { bucketByWeek } from "@/lib/format";
import { EventCard } from "@/components/EventCard";
import { StatsBar } from "@/components/StatsBar";
import { TripPlanner } from "@/components/TripPlanner";
import { ScrapeStatus } from "@/components/ScrapeStatus";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const file = await readEventsFile();
  const sorted = [...file.events].sort(
    (a, b) => b.score.fitScore - a.score.fitScore,
  );
  const { thisWeek, nextWeek, later } = bucketByWeek(sorted);

  return (
    <>
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-500 uppercase tracking-wider">
              CAIS · Recruitment
            </div>
            <h1 className="text-xl font-semibold mt-1">
              SF Event Sourcing — Head of Delivery
            </h1>
          </div>
        </div>
      </header>

      <ScrapeStatus file={file} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {file.events.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <StatsBar events={file.events} />
            <TripPlanner events={file.events} />

            {thisWeek.length > 0 && (
              <Section title={`This week · ${thisWeek.length} events`}>
                {thisWeek.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </Section>
            )}
            {nextWeek.length > 0 && (
              <Section title={`Next week · ${nextWeek.length} events`}>
                {nextWeek.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </Section>
            )}
            {later.length > 0 && (
              <Section title={`Later (next 60 days) · ${later.length} events`}>
                {later.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </Section>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-stone-200 mt-12 py-6 text-center text-xs text-stone-500">
        CAIS Recruitment · {file.generatedBy} · v0.1
      </footer>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-600">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-10 text-center">
      <h2 className="text-lg font-semibold">No events yet</h2>
      <p className="text-sm text-stone-600 mt-2 max-w-md mx-auto">
        The Monday refresh hasn't run yet. Trigger it manually with{" "}
        <code className="bg-stone-100 px-1.5 py-0.5 rounded">npm run refresh</code> or
        wait for the GitHub Action.
      </p>
    </div>
  );
}
