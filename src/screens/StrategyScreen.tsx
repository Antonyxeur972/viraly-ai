import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ProgressBar } from "../components/ProgressBar";
import { SectionHeader } from "../components/SectionHeader";
import {
  CalendarEvent,
  StrategyReport,
  createCalendarEvent,
  deleteCalendarEvent,
  generateCalendar,
  generateStrategy,
  getCalendarEvents,
  getStrategy,
  updateCalendarEvent
} from "../services/ai";
import { syncEventsToDeviceCalendar } from "../services/deviceCalendar";
import { schedulePostNotifications } from "../services/postNotifications";
import { ProfileAnalysisReport } from "../services/profileAnalysis";
import { palette, radius, spacing, typography } from "../theme";
import { CreatorOnboardingProfile } from "../types";

type Props = {
  profile: CreatorOnboardingProfile;
  accountContext: ProfileAnalysisReport | null;
};

const today = () => new Date().toISOString().slice(0, 10);

export function StrategyScreen({ profile, accountContext }: Props) {
  const [strategy, setStrategy] = useState<StrategyReport | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<"strategy" | "calendar" | "event" | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(today());
  const [newTime, setNewTime] = useState("19:00");

  useEffect(() => {
    Promise.allSettled([getStrategy(), getCalendarEvents()]).then(([strategyResult, calendarResult]) => {
      if (strategyResult.status === "fulfilled") setStrategy(strategyResult.value);
      if (calendarResult.status === "fulfilled") setEvents(calendarResult.value);
    });
  }, []);

  const buildStrategy = async () => {
    setLoading("strategy");
    try {
      setStrategy(await generateStrategy(profile, accountContext));
    } catch (error) {
      Alert.alert("Plan IA", error instanceof Error ? error.message : "Plan indisponible.");
    } finally {
      setLoading(null);
    }
  };

  const buildCalendar = async () => {
    if (!strategy) return;
    setLoading("calendar");
    try {
      const generated = await generateCalendar(profile, strategy, today());
      setEvents((current) => [...current, ...generated].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)));
    } catch (error) {
      Alert.alert("Calendrier IA", error instanceof Error ? error.message : "Calendrier indisponible.");
    } finally {
      setLoading(null);
    }
  };

  const addEvent = async () => {
    if (newTitle.trim().length < 2) return;
    setLoading("event");
    try {
      const event = await createCalendarEvent({
        date: newDate,
        time: newTime,
        type: "video",
        title: newTitle.trim(),
        hook: "À préciser dans le studio d'idées",
        cta: "Définir une action mesurable"
      });
      setEvents((current) => [...current, event].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)));
      setNewTitle("");
      setShowAdd(false);
    } catch (error) {
      Alert.alert("Calendrier", error instanceof Error ? error.message : "Ajout impossible.");
    } finally {
      setLoading(null);
    }
  };

  const toggleEvent = async (event: CalendarEvent) => {
    const nextStatus = event.status === "published" ? "planned" : "published";
    try {
      const updated = await updateCalendarEvent(event.id, { status: nextStatus });
      setEvents((current) => current.map((item) => item.id === event.id ? updated : item));
    } catch (error) {
      Alert.alert("Calendrier", error instanceof Error ? error.message : "Modification impossible.");
    }
  };

  const removeEvent = (event: CalendarEvent) => {
    Alert.alert("Supprimer cette publication ?", event.title, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCalendarEvent(event.id);
            setEvents((current) => current.filter((item) => item.id !== event.id));
          } catch (error) {
            Alert.alert("Calendrier", error instanceof Error ? error.message : "Suppression impossible.");
          }
        }
      }
    ]);
  };

  const syncCalendar = async () => {
    if (!events.length || isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncEventsToDeviceCalendar(events);
      Alert.alert(
        "Calendrier synchronisé",
        `${result.synced} publication${result.synced > 1 ? "s" : ""} ajoutée${result.synced > 1 ? "s" : ""} dans ${result.calendarTitle}.`
      );
    } catch (error) {
      Alert.alert("Synchronisation calendrier", error instanceof Error ? error.message : "Synchronisation impossible.");
    } finally {
      setIsSyncing(false);
    }
  };

  const scheduleNotifications = async () => {
    if (!events.length || isScheduling) return;
    setIsScheduling(true);
    try {
      const result = await schedulePostNotifications(events);
      Alert.alert(
        "Notifications activées",
        `${result.scheduled} rappel${result.scheduled > 1 ? "s" : ""} programmé${result.scheduled > 1 ? "s" : ""} aux moments les plus réceptifs du plan.`
      );
    } catch (error) {
      Alert.alert("Notifications", error instanceof Error ? error.message : "Activation impossible.");
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.kicker}>PLAN ET CALENDRIER</Text>
        <Text style={styles.title}>Une stratégie qui devient des dates.</Text>
        <Text style={styles.subtitle}>{strategy?.summary || "Génère d'abord un plan relié au diagnostic, puis transforme-le en semaine de publication."}</Text>
      </View>

      <TouchableOpacity disabled={loading !== null} onPress={buildStrategy} style={styles.primaryButton}>
        <Ionicons color={palette.ink} name="sparkles-outline" size={19} />
        <Text style={styles.primaryText}>{loading === "strategy" ? "Construction du plan..." : strategy ? "Actualiser la stratégie IA" : "Générer ma stratégie IA"}</Text>
      </TouchableOpacity>

      <SectionHeader eyebrow="Calendrier" title="Idées de posts à publier" action={`${events.length} tâches`} />
      <View style={styles.calendarActions}>
        <TouchableOpacity disabled={!strategy || loading !== null} onPress={buildCalendar} style={[styles.outlineButton, !strategy && styles.disabled]}>
          <Ionicons color={palette.mint} name="calendar-outline" size={18} />
          <Text style={styles.outlineText}>{loading === "calendar" ? "Planification..." : "Générer 7 jours"}</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={!events.length || isScheduling} onPress={scheduleNotifications} style={[styles.iconTextButton, !events.length && styles.disabled]}>
          <Ionicons color={palette.lemon} name="notifications-outline" size={18} />
          <Text style={styles.notifyText}>{isScheduling ? "..." : "Rappels"}</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={!events.length || isSyncing} onPress={syncCalendar} style={[styles.iconTextButton, !events.length && styles.disabled]}>
          <Ionicons color={palette.sky} name="sync-outline" size={18} />
          <Text style={styles.syncText}>{isSyncing ? "..." : "Sync"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowAdd((value) => !value)} style={styles.iconButton}>
          <Ionicons color={palette.white} name={showAdd ? "close" : "add"} size={22} />
        </TouchableOpacity>
      </View>

      {showAdd ? (
        <View style={styles.addPanel}>
          <TextInput onChangeText={setNewTitle} placeholder="Sujet de la publication" placeholderTextColor={palette.muted} style={styles.input} value={newTitle} />
          <View style={styles.inputRow}>
            <TextInput onChangeText={setNewDate} placeholder="AAAA-MM-JJ" placeholderTextColor={palette.muted} style={[styles.input, styles.flex]} value={newDate} />
            <TextInput onChangeText={setNewTime} placeholder="19:00" placeholderTextColor={palette.muted} style={[styles.input, styles.timeInput]} value={newTime} />
          </View>
          <TouchableOpacity disabled={loading !== null || newTitle.trim().length < 2} onPress={addEvent} style={styles.addButton}><Text style={styles.addText}>{loading === "event" ? "Ajout..." : "Ajouter au calendrier"}</Text></TouchableOpacity>
        </View>
      ) : null}

      {events.length ? (
        <View style={styles.stack}>
          {events.map((event) => (
            <View key={event.id} style={[styles.eventCard, event.status === "published" && styles.eventDone]}>
              <TouchableOpacity onPress={() => toggleEvent(event)} style={[styles.checkButton, event.status === "published" && styles.checkDone]}>
                <Ionicons color={event.status === "published" ? palette.ink : palette.mint} name={event.status === "published" ? "checkmark" : "ellipse-outline"} size={20} />
              </TouchableOpacity>
              <View style={styles.flex}>
                <Text style={styles.eventMeta}>{event.date} · {event.time} · {event.type.toUpperCase()}</Text>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventHook}>{event.hook}</Text>
                <Text style={styles.eventCta}>CTA : {event.cta}</Text>
              </View>
              <TouchableOpacity onPress={() => removeEvent(event)} style={styles.deleteButton}><Ionicons color={palette.muted} name="trash-outline" size={18} /></TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Génère une stratégie puis crée 7 jours de posts adaptés à ta niche.</Text>
      )}

      {strategy ? (
        <>
          <SectionHeader eyebrow="Décision" title="Stratégie recommandée" />
          <View style={styles.stack}>
            {strategy.niches.map((niche) => (
              <View key={niche.name} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.flex}><Text style={styles.cardTitle}>{niche.name}</Text><Text style={styles.meta}>{niche.audience}</Text></View>
                  <Text style={styles.score}>{niche.score}</Text>
                </View>
                <ProgressBar color={palette.mint} value={niche.score} />
                <Text style={styles.body}>Différence : {niche.edge}</Text>
                <Text style={styles.accentText}>Revenu : {niche.revenueAngle}</Text>
              </View>
            ))}
          </View>

          <SectionHeader eyebrow="Test 14 jours" title="Créneaux à mesurer" />
          <View style={styles.stack}>
            {strategy.postingSlots.map((slot) => (
              <View key={`${slot.day}-${slot.time}`} style={styles.slotCard}>
                <View style={styles.timeBlock}><Text style={styles.time}>{slot.time}</Text><Text style={styles.day}>{slot.day}</Text></View>
                <View style={styles.flex}><Text style={styles.body}>{slot.reason}</Text><Text style={styles.meta}>{slot.testProtocol}</Text></View>
              </View>
            ))}
          </View>

          <SectionHeader eyebrow="Cycle" title="Système hebdomadaire" />
          <View style={styles.listPanel}>
            {strategy.weeklyCycle.map((step, index) => (
              <View key={`${step}-${index}`} style={styles.listLine}><Text style={styles.listIndex}>0{index + 1}</Text><Text style={styles.listText}>{step}</Text></View>
            ))}
          </View>

          <View style={styles.columnCard}><Text style={styles.columnLabel}>STORIES</Text>{strategy.storyPlan.map((item) => <Text key={item} style={styles.columnText}>• {item}</Text>)}</View>

          <SectionHeader eyebrow="Revenus" title="Pistes reliées au contenu" />
          <View style={styles.stack}>
            {strategy.revenuePaths.map((path) => (
              <View key={path.name} style={styles.card}>
                <View style={styles.cardTop}><Text style={styles.cardTitle}>{path.name}</Text><Text style={styles.range}>{path.range}</Text></View>
                <Text style={styles.body}>{path.contentDirection}</Text>
                <Text style={styles.accentText}>{path.nextAction}</Text>
                <Text style={styles.caveat}>{path.basis}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.sm },
  kicker: { ...typography.caption, color: palette.sky },
  title: { ...typography.title, color: palette.white },
  subtitle: { ...typography.body, color: palette.paperMuted },
  primaryButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.sm, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.md },
  primaryText: { ...typography.caption, color: palette.ink },
  stack: { gap: spacing.md },
  card: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  cardTop: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  cardTitle: { ...typography.h3, color: palette.white, flex: 1 },
  score: { color: palette.mint, fontSize: 25, fontWeight: "900" },
  meta: { ...typography.caption, color: palette.muted },
  body: { ...typography.body, color: palette.paperMuted },
  accentText: { ...typography.caption, color: palette.mint },
  caveat: { color: palette.muted, fontSize: 11, lineHeight: 16 },
  slotCard: { alignItems: "flex-start", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  timeBlock: { alignItems: "center", backgroundColor: palette.graphite, borderRadius: radius.sm, gap: 2, minWidth: 68, padding: spacing.sm },
  time: { ...typography.h3, color: palette.mint },
  day: { color: palette.muted, fontSize: 10, textTransform: "uppercase" },
  flex: { flex: 1 },
  listPanel: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  listLine: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  listIndex: { ...typography.caption, color: palette.lemon },
  listText: { ...typography.body, color: palette.white, flex: 1 },
  twoColumn: { flexDirection: "row", gap: spacing.sm },
  columnCard: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flex: 1, gap: spacing.sm, minWidth: 0, padding: spacing.md },
  columnLabel: { ...typography.caption, color: palette.mint },
  columnText: { color: palette.paperMuted, fontSize: 12, lineHeight: 17 },
  range: { ...typography.caption, color: palette.lemon },
  calendarActions: { flexDirection: "row", gap: spacing.sm },
  outlineButton: { alignItems: "center", borderColor: palette.mint, borderRadius: radius.sm, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 46 },
  outlineText: { ...typography.caption, color: palette.mint },
  iconTextButton: { alignItems: "center", borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, gap: 2, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.sm },
  notifyText: { color: palette.lemon, fontSize: 11, fontWeight: "800" },
  syncText: { color: palette.sky },
  iconButton: { alignItems: "center", borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, height: 46, justifyContent: "center", width: 46 },
  disabled: { opacity: 0.4 },
  addPanel: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  input: { ...typography.body, backgroundColor: palette.graphite, borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, color: palette.white, minHeight: 44, paddingHorizontal: spacing.md },
  inputRow: { flexDirection: "row", gap: spacing.sm },
  timeInput: { width: 92 },
  addButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.sm, justifyContent: "center", minHeight: 44 },
  addText: { ...typography.caption, color: palette.ink },
  eventCard: { alignItems: "flex-start", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  eventDone: { opacity: 0.62 },
  checkButton: { alignItems: "center", borderColor: palette.mint, borderRadius: radius.sm, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  checkDone: { backgroundColor: palette.mint },
  eventMeta: { ...typography.caption, color: palette.mint },
  eventTitle: { ...typography.h3, color: palette.white, marginTop: 4 },
  eventHook: { ...typography.body, color: palette.paperMuted, marginTop: 4 },
  eventCta: { color: palette.lemon, fontSize: 11, lineHeight: 16, marginTop: 4 },
  deleteButton: { alignItems: "center", height: 36, justifyContent: "center", width: 30 },
  empty: { ...typography.body, color: palette.muted, textAlign: "center" }
});
