import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

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
    return source === "viraly-ai-post" || source === "viraly-ai" || source === "viraly-ai-starter";
  });
  await Promise.all(
    viralyNotifications.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier)
    )
  );
}

async function prepareNotificationChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("rappels-publication", {
    importance: Notifications.AndroidImportance.DEFAULT,
    name: "Rappels de publication",
    sound: undefined,
    vibrationPattern: [0, 180, 90, 180]
  });
}

function zoneOffset(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value || 0);
  return Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second")) - date.getTime();
}

function parisMoment(dayOffset: number, hour: number, minute: number) {
  const timeZone = "Europe/Paris";
  const parisParts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parisParts.find((part) => part.type === type)?.value || 0);
  const wallClock = Date.UTC(value("year"), value("month") - 1, value("day") + dayOffset, hour, minute, 0);
  let date = new Date(wallClock);
  date = new Date(wallClock - zoneOffset(date, timeZone));
  return new Date(wallClock - zoneOffset(date, timeZone));
}

async function clearStarterNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.content.data?.source === "viraly-ai-starter")
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier))
  );
}

export async function scheduleStarterPublishingReminders() {
  if (Platform.OS === "web") {
    return { permissionGranted: false, scheduled: 0, unsupported: true };
  }
  await prepareNotificationChannel();
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return { permissionGranted: false, scheduled: 0, unsupported: false };

  await clearStarterNotifications();
  let scheduled = 0;
  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const moments = [
      {
        body: "Ton audience entre dans un créneau à tester. Publie, puis relève les vues et sauvegardes après 2 heures.",
        date: parisMoment(dayOffset, 12, 0),
        title: "C'est l'heure de poster · 12:00"
      },
      {
        body: "Deuxième créneau du jour. Choisis ton contenu le plus clair et reste disponible pour répondre aux premiers commentaires.",
        date: parisMoment(dayOffset, 18, 30),
        title: "C'est l'heure de poster · 18:30"
      }
    ];
    for (const moment of moments) {
      if (moment.date.getTime() <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          body: moment.body,
          data: { source: "viraly-ai-starter", timezone: "Europe/Paris" },
          title: moment.title
        },
        trigger: {
          channelId: Platform.OS === "android" ? "rappels-publication" : undefined,
          date: moment.date,
          type: Notifications.SchedulableTriggerInputTypes.DATE
        }
      });
      scheduled += 1;
    }
  }
  return { permissionGranted: true, scheduled, unsupported: false };
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
  await prepareNotificationChannel();
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
        body: `Ton contenu est prévu à ${event.time}. Prépare la couverture et le déroulé : la régularité construit tes résultats.`,
        date: preparationDate(event),
        title: event.type === "story"
          ? "Prépare ta story"
          : `Prépare ton ${eventTypeLabel(event.type)}`,
        type: "preparation"
      },
      {
        body: `${event.title} · ouvre ton plan VIRALY pour suivre le déroulé complet.`,
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
