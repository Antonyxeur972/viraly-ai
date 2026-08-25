import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { GlassPanel } from "../components/GlassPanel";
import { SectionHeader } from "../components/SectionHeader";
import {
  CalendarEvent,
  ContentPlan,
  generateContentPlan,
  listContentPlans
} from "../services/ai";
import { ProfileAnalysisReport } from "../services/profileAnalysis";
import { palette, radius, spacing, typography } from "../theme";
import { CreatorOnboardingProfile, IconName } from "../types";

type Props = {
  profile: CreatorOnboardingProfile;
  accountContext: ProfileAnalysisReport | null;
  onResetCreatorProfile: () => void;
};

const formatMeta: Record<CalendarEvent["type"], { icon: IconName; label: string }> = {
  video: { icon: "videocam-outline", label: "Vidéo" },
  carousel: { icon: "albums-outline", label: "Carrousel" },
  story: { icon: "phone-portrait-outline", label: "Story" },
  live: { icon: "radio-outline", label: "Live" },
  research: { icon: "search-outline", label: "Recherche" }
};

function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function dayTitle(date: string) {
  const value = new Date(`${date}T12:00:00`);
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    weekday: "long"
  }).format(value);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(
    new Date(`${date}T12:00:00`)
  );
}

function createdLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function momentLabel(time: string) {
  const hour = Number(time.slice(0, 2));
  if (hour < 11) return "Matin";
  if (hour < 14) return "Midi";
  if (hour < 18) return "Après-midi";
  return "Soir";
}

function planRange(plan: ContentPlan) {
  const dates = plan.events.map((event) => event.date).sort();
  if (!dates.length) return "7 jours";
  return `${shortDate(dates[0])} - ${shortDate(dates[dates.length - 1])}`;
}

function groupEvents(events: CalendarEvent[]) {
  return events.reduce<Record<string, CalendarEvent[]>>((groups, event) => {
    groups[event.date] = [...(groups[event.date] || []), event];
    return groups;
  }, {});
}

export function StrategyScreen({ profile, accountContext, onResetCreatorProfile }: Props) {
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null);
  const [schedulingPlanId, setSchedulingPlanId] = useState<string | null>(null);

  useEffect(() => {
    listContentPlans(8)
      .then((savedPlans) => {
        setPlans(savedPlans);
        setSelectedPlanId(savedPlans[0]?.id || null);
      })
      .catch(() => {})
      .finally(() => setIsLoadingHistory(false));
  }, []);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || plans[0] || null,
    [plans, selectedPlanId]
  );
  const groupedDays = useMemo(
    () => Object.entries(groupEvents(activePlan?.events || [])).sort(([a], [b]) => a.localeCompare(b)),
    [activePlan]
  );

  const buildPlan = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const plan = await generateContentPlan(profile, accountContext, localToday());
      setPlans((current) => [plan, ...current.filter((item) => item.id !== plan.id)].slice(0, 8));
      setSelectedPlanId(plan.id);
    } catch (error) {
      Alert.alert("Plan VIRALY", error instanceof Error ? error.message : "Construction impossible.");
    } finally {
      setIsGenerating(false);
    }
  };

  const syncPlan = async (plan: ContentPlan) => {
    if (!plan.events.length || syncingPlanId) return;
    setSyncingPlanId(plan.id);
    try {
      const { syncEventsToDeviceCalendar } = await import("../services/deviceCalendar");
      const result = await syncEventsToDeviceCalendar(plan.events);
      Alert.alert(
        "Calendrier synchronisé",
        `${result.synced} élément${result.synced > 1 ? "s" : ""} ajouté${result.synced > 1 ? "s" : ""} dans ${result.calendarTitle}.`
      );
    } catch (error) {
      Alert.alert("Synchronisation", error instanceof Error ? error.message : "Synchronisation impossible.");
    } finally {
      setSyncingPlanId(null);
    }
  };

  const schedulePlan = async (plan: ContentPlan) => {
    if (!plan.events.length || schedulingPlanId) return;
    setSchedulingPlanId(plan.id);
    try {
      const { schedulePostNotifications } = await import("../services/postNotifications");
      const result = await schedulePostNotifications(plan.events);
      Alert.alert(
        "Rappels activés",
        `${result.scheduled} notification${result.scheduled > 1 ? "s" : ""} programmée${result.scheduled > 1 ? "s" : ""} 20 minutes avant publication.`
      );
    } catch (error) {
      Alert.alert("Notifications", error instanceof Error ? error.message : "Activation impossible.");
    } finally {
      setSchedulingPlanId(null);
    }
  };

  const confirmProfileReset = () => {
    Alert.alert(
      "Nouvelle niche ?",
      "Ta connexion reste active. Les questions de départ seront relancées pour reconstruire un plan adapté.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Recommencer", style: "destructive", onPress: onResetCreatorProfile }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.kicker}>PLAN SUR 7 JOURS</Text>
        <Text style={styles.title}>Le bon contenu, au bon moment.</Text>
        <Text style={styles.subtitle}>
          Un rythme calculé à partir de ton profil, de tes réponses et de l’analyse réelle du compte.
        </Text>
      </View>

      <View style={styles.contextStrip}>
        <View style={styles.contextItem}>
          <Ionicons color={palette.mint} name="locate-outline" size={17} />
          <Text numberOfLines={1} style={styles.contextText}>{profile.nicheTopic || profile.niche}</Text>
        </View>
        <View style={styles.contextDivider} />
        <View style={styles.contextItem}>
          <Ionicons
            color={accountContext ? palette.mint : palette.muted}
            name={accountContext ? "checkmark-circle" : "analytics-outline"}
            size={17}
          />
          <Text numberOfLines={1} style={styles.contextText}>
            {accountContext ? `Analyse ${accountContext.score}/100` : "Profil déclaré"}
          </Text>
        </View>
      </View>

      <TouchableOpacity disabled={isGenerating} onPress={buildPlan} style={[styles.primaryButton, isGenerating && styles.disabled]}>
        {isGenerating ? <ActivityIndicator color={palette.ink} /> : <Ionicons color={palette.ink} name="sparkles" size={20} />}
        <Text style={styles.primaryText}>
          {isGenerating ? "Construction de ta semaine..." : activePlan ? "Générer un nouveau plan" : "Construire mon plan personnalisé"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={confirmProfileReset} style={styles.resetButton}>
        <Ionicons color={palette.sky} name="refresh-outline" size={18} />
        <Text style={styles.resetText}>Nouveau compte / nouvelle niche</Text>
      </TouchableOpacity>

      {isGenerating ? (
        <GlassPanel style={styles.loadingPanel} textureOpacity={0.18}>
          <View style={styles.loadingIcon}><Ionicons color={palette.ink} name="flash" size={21} /></View>
          <View style={styles.flex}>
            <Text style={styles.loadingTitle}>Une seule analyse pour toute la semaine</Text>
            <Text style={styles.loadingText}>VIRALY croise ton rythme, ta niche, ton diagnostic et ton objectif.</Text>
          </View>
        </GlassPanel>
      ) : null}

      {activePlan ? (
        <>
          <SectionHeader eyebrow={planRange(activePlan)} title="Plan recommandé" action={activePlan.source === "fallback_rules" ? "Plan immédiat" : "Plan IA"} />

          <GlassPanel style={styles.decisionPanel} textureOpacity={0.2}>
            <Text style={styles.decisionLabel}>STRATÉGIE RETENUE</Text>
            <Text style={styles.decision}>{activePlan.strategyDecision}</Text>
            <Text style={styles.summary}>{activePlan.summary}</Text>
          </GlassPanel>

          <View style={styles.mixRow}>
            <View style={styles.mixItem}>
              <Ionicons color={palette.mint} name="videocam-outline" size={21} />
              <Text style={styles.mixValue}>{activePlan.contentMix.videos}</Text>
              <Text style={styles.mixLabel}>VIDÉOS</Text>
            </View>
            <View style={styles.mixItem}>
              <Ionicons color={palette.sky} name="albums-outline" size={21} />
              <Text style={styles.mixValue}>{activePlan.contentMix.carousels}</Text>
              <Text style={styles.mixLabel}>CARROUSELS</Text>
            </View>
            <View style={styles.mixItem}>
              <Ionicons color={palette.lemon} name="phone-portrait-outline" size={21} />
              <Text style={styles.mixValue}>{activePlan.contentMix.stories}</Text>
              <Text style={styles.mixLabel}>STORIES</Text>
            </View>
          </View>

          <View style={styles.revenueLine}>
            <Ionicons color={palette.sky} name="trending-up-outline" size={18} />
            <Text style={styles.revenueText}>Revenu potentiel après modifications appliquées : <Text style={styles.revenueValue}>{activePlan.revenuePotentialAfter}</Text></Text>
          </View>

          <View style={styles.planActions}>
            <TouchableOpacity disabled={syncingPlanId !== null} onPress={() => syncPlan(activePlan)} style={styles.actionButton}>
              {syncingPlanId === activePlan.id ? <ActivityIndicator color={palette.mint} /> : <Ionicons color={palette.mint} name="calendar-outline" size={19} />}
              <Text style={styles.actionText}>Synchroniser</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={schedulingPlanId !== null} onPress={() => schedulePlan(activePlan)} style={styles.actionButton}>
              {schedulingPlanId === activePlan.id ? <ActivityIndicator color={palette.sky} /> : <Ionicons color={palette.sky} name="notifications-outline" size={19} />}
              <Text style={styles.actionText}>Activer les rappels</Text>
            </TouchableOpacity>
          </View>

          <SectionHeader eyebrow="Exécution" title="Chaque jour, chaque moment" action={`${activePlan.events.length} actions`} />
          <View style={styles.days}>
            {groupedDays.map(([date, events], dayIndex) => (
              <View key={date} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayIndex}>{String(dayIndex + 1).padStart(2, "0")}</Text>
                  <Text style={styles.dayTitle}>{dayTitle(date)}</Text>
                </View>
                <View style={styles.eventStack}>
                  {events
                    .slice()
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((event) => {
                      const meta = formatMeta[event.type];
                      return (
                        <View key={event.id} style={styles.eventRow}>
                          <View style={styles.eventTime}>
                            <Text style={styles.time}>{event.time}</Text>
                            <Text style={styles.moment}>{momentLabel(event.time)}</Text>
                          </View>
                          <View style={styles.eventDivider} />
                          <View style={styles.eventCopy}>
                            <View style={styles.typeLine}>
                              <Ionicons color={palette.mint} name={meta.icon} size={15} />
                              <Text style={styles.typeLabel}>{meta.label}</Text>
                            </View>
                            <Text style={styles.eventTitle}>{event.title}</Text>
                            <Text style={styles.eventHook}>{event.hook}</Text>
                            <Text style={styles.eventCta}>CTA · {event.cta}</Text>
                          </View>
                        </View>
                      );
                    })}
                </View>
              </View>
            ))}
          </View>

          <SectionHeader eyebrow="Ligne directrice" title="Ce que tu mesures" />
          <View style={styles.focusList}>
            {activePlan.weeklyFocus.map((focus, index) => (
              <View key={`${focus}-${index}`} style={styles.focusRow}>
                <Text style={styles.focusNumber}>{String(index + 1).padStart(2, "0")}</Text>
                <Text style={styles.focusText}>{focus}</Text>
              </View>
            ))}
          </View>
        </>
      ) : !isGenerating && !isLoadingHistory ? (
        <GlassPanel style={styles.emptyPanel} textureOpacity={0.12}>
          <Ionicons color={palette.mint} name="calendar-clear-outline" size={27} />
          <View style={styles.flex}>
            <Text style={styles.emptyTitle}>Ta semaine est prête à être construite</Text>
            <Text style={styles.emptyText}>Le premier plan fixera tes formats, tes horaires et les sujets précis des 7 prochains jours.</Text>
          </View>
        </GlassPanel>
      ) : null}

      {plans.length ? (
        <>
          <SectionHeader eyebrow="Archives" title="Anciens plans" action={`${plans.length} enregistré${plans.length > 1 ? "s" : ""}`} />
          <View style={styles.historyList}>
            {plans.map((plan, index) => (
              <View key={plan.id} style={[styles.historyRow, plan.id === activePlan?.id && styles.historySelected]}>
                <TouchableOpacity onPress={() => setSelectedPlanId(plan.id)} style={styles.historyMain}>
                  <View style={styles.historyTop}>
                    <Text style={styles.historyTitle}>{index === 0 ? "Dernier plan" : `Plan du ${createdLabel(plan.createdAt)}`}</Text>
                    <Text style={styles.historyRange}>{planRange(plan)}</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.historySummary}>{plan.strategyDecision}</Text>
                  <Text style={styles.historyMix}>{plan.contentMix.videos} vidéos · {plan.contentMix.carousels} carrousels · {plan.contentMix.stories} stories</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityLabel="Synchroniser ce plan" disabled={syncingPlanId !== null} onPress={() => syncPlan(plan)} style={styles.historySync}>
                  {syncingPlanId === plan.id ? <ActivityIndicator color={palette.mint} /> : <Ionicons color={palette.mint} name="sync-outline" size={20} />}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.lg },
  header: { gap: spacing.sm },
  kicker: { ...typography.caption, color: palette.mint },
  title: { ...typography.title, color: palette.white },
  subtitle: { ...typography.body, color: palette.paperMuted },
  contextStrip: { alignItems: "center", backgroundColor: "rgba(3,10,27,0.72)", borderColor: palette.line, borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  contextItem: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.xs, minWidth: 0 },
  contextText: { ...typography.caption, color: palette.paperMuted, flexShrink: 1 },
  contextDivider: { backgroundColor: palette.line, height: 21, width: 1 },
  primaryButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 54, paddingHorizontal: spacing.lg },
  primaryText: { ...typography.caption, color: palette.ink, textAlign: "center" },
  resetButton: { alignItems: "center", alignSelf: "flex-start", borderColor: palette.line, borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 42, paddingHorizontal: spacing.md },
  resetText: { ...typography.caption, color: palette.sky },
  disabled: { opacity: 0.5 },
  flex: { flex: 1 },
  loadingPanel: { alignItems: "center", flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  loadingIcon: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 44, justifyContent: "center", width: 44 },
  loadingTitle: { ...typography.h3, color: palette.white },
  loadingText: { ...typography.caption, color: palette.paperMuted, marginTop: 3 },
  decisionPanel: { borderColor: palette.lineStrong, gap: spacing.sm, padding: spacing.xl },
  decisionLabel: { ...typography.caption, color: palette.mint },
  decision: { ...typography.h2, color: palette.white },
  summary: { ...typography.body, color: palette.paperMuted },
  mixRow: { flexDirection: "row", gap: spacing.sm },
  mixItem: { alignItems: "center", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flex: 1, gap: 4, minHeight: 112, paddingHorizontal: spacing.xs, paddingVertical: spacing.md },
  mixValue: { color: palette.white, fontSize: 27, fontWeight: "800", lineHeight: 32 },
  mixLabel: { color: palette.paperMuted, fontSize: 9, fontWeight: "800" },
  revenueLine: { alignItems: "center", borderBottomColor: palette.line, borderTopColor: palette.line, borderWidth: 0, borderBottomWidth: 1, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.md },
  revenueText: { ...typography.caption, color: palette.paperMuted, flex: 1 },
  revenueValue: { color: palette.white },
  planActions: { flexDirection: "row", gap: spacing.sm },
  actionButton: { alignItems: "center", backgroundColor: palette.panel, borderColor: palette.lineStrong, borderRadius: radius.md, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.sm },
  actionText: { ...typography.caption, color: palette.white, textAlign: "center" },
  days: { gap: spacing.xl },
  daySection: { gap: spacing.md },
  dayHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  dayIndex: { ...typography.caption, color: palette.mint },
  dayTitle: { ...typography.h3, color: palette.white },
  eventStack: { gap: spacing.sm },
  eventRow: { alignItems: "stretch", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", minHeight: 136, padding: spacing.md },
  eventTime: { alignItems: "center", justifyContent: "flex-start", paddingTop: 2, width: 72 },
  time: { ...typography.h3, color: palette.white },
  moment: { color: palette.sky, fontSize: 10, fontWeight: "700", marginTop: 3 },
  eventDivider: { backgroundColor: palette.lineStrong, marginHorizontal: spacing.md, width: 1 },
  eventCopy: { flex: 1, gap: 5, minWidth: 0 },
  typeLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  typeLabel: { ...typography.caption, color: palette.mint },
  eventTitle: { ...typography.h3, color: palette.white },
  eventHook: { color: palette.paperMuted, fontSize: 13, lineHeight: 19 },
  eventCta: { color: palette.sky, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  focusList: { borderBottomColor: palette.line, borderTopColor: palette.line, borderBottomWidth: 1, borderTopWidth: 1 },
  focusRow: { alignItems: "flex-start", borderBottomColor: palette.line, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  focusNumber: { ...typography.caption, color: palette.mint, width: 26 },
  focusText: { ...typography.body, color: palette.white, flex: 1 },
  emptyPanel: { alignItems: "center", flexDirection: "row", gap: spacing.md, padding: spacing.xl },
  emptyTitle: { ...typography.h3, color: palette.white },
  emptyText: { ...typography.body, color: palette.paperMuted, marginTop: 4 },
  historyList: { gap: spacing.sm },
  historyRow: { alignItems: "stretch", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", minHeight: 128, overflow: "hidden" },
  historySelected: { borderColor: palette.lineStrong },
  historyMain: { flex: 1, gap: spacing.xs, justifyContent: "center", padding: spacing.md },
  historyTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  historyTitle: { ...typography.h3, color: palette.white, flex: 1 },
  historyRange: { ...typography.caption, color: palette.mint },
  historySummary: { color: palette.paperMuted, fontSize: 12, lineHeight: 17 },
  historyMix: { color: palette.sky, fontSize: 11, fontWeight: "700" },
  historySync: { alignItems: "center", borderLeftColor: palette.line, borderLeftWidth: 1, justifyContent: "center", width: 54 }
});
