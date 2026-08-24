import * as Notifications from "expo-notifications";

import { CalendarEvent } from "./ai";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

function eventDate(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour || 19, minute || 0, 0);
}

function reminderDate(event: CalendarEvent) {
  const start = eventDate(event.date, event.time);
  return new Date(start.getTime() - 20 * 60 * 1000);
}

export async function schedulePostNotifications(events: CalendarEvent[]) {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Autorise les notifications pour recevoir les rappels de publication.");
  }

  let scheduled = 0;
  const now = Date.now();

  for (const event of events) {
    const triggerDate = reminderDate(event);
    if (triggerDate.getTime() <= now) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        body: `${event.hook} CTA: ${event.cta}`,
        data: { eventId: event.id, source: "viraly-ai" },
        title: `Publie dans 20 min · ${event.title}`
      },
      trigger: { date: triggerDate, type: Notifications.SchedulableTriggerInputTypes.DATE }
    });
    scheduled += 1;
  }

  return { scheduled };
}
