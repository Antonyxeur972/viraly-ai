import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

const growthSteps = ["Analyser", "Optimiser", "Booster", "Monétiser", "Scaler"];

export function GrowthJourney({ active = 2 }: { active?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
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
          <Text style={styles.journeyTitle}>Plan 7 jours</Text>
        </View>
        <View style={styles.dayBadge}><Text style={styles.dayBadgeText}>Jour {active} sur 7</Text></View>
      </View>
      <View style={styles.steps}>
        <View style={styles.stepsTrack} />
        {growthSteps.map((step, index) => {
          const reached = index + 1 <= active;
          return (
            <View key={step} style={styles.growthStep}>
              <Animated.View style={[
                styles.growthNode,
                reached && styles.growthNodeReached,
                index + 1 === active ? { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.12] }) }] } : undefined
              ]}>
                <Text style={[styles.growthNodeText, reached && styles.growthNodeTextReached]}>{reached && index + 1 < active ? "✓" : index + 1}</Text>
              </Animated.View>
              <Text numberOfLines={2} style={[styles.growthLabel, reached && styles.growthLabelReached]}>{step}</Text>
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
  journey: { gap: spacing.lg, minHeight: 190, padding: spacing.lg },
  journeyTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  journeyEyebrow: { ...typography.caption, color: palette.electric, fontSize: 9 },
  journeyTitle: { ...typography.h3, color: palette.white, marginTop: 3 },
  dayBadge: { backgroundColor: "rgba(18,69,153,0.36)", borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  dayBadgeText: { color: palette.sky, fontSize: 10, fontWeight: "800" },
  steps: { flexDirection: "row", justifyContent: "space-between", position: "relative" },
  stepsTrack: { backgroundColor: "rgba(69,111,180,0.24)", height: 2, left: 22, position: "absolute", right: 22, top: 16 },
  growthStep: { alignItems: "center", flex: 1, gap: 8, zIndex: 2 },
  growthNode: { alignItems: "center", backgroundColor: "rgba(6,17,40,1)", borderColor: "rgba(98,139,202,0.24)", borderRadius: radius.pill, borderWidth: 1, height: 33, justifyContent: "center", width: 33 },
  growthNodeReached: { backgroundColor: "rgba(9,71,166,1)", borderColor: palette.cyan, shadowColor: palette.electric, shadowOpacity: 0.8, shadowRadius: 9 },
  growthNodeText: { color: palette.muted, fontSize: 10, fontWeight: "900" },
  growthNodeTextReached: { color: palette.white },
  growthLabel: { color: palette.muted, fontSize: 8, fontWeight: "700", lineHeight: 11, textAlign: "center" },
  growthLabelReached: { color: palette.paperMuted }
});
