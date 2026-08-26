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

function preparationDate(event: CalendarEvent) {
  const start = eventDate(event.date, event.time);
  return new Date(start.getTime() - 2 * 60 * 60 * 1000);
}

async function clearViralyPostNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const viralyNotifications = scheduled.filter((notification) => {
    const source = notification.content.data?.source;
    return source === "viraly-ai-post" || source === "viraly-ai";
  });
  await Promise.all(
    viralyNotifications.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier)
    )
  );
}

function eventTypeLabel(type: CalendarEvent["type"]) {
  if (type === "carousel") return "carrousel";
  if (type === "video") return "vidéo";
  return "story";
}

type NotificationOptions = {
  requestPermission?: boolean;
};

export async function schedulePostNotifications(
  events: CalendarEvent[],
  options: NotificationOptions = {}
) {
  const permission = options.requestPermission === false
    ? await Notifications.getPermissionsAsync()
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    if (options.requestPermission === false) {
      return { permissionGranted: false, publishingMoments: 0, scheduled: 0 };
    }
    throw new Error("Autorise les notifications pour recevoir les rappels de publication.");
  }

  await clearViralyPostNotifications();

  let scheduled = 0;
  const now = Date.now();
  const publishingEvents = events.filter((event) =>
    event.type === "video" || event.type === "carousel" || event.type === "story"
  );

  for (const event of publishingEvents) {
    const reminders = [
      {
        body: `Ton contenu est prévu à ${event.time}. Prépare la couverture, le hook et le CTA : la régularité construit tes résultats.`,
        date: preparationDate(event),
        title: event.type === "story"
          ? "Prépare ta story"
          : `Prépare ton ${eventTypeLabel(event.type)}`,
        type: "preparation"
      },
      {
        body: `${event.hook}\nCTA : ${event.cta}`,
        date: reminderDate(event),
        title: `Bientôt l’heure de poster · ${event.time}`,
        type: "soon"
      }
    ];

    for (const reminder of reminders) {
      if (reminder.date.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          body: reminder.body,
          data: {
            eventId: event.id,
            reminderType: reminder.type,
            source: "viraly-ai-post"
          },
          title: reminder.title
        },
        trigger: {
          date: reminder.date,
          type: Notifications.SchedulableTriggerInputTypes.DATE
        }
      });
      scheduled += 1;
    }
  }

  return {
    permissionGranted: true,
    publishingMoments: publishingEvents.length,
    scheduled
  };
}
