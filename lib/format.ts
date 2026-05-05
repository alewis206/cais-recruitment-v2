import type { Event } from "./types";

const PT = "America/Los_Angeles";

export function formatEventDate(ev: Event): string {
  const start = new Date(ev.startDate);
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: PT,
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  const startStr = start.toLocaleDateString("en-US", opts);

  if (!ev.endDate) {
    const time = start.toLocaleTimeString("en-US", {
      timeZone: PT,
      hour: "numeric",
      minute: "2-digit",
    });
    return `${startStr} · ${time}`;
  }

  const end = new Date(ev.endDate);
  // Multi-day if the calendar day differs in PT.
  const sameDay =
    start.toLocaleDateString("en-US", { timeZone: PT }) ===
    end.toLocaleDateString("en-US", { timeZone: PT });
  if (sameDay) {
    const startTime = start.toLocaleTimeString("en-US", {
      timeZone: PT,
      hour: "numeric",
      minute: "2-digit",
    });
    return `${startStr} · ${startTime}`;
  }
  const endStr = end.toLocaleDateString("en-US", opts);
  return `${startStr} – ${endStr}`;
}

export function formatRefreshTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    timeZone: PT,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function bucketByWeek(events: Event[]): {
  thisWeek: Event[];
  nextWeek: Event[];
  later: Event[];
} {
  const now = new Date();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const twoWeeks = 2 * oneWeek;

  const thisWeek: Event[] = [];
  const nextWeek: Event[] = [];
  const later: Event[] = [];

  for (const e of events) {
    const t = new Date(e.startDate).getTime();
    const delta = t - now.getTime();
    if (delta < 0) continue; // hide past events
    if (delta < oneWeek) thisWeek.push(e);
    else if (delta < twoWeeks) nextWeek.push(e);
    else later.push(e);
  }
  return { thisWeek, nextWeek, later };
}
