import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from "react-native-svg";

import { palette, radius, spacing, typography } from "../theme";
import { IconName } from "../types";
import { GlassPanel } from "./GlassPanel";

export type Recommendation = {
  icon: IconName;
  title: string;
  label: string;
  value: string;
  color: string;
};

export function RecommendationRail({
  items,
  onSelect
}: {
  items: Recommendation[];
  onSelect?: (item: Recommendation, index: number) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.recommendationContent} horizontal showsHorizontalScrollIndicator={false} style={styles.rail}>
      {items.map((item, index) => (
        <TouchableOpacity accessibilityRole="button" key={item.title} onPress={() => onSelect?.(item, index)}>
          <RecommendationCard featured={index === 0} item={item} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function RecommendationCard({ item, featured }: { item: Recommendation; featured: boolean }) {
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(reveal, { damping: 17, delay: featured ? 80 : 150, stiffness: 120, toValue: 1, useNativeDriver: true }).start();
  }, [featured, reveal]);

  return (
    <Animated.View style={{ opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
      <GlassPanel glow={featured} style={[styles.recommendationCard, featured && styles.recommendationFeatured]} textureOpacity={0.12}>
        <View style={styles.recommendationTop}>
          <View style={[styles.recommendationIcon, { backgroundColor: `${item.color}22`, borderColor: `${item.color}66` }]}>
            <Ionicons color={item.color} name={item.icon} size={20} />
          </View>
          {featured ? <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>PRIORITÉ</Text></View> : null}
        </View>
        <Text numberOfLines={3} style={styles.recommendationTitle}>{item.title}</Text>
        <View style={styles.recommendationMetric}>
          <Text style={styles.recommendationLabel}>{item.label}</Text>
          <Text style={[styles.recommendationValue, { color: item.color }]}>{item.value}</Text>
        </View>
        <MiniSparkline color={item.color} variant={featured ? 0 : item.icon === "time-outline" ? 1 : 2} />
      </GlassPanel>
    </Animated.View>
  );
}

export function MiniSparkline({ color, variant = 0 }: { color: string; variant?: number }) {
  const paths = [
    "M2 38 C18 38 21 21 34 27 C47 33 52 10 65 18 C76 25 84 13 98 4",
    "M2 35 C15 26 25 37 37 31 C48 25 55 16 68 21 C79 25 87 8 98 12",
    "M2 37 C15 35 23 25 37 29 C50 33 57 22 70 20 C84 17 90 6 98 9"
  ];
  return (
    <Svg height="45" viewBox="0 0 100 45" width="100%">
      <Defs>
        <SvgLinearGradient id={`spark-${variant}`} x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity="0.1" />
          <Stop offset="1" stopColor={color} />
        </SvgLinearGradient>
      </Defs>
      <Path d={`${paths[variant]} L98 45 L2 45 Z`} fill={color} opacity="0.06" />
      <Path d={paths[variant]} fill="none" stroke={`url(#spark-${variant})`} strokeLinecap="round" strokeWidth="1.8" />
    </Svg>
  );
}

const GROWTH_PROGRESS_KEY = "viraly_growth_progress";

async function readGrowthProgress(progressKey: string) {
  try {
    const raw = Platform.OS === "web" && typeof window !== "undefined"
      ? window.localStorage.getItem(GROWTH_PROGRESS_KEY)
      : await (await import("expo-secure-store")).getItemAsync(GROWTH_PROGRESS_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Record<string, number[]>;
    return Array.isArray(saved[progressKey]) ? saved[progressKey] : null;
  } catch {
    return null;
  }
}

async function writeGrowthProgress(progressKey: string, values: number[]) {
  try {
    const secureStore = Platform.OS === "web" ? null : await import("expo-secure-store");
    const raw = Platform.OS === "web" && typeof window !== "undefined"
      ? window.localStorage.getItem(GROWTH_PROGRESS_KEY)
      : await secureStore?.getItemAsync(GROWTH_PROGRESS_KEY);
    const saved = raw ? JSON.parse(raw) as Record<string, number[]> : {};
    saved[progressKey] = values;
    const next = JSON.stringify(saved);
    if (Platform.OS === "web" && typeof window !== "undefined") window.localStorage.setItem(GROWTH_PROGRESS_KEY, next);
    else await secureStore?.setItemAsync(GROWTH_PROGRESS_KEY, next);
  } catch {
    // The checklist still works in memory when device storage is unavailable.
  }
}

export function GrowthJourney({
  active = 2,
  niche = "ta niche",
  platform = "TikTok"
}: {
  active?: number;
  niche?: string;
  platform?: string;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const progressKey = `${platform}:${niche}`.toLowerCase();
  const initialCompleted = Array.from({ length: Math.max(0, active - 1) }, (_, index) => index);
  const [completed, setCompleted] = useState<Set<number>>(new Set(initialCompleted));
  const [expanded, setExpanded] = useState<number | null>(0);
  const missions = [
    {
      title: "Analyser",
      summary: "Lire le compte avant d'agir",
      tasks: [
        `Importer une capture récente du profil ${platform}.`,
        "Noter le score, le prochain levier et les trois statistiques principales.",
        "Choisir la faiblesse qui sera corrigée en premier."
      ]
    },
    {
      title: "Optimiser",
      summary: "Clarifier le profil",
      tasks: [
        `Réécrire la bio: cible précise + résultat concret en ${niche} + prochaine action.`,
        "Aligner le nom, la photo et les trois contenus épinglés sur cette promesse.",
        "Faire relire le profil: la promesse doit être comprise en cinq secondes."
      ]
    },
    {
      title: "Booster",
      summary: "Exécuter les meilleurs posts",
      tasks: [
        "Choisir trois posts complets du plan et les placer dans le calendrier.",
        "Publier sans changer le hook, le format et le créneau en même temps.",
        "Relever vues, abonnements, sauvegardes et demandes après 24 heures."
      ]
    },
    {
      title: "Monétiser",
      summary: "Relier contenu et offre",
      tasks: [
        "Choisir une seule offre, ressource ou recommandation à mettre en avant.",
        "Créer un contenu preuve qui montre le problème, la méthode et le résultat.",
        "Utiliser la même prochaine action sur trois publications consécutives."
      ]
    },
    {
      title: "Scaler",
      summary: "Répéter ce qui gagne",
      tasks: [
        "Identifier les deux angles qui convertissent le mieux, pas seulement ceux qui font des vues.",
        "Décliner chaque angle avec trois nouveaux exemples propres à la niche.",
        "Comparer les variantes sur sept jours et conserver seulement la meilleure."
      ]
    }
  ];

  useEffect(() => {
    let mounted = true;
    readGrowthProgress(progressKey).then((saved) => {
      if (mounted) setCompleted(new Set(saved ?? initialCompleted));
    });
    return () => { mounted = false; };
  }, [progressKey]);

  const toggleMission = (index: number) => {
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      writeGrowthProgress(progressKey, [...next]).catch(() => {});
      return next;
    });
  };

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { duration: 1250, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(pulse, { duration: 1250, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <GlassPanel style={styles.journey} textureOpacity={0.16}>
      <View style={styles.journeyTop}>
        <View>
          <Text style={styles.journeyEyebrow}>TON PARCOURS DE CROISSANCE</Text>
          <Text style={styles.journeyTitle}>Missions à valider</Text>
        </View>
        <View style={styles.dayBadge}><Text style={styles.dayBadgeText}>{completed.size} / 5</Text></View>
      </View>
      <View style={styles.missionList}>
        {missions.map((mission, index) => {
          const checked = completed.has(index);
          const isCurrent = !checked && index === missions.findIndex((_, itemIndex) => !completed.has(itemIndex));
          return (
            <View key={mission.title} style={[styles.mission, checked && styles.missionChecked]}>
              <View style={styles.missionTop}>
                <TouchableOpacity accessibilityLabel={`${checked ? "Décocher" : "Cocher"} ${mission.title}`} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => toggleMission(index)}>
                  <Animated.View style={[
                    styles.missionCheckbox,
                    checked && styles.missionCheckboxChecked,
                    isCurrent ? { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.08] }) }] } : undefined
                  ]}>
                    {checked ? <Ionicons color={palette.white} name="checkmark" size={17} /> : <Text style={styles.missionNumber}>{index + 1}</Text>}
                  </Animated.View>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" onPress={() => setExpanded((current) => current === index ? null : index)} style={styles.missionToggle}>
                  <View style={styles.missionCopy}>
                    <Text style={[styles.missionTitle, checked && styles.missionTitleChecked]}>{mission.title}</Text>
                    <Text style={styles.missionSummary}>{mission.summary}</Text>
                  </View>
                  <View style={styles.executePill}>
                    <Text style={styles.executePillText}>À EXÉCUTER</Text>
                    <Ionicons color={palette.electric} name={expanded === index ? "chevron-up" : "chevron-down"} size={15} />
                  </View>
                </TouchableOpacity>
              </View>
              {expanded === index ? (
                <View style={styles.missionDetails}>
                  {mission.tasks.map((task, taskIndex) => (
                    <View key={task} style={styles.missionTask}>
                      <Text style={styles.missionTaskIndex}>{String(taskIndex + 1).padStart(2, "0")}</Text>
                      <Text style={styles.missionTaskText}>{task}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  rail: { marginHorizontal: -spacing.lg },
  recommendationContent: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 3 },
  recommendationCard: { gap: spacing.sm, height: 205, padding: spacing.md, width: 178 },
  recommendationFeatured: { width: 194 },
  recommendationTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  recommendationIcon: { alignItems: "center", borderRadius: radius.sm, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  livePill: { alignItems: "center", backgroundColor: "rgba(16,76,173,0.34)", borderRadius: radius.pill, flexDirection: "row", gap: 4, paddingHorizontal: 6, paddingVertical: 4 },
  liveDot: { backgroundColor: palette.cyan, borderRadius: radius.pill, height: 4, width: 4 },
  liveText: { color: palette.sky, fontSize: 7, fontWeight: "900" },
  recommendationTitle: { color: palette.white, fontSize: 15, fontWeight: "800", lineHeight: 20, minHeight: 60 },
  recommendationMetric: { gap: 2 },
  recommendationLabel: { color: palette.muted, fontSize: 9, fontWeight: "700" },
  recommendationValue: { fontSize: 17, fontWeight: "900" },
  journey: { gap: spacing.lg, padding: spacing.lg },
  journeyTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  journeyEyebrow: { ...typography.caption, color: palette.electric, fontSize: 9 },
  journeyTitle: { ...typography.h3, color: palette.white, marginTop: 3 },
  dayBadge: { backgroundColor: "rgba(18,69,153,0.36)", borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  dayBadgeText: { color: palette.sky, fontSize: 10, fontWeight: "800" },
  missionList: { gap: 3 },
  mission: { backgroundColor: "rgba(4,13,31,0.58)", borderRadius: radius.sm, overflow: "hidden" },
  missionChecked: { backgroundColor: "rgba(10,48,104,0.45)" },
  missionTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 62, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  missionCheckbox: { alignItems: "center", backgroundColor: "rgba(8,23,51,0.96)", borderColor: "rgba(84,131,207,0.45)", borderRadius: radius.sm, borderWidth: 1, height: 34, justifyContent: "center", width: 34 },
  missionCheckboxChecked: { backgroundColor: palette.electric, borderColor: palette.cyan, shadowColor: palette.electric, shadowOpacity: 0.7, shadowRadius: 8 },
  missionNumber: { color: palette.paperMuted, fontSize: 10, fontWeight: "900" },
  missionToggle: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm },
  missionCopy: { flex: 1, gap: 2, minWidth: 0 },
  missionTitle: { color: palette.white, fontSize: 13, fontWeight: "800" },
  missionTitleChecked: { color: palette.sky },
  missionSummary: { color: palette.muted, fontSize: 9, lineHeight: 12 },
  executePill: { alignItems: "center", flexDirection: "row", gap: 4 },
  executePillText: { color: palette.electric, fontSize: 7, fontWeight: "900" },
  missionDetails: { borderTopColor: "rgba(73,117,188,0.18)", borderTopWidth: 1, gap: spacing.sm, padding: spacing.md, paddingLeft: 51 },
  missionTask: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  missionTaskIndex: { color: palette.electric, fontSize: 8, fontWeight: "900", paddingTop: 2 },
  missionTaskText: { color: palette.paperMuted, flex: 1, fontSize: 11, lineHeight: 17 }
});
