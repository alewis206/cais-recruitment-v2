import type { Event } from "@/lib/types";

export function StatsBar({ events }: { events: Event[] }) {
  const total = events.length;
  const tier1 = events.filter((e) => e.tier === 1).length;
  const tier2 = events.filter((e) => e.tier === 2).length;
  const tier3 = events.filter((e) => e.tier === 3).length;
  const hackathons = events.filter((e) => e.format === "hackathon").length;

  const cells: { label: string; value: number; color: string }[] = [
    { label: "Events next 60d", value: total, color: "text-stone-900" },
    { label: "Tier 1", value: tier1, color: "text-emerald-700" },
    { label: "Tier 2", value: tier2, color: "text-blue-700" },
    { label: "Tier 3 (dinners)", value: tier3, color: "text-purple-700" },
    { label: "Hackathons", value: hackathons, color: "text-amber-700" },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cells.map((c) => (
        <div key={c.label} className="bg-white rounded-lg border border-stone-200 p-4">
          <div className="text-xs text-stone-500">{c.label}</div>
          <div className={`text-2xl font-semibold mt-1 ${c.color}`}>{c.value}</div>
        </div>
      ))}
    </section>
  );
}
