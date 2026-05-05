import { promises as fs } from "node:fs";
import path from "node:path";
import { EventsFileSchema, type EventsFile } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "events.json");

/**
 * Read events.json. The dashboard always reads through this; the cron
 * always writes through writeEventsFile().
 *
 * If the file is missing (first deploy), returns an empty stub so the
 * dashboard renders rather than 500-ing.
 */
export async function readEventsFile(): Promise<EventsFile> {
  try {
    const text = await fs.readFile(DATA_PATH, "utf8");
    return EventsFileSchema.parse(JSON.parse(text));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        generatedAt: new Date(0).toISOString(),
        generatedBy: "stub",
        events: [],
        scrapeReport: {
          sourcesAttempted: 0,
          sourcesSucceeded: 0,
          eventsFound: 0,
          eventsScored: 0,
          failures: [],
        },
      };
    }
    throw err;
  }
}

export async function writeEventsFile(file: EventsFile): Promise<void> {
  const validated = EventsFileSchema.parse(file);
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(validated, null, 2) + "\n", "utf8");
}
