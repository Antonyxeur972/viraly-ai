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
import { NeonButton } from "../components/NeonButton";
import { ReadableText } from "../components/ReadableText";
import { ScreenHero } from "../components/ScreenHero";
import { SectionHeader } from "../components/SectionHeader";
import {
  CalendarEvent,
  ContentPlan,
  deleteContentPlan,
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

type PlanDuration = 7 | 14 | 30;

const planDurations: PlanDuration[] = [7, 14, 30];

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
  if (plan.startDate && plan.endDate) return `${shortDate(plan.startDate)} - ${shortDate(plan.endDate)}`;
  const dates = plan.events.map((event) => event.date).sort();
  if (!dates.length) return "7 jours";
  return `${shortDate(dates[0])} - ${shortDate(dates[dates.length - 1])}`;
}

function dateAfter(start: string, offset: number) {
  const value = new Date(`${start}T12:00:00`);
  value.setDate(value.getDate() + offset);
  return value.toISOString().slice(0, 10);
}

function planDays(plan: ContentPlan) {
  const grouped = groupEvents(plan.events);
  const sortedDates = plan.events.map((event) => event.date).sort();
  const start = plan.startDate || sortedDates[0];
  const duration = plan.durationDays || 7;
  if (!start) return [];
  return Array.from({ length: duration }, (_, offset) => {
    const date = dateAfter(start, offset);
    return [date, grouped[date] || []] as const;
  });
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
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null);
  const [schedulingPlanId, setSchedulingPlanId] = useState<string | null>(null);
  const [remindersActive, setRemindersActive] = useState(false);
  const [duration, setDuration] = useState<PlanDuration>(7);

  useEffect(() => {
    listContentPlans(20)
      .then((savedPlans) => {
        setPlans(savedPlans);
        setSelectedPlanId(savedPlans[0]?.id || null);
        if (savedPlans[0]?.events.length) {
          import("../services/postNotifications")
            .then(({ schedulePostNotifications }) =>
              schedulePostNotifications(savedPlans[0].events, { requestPermission: false })
            )
            .then((result) => setRemindersActive(result.permissionGranted && result.scheduled > 0))
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingHistory(false));
  }, []);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || plans[0] || null,
    [plans, selectedPlanId]
  );
  const groupedDays = useMemo(
    () => activePlan ? planDays(activePlan) : [],
    [activePlan]
  );

  const buildPlan = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const plan = await generateContentPlan(profile, accountContext, localToday(), duration);
      setPlans((current) => [plan, ...current.filter((item) => item.id !== plan.id)].slice(0, 20));
      setSelectedPlanId(plan.id);
      import("../services/postNotifications")
        .then(({ schedulePostNotifications }) => schedulePostNotifications(plan.events))
        .then((result) => setRemindersActive(result.scheduled > 0))
        .catch(() => setRemindersActive(false));
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
        `${result.scheduled} relance${result.scheduled > 1 ? "s" : ""} programmée${result.scheduled > 1 ? "s" : ""} pour ${result.publishingMoments} publication${result.publishingMoments > 1 ? "s" : ""} : préparation 2 h avant, puis alerte 20 min avant.`
      );
      setRemindersActive(result.scheduled > 0);
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

  const confirmDeletePlan = (plan: ContentPlan) => {
    Alert.alert(
      "Supprimer ce plan ?",
      "Le calendrier détaillé et tous ses conseils seront retirés de l’historique.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            deleteContentPlan(plan.id)
              .then(() => {
                setPlans((current) => {
                  const next = current.filter((item) => item.id !== plan.id);
                  if (selectedPlanId === plan.id) setSelectedPlanId(next[0]?.id || null);
                  return next;
                });
                if (expandedPlanId === plan.id) setExpandedPlanId(null);
              })
              .catch((error) => Alert.alert("Historique", error instanceof Error ? error.message : "Suppression impossible."));
          }
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHero
        eyebrow="Plan de publication"
        icon="calendar-clear-outline"
        subtitle="Un rythme calculé à partir de ton profil, de tes réponses et de l’analyse réelle du compte."
        title={<>Le bon contenu, au <Text style={styles.titleAccent}>bon moment.</Text></>}
      />

      <View style={styles.durationControl}>
        {planDurations.map((value) => {
          const selected = value === duration;
          return (
            <TouchableOpacity
              accessibilityState={{ selected }}
              key={value}
              onPress={() => setDuration(value)}
              style={[styles.durationOption, selected && styles.durationOptionActive]}
            >
              <Text style={[styles.durationValue, selected && styles.durationValueActive]}>{value}</Text>
              <Text style={[styles.durationLabel, selected && styles.durationLabelActive]}>JOURS</Text>
            </TouchableOpacity>
          );
        })}
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

      <NeonButton
        disabled={isGenerating}
        onPress={buildPlan}
        title={isGenerating ? `Construction sur ${duration} jours...` : activePlan ? `Ajouter un plan de ${duration} jours` : `Construire mon plan sur ${duration} jours`}
      />

      <TouchableOpacity onPress={confirmProfileReset} style={styles.resetButton}>
        <Ionicons color={palette.sky} name="refresh-outline" size={18} />
        <Text style={styles.resetText}>Nouveau compte / nouvelle niche</Text>
      </TouchableOpacity>

      {isGenerating ? (
        <GlassPanel style={styles.loadingPanel} textureOpacity={0.18}>
          <View style={styles.loadingIcon}><Ionicons color={palette.ink} name="flash" size={21} /></View>
          <View style={styles.flex}>
            <Text style={styles.loadingTitle}>Une stratégie complète sur {duration} jours</Text>
            <Text style={styles.loadingText}>Le nouveau plan sera ajouté sans supprimer les précédents.</Text>
          </View>
        </GlassPanel>
      ) : null}

      {activePlan ? (
        <>
          <SectionHeader eyebrow={planRange(activePlan)} title="Plan recommandé" action={activePlan.source === "fallback_rules" ? "Plan immédiat" : "Plan IA"} />

          <GlassPanel glow style={styles.decisionPanel} textureOpacity={0.2}>
            <Text style={styles.decisionLabel}>STRATÉGIE RETENUE</Text>
            <ReadableText text={activePlan.strategyDecision} textStyle={styles.decision} />
            <ReadableText text={activePlan.summary} textStyle={styles.summary} />
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
              <Text style={styles.actionText}>{remindersActive ? "Relances actives" : "Activer les relances"}</Text>
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
                  {events.length ? events
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
                    }) : (
                      <View style={styles.restRow}>
                        <Ionicons color={palette.muted} name="create-outline" size={17} />
                        <Text style={styles.restText}>Préparation, réponses aux commentaires et analyse des signaux.</Text>
                      </View>
                    )}
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
            <Text style={styles.emptyTitle}>Ton prochain cycle est prêt à être construit</Text>
            <Text style={styles.emptyText}>Choisis 7, 14 ou 30 jours. Chaque nouveau plan restera disponible dans l’historique.</Text>
          </View>
        </GlassPanel>
      ) : null}

      {plans.length ? (
        <>
          <SectionHeader eyebrow="Archives" title="Anciens plans" action={`${plans.length} enregistré${plans.length > 1 ? "s" : ""}`} />
          <View style={styles.historyList}>
            {plans.map((plan, index) => (
              <View key={plan.id} style={[styles.historyCard, plan.id === activePlan?.id && styles.historySelected]}>
                <View style={styles.historyRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPlanId(plan.id);
                      setExpandedPlanId((current) => current === plan.id ? null : plan.id);
                    }}
                    style={styles.historyMain}
                  >
                    <View style={styles.historyTop}>
                      <Text style={styles.historyTitle}>{index === 0 ? `Dernier plan · ${plan.durationDays || 7} j` : `Plan ${plan.durationDays || 7} j · ${createdLabel(plan.createdAt)}`}</Text>
                      <Text style={styles.historyRange}>{planRange(plan)}</Text>
                    </View>
                    <Text numberOfLines={2} style={styles.historySummary}>{plan.strategyDecision}</Text>
                    <Text style={styles.historyMix}>{plan.contentMix.videos} vidéos · {plan.contentMix.carousels} carrousels · {plan.contentMix.stories} stories</Text>
                    <View style={styles.historyReadLine}>
                      <Ionicons color={palette.mint} name={expandedPlanId === plan.id ? "chevron-up" : "reader-outline"} size={14} />
                      <Text style={styles.historyRead}>{expandedPlanId === plan.id ? "Réduire les détails" : "Lire tous les conseils"}</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.historyTools}>
                    <TouchableOpacity accessibilityLabel="Synchroniser ce plan" disabled={syncingPlanId !== null} onPress={() => syncPlan(plan)} style={styles.historyToolButton}>
                      {syncingPlanId === plan.id ? <ActivityIndicator color={palette.mint} /> : <Ionicons color={palette.mint} name="sync-outline" size={19} />}
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityLabel="Supprimer ce plan" onPress={() => confirmDeletePlan(plan)} style={styles.historyToolButton}>
                      <Ionicons color={palette.muted} name="trash-outline" size={18} />
                    </TouchableOpacity>
                  </View>
                </View>
                {expandedPlanId === plan.id ? (
                  <View style={styles.historyDetails}>
                    <Text style={styles.detailLabel}>DÉCISION</Text>
                    <ReadableText text={plan.strategyDecision} textStyle={styles.detailText} />
                    <Text style={styles.detailLabel}>POURQUOI CE RYTHME</Text>
                    <ReadableText text={plan.summary} textStyle={styles.detailText} />
                    <Text style={styles.detailLabel}>CONSEILS À MESURER</Text>
                    <View style={styles.detailFocusList}>
                      {plan.weeklyFocus.map((focus, focusIndex) => (
                        <View key={`${focus}-${focusIndex}`} style={styles.detailFocusRow}>
                          <Text style={styles.detailFocusNumber}>{focusIndex + 1}</Text>
                          <Text style={styles.detailText}>{focus}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.detailLabel}>CALENDRIER COMPLET</Text>
                    <View style={styles.detailEvents}>
                      {plan.events
                        .slice()
                        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
                        .map((event) => {
                          const meta = formatMeta[event.type];
                          return (
                            <View key={event.id} style={styles.detailEventRow}>
                              <View style={styles.detailEventMeta}>
                                <Ionicons color={palette.mint} name={meta.icon} size={15} />
                                <Text style={styles.detailEventDate}>{shortDate(event.date)} · {event.time}</Text>
                              </View>
                              <Text style={styles.detailEventTitle}>{event.title}</Text>
                              <Text style={styles.detailText}>Hook : {event.hook}</Text>
                              <Text style={styles.detailCta}>CTA : {event.cta}</Text>
                            </View>
                          );
                        })}
                    </View>
                  </View>
                ) : null}
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
  titleAccent: { color: palette.electric },
  subtitle: { ...typography.body, color: palette.paperMuted },
  durationControl: { backgroundColor: "rgba(3,10,27,0.62)", borderRadius: radius.md, flexDirection: "row", gap: spacing.xs, padding: spacing.xs },
  durationOption: { alignItems: "center", borderRadius: radius.sm, flex: 1, gap: 1, justifyContent: "center", minHeight: 58 },
  durationOptionActive: { backgroundColor: palette.mint },
  durationValue: { color: palette.paperMuted, fontSize: 19, fontWeight: "800" },
  durationValueActive: { color: palette.ink },
  durationLabel: { color: palette.muted, fontSize: 9, fontWeight: "800" },
  durationLabelActive: { color: "rgba(3,7,17,0.68)" },
  contextStrip: { alignItems: "center", backgroundColor: "rgba(3,10,27,0.54)", borderRadius: radius.pill, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  contextItem: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.xs, minWidth: 0 },
  contextText: { ...typography.caption, color: palette.paperMuted, flexShrink: 1 },
  contextDivider: { backgroundColor: palette.line, height: 21, width: 1 },
  primaryButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 54, paddingHorizontal: spacing.lg },
  primaryText: { ...typography.caption, color: palette.ink, textAlign: "center" },
  resetButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(13,28,57,0.62)", borderRadius: radius.pill, flexDirection: "row", gap: spacing.sm, minHeight: 42, paddingHorizontal: spacing.md },
  resetText: { ...typography.caption, color: palette.sky },
  disabled: { opacity: 0.5 },
  flex: { flex: 1 },
  loadingPanel: { alignItems: "center", flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  loadingIcon: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 44, justifyContent: "center", width: 44 },
  loadingTitle: { ...typography.h3, color: palette.white },
  loadingText: { ...typography.caption, color: palette.paperMuted, marginTop: 3 },
  decisionPanel: { gap: spacing.sm, padding: spacing.xl },
  decisionLabel: { ...typography.caption, color: palette.mint },
  decision: { color: palette.white, fontSize: 18, fontWeight: "700", lineHeight: 25 },
  summary: { ...typography.body, color: palette.paperMuted },
  mixRow: { flexDirection: "row", gap: spacing.sm },
  mixItem: { alignItems: "center", backgroundColor: "rgba(7,17,38,0.82)", borderRadius: radius.md, flex: 1, gap: 4, minHeight: 112, paddingHorizontal: spacing.xs, paddingVertical: spacing.md },
  mixValue: { color: palette.white, fontSize: 27, fontWeight: "800", lineHeight: 32 },
  mixLabel: { color: palette.paperMuted, fontSize: 9, fontWeight: "800" },
  revenueLine: { alignItems: "center", backgroundColor: "rgba(7,17,38,0.54)", borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  revenueText: { ...typography.caption, color: palette.paperMuted, flex: 1 },
  revenueValue: { color: palette.white },
  planActions: { flexDirection: "row", gap: spacing.sm },
  actionButton: { alignItems: "center", backgroundColor: "rgba(13,31,65,0.82)", borderRadius: radius.md, flex: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.sm },
  actionText: { ...typography.caption, color: palette.white, textAlign: "center" },
  days: { gap: spacing.xl },
  daySection: { gap: spacing.md },
  dayHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  dayIndex: { ...typography.caption, color: palette.mint },
  dayTitle: { ...typography.h3, color: palette.white },
  eventStack: { gap: spacing.sm },
  eventRow: { alignItems: "stretch", backgroundColor: "rgba(7,17,38,0.84)", borderRadius: radius.md, flexDirection: "row", minHeight: 136, padding: spacing.md },
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
  restRow: { alignItems: "center", backgroundColor: "rgba(7,17,38,0.38)", borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 54, padding: spacing.md },
  restText: { color: palette.muted, flex: 1, fontSize: 12, lineHeight: 17 },
  focusList: { gap: spacing.xs },
  focusRow: { alignItems: "flex-start", backgroundColor: "rgba(7,17,38,0.42)", borderRadius: radius.sm, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  focusNumber: { ...typography.caption, color: palette.mint, width: 26 },
  focusText: { ...typography.body, color: palette.white, flex: 1 },
  emptyPanel: { alignItems: "center", flexDirection: "row", gap: spacing.md, padding: spacing.xl },
  emptyTitle: { ...typography.h3, color: palette.white },
  emptyText: { ...typography.body, color: palette.paperMuted, marginTop: 4 },
  historyList: { gap: spacing.sm },
  historyCard: { backgroundColor: "rgba(7,17,38,0.72)", borderRadius: radius.md, overflow: "hidden" },
  historyRow: { alignItems: "stretch", flexDirection: "row", minHeight: 142 },
  historySelected: { backgroundColor: "rgba(24,67,139,0.42)" },
  historyMain: { flex: 1, gap: spacing.xs, justifyContent: "center", padding: spacing.md },
  historyTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  historyTitle: { ...typography.h3, color: palette.white, flex: 1 },
  historyRange: { ...typography.caption, color: palette.mint },
  historySummary: { color: palette.paperMuted, fontSize: 12, lineHeight: 17 },
  historyMix: { color: palette.sky, fontSize: 11, fontWeight: "700" },
  historyReadLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs, marginTop: 3 },
  historyRead: { color: palette.mint, fontSize: 10, fontWeight: "800" },
  historyTools: { backgroundColor: "rgba(3,10,27,0.24)", justifyContent: "center", width: 48 },
  historyToolButton: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 56 },
  historyDetails: { backgroundColor: "rgba(3,10,27,0.46)", gap: spacing.md, padding: spacing.lg },
  detailLabel: { ...typography.caption, color: palette.mint, marginTop: spacing.xs },
  detailText: { color: palette.paperMuted, flex: 1, fontSize: 13, lineHeight: 19 },
  detailFocusList: { gap: spacing.sm },
  detailFocusRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  detailFocusNumber: { color: palette.sky, fontSize: 12, fontWeight: "800", width: 20 },
  detailEvents: { gap: spacing.md },
  detailEventRow: { backgroundColor: "rgba(13,31,65,0.48)", borderRadius: radius.sm, gap: spacing.xs, padding: spacing.md },
  detailEventMeta: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  detailEventDate: { ...typography.caption, color: palette.mint },
  detailEventTitle: { ...typography.h3, color: palette.white },
  detailCta: { color: palette.sky, fontSize: 12, fontWeight: "700", lineHeight: 17 }
});
