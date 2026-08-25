import * as Calendar from "expo-calendar";

import { CalendarEvent } from "./ai";

const CALENDAR_TITLE = "VIRALY AI";

function eventStart(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour || 19, minute || 0, 0);
}

function eventEnd(start: Date, type: CalendarEvent["type"]) {
  const durationMinutes = type === "live" ? 45 : type === "research" ? 30 : 25;
  return new Date(start.getTime() + durationMinutes * 60 * 1000);
}

async function getViralyCalendarId() {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((calendar) => calendar.title === CALENDAR_TITLE);
  if (existing?.id) return existing.id;

  const writable = calendars.find((calendar) => calendar.allowsModifications);
  if (!writable) throw new Error("Aucun calendrier modifiable n'est disponible sur ce téléphone.");

  return Calendar.createCalendarAsync({
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
    color: "#2D7CFF",
    entityType: Calendar.EntityTypes.EVENT,
    name: CALENDAR_TITLE,
    ownerAccount: writable.ownerAccount || CALENDAR_TITLE,
    source: writable.source,
    sourceId: writable.source?.id,
    title: CALENDAR_TITLE
  } as Calendar.Calendar);
}

export async function syncEventsToDeviceCalendar(events: CalendarEvent[]) {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Autorise l'accès au calendrier pour synchroniser ton plan.");
  }

  const calendarId = await getViralyCalendarId();
  let synced = 0;

  for (const event of events) {
    const startDate = eventStart(event.date, event.time);
    const endDate = eventEnd(startDate, event.type);
    const existing = await Calendar.getEventsAsync(
      [calendarId],
      new Date(startDate.getTime() - 60 * 60 * 1000),
      new Date(endDate.getTime() + 60 * 60 * 1000)
    );
    const marker = `VIRALY:${event.id}`;
    const duplicate = existing.some((item) => item.notes?.includes(marker));
    if (duplicate) continue;

    await Calendar.createEventAsync(calendarId, {
      endDate,
      notes: `${event.hook}\n\nCTA: ${event.cta}\n${marker}`,
      startDate,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris",
      title: `${event.type.toUpperCase()} · ${event.title}`
    });
    synced += 1;
  }

  return { calendarTitle: CALENDAR_TITLE, synced };
}
