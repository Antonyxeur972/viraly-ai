import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from "react-native-svg";

import { palette, radius, spacing, typography } from "../theme";
import { IconName } from "../types";
import { GlassPanel } from "./GlassPanel";

const journey: Array<{ icon: IconName; label: string; detail: string; color: string }> = [
  { icon: "magnet-outline", label: "HOOK", detail: "Capte", color: palette.electric },
  { icon: "images-outline", label: "CARROUSEL", detail: "Prouve", color: palette.violet },
  { icon: "videocam-outline", label: "VIDÉO", detail: "Raconte", color: palette.cyan },
  { icon: "chatbubble-ellipses-outline", label: "CTA", detail: "Convertit", color: palette.positive },
  { icon: "stats-chart-outline", label: "PREUVE", detail: "Mesure", color: "#7187FF" },
  { icon: "flash-outline", label: "BOOST", detail: "Accélère", color: palette.cyan },
  { icon: "sparkles-outline", label: "OPTIMISE", detail: "Ajuste", color: "#9B6CFF" }
];

export function PlanJourney({ duration }: { duration: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { duration: 1200, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { duration: 1300, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(pulse, { duration: 1300, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress, pulse]);

  return (
    <GlassPanel glow style={styles.panel} textureOpacity={0.18}>
      <View style={styles.top}>
        <View>
          <Text style={styles.eyebrow}>TON PLAN SUR {duration} JOURS</Text>
          <Text style={styles.title}>Un rythme intelligent, jour par jour</Text>
        </View>
        <View style={styles.stepPill}><Ionicons color={palette.sky} name="sparkles" size={13} /><Text style={styles.stepPillText}>7 leviers</Text></View>
      </View>

      <View style={styles.timeline}>
        <View style={styles.track} />
        <Animated.View style={[styles.trackActive, { opacity: progress, transform: [{ scaleX: progress }] }]} />
        {journey.map((step, index) => (
          <View key={step.label} style={styles.nodeColumn}>
            <Text style={styles.day}>J{index + 1}</Text>
            <Animated.View
              style={[
                styles.node,
                index === 0 && styles.nodeActive,
                index === 0 ? {
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) }]
                } : undefined
              ]}
            >
              <View style={[styles.nodeCore, { backgroundColor: index === 0 ? palette.cyan : step.color }]} />
            </Animated.View>
            <View style={styles.dropLine} />
            <View style={[styles.iconTile, { borderColor: `${step.color}66` }]}>
              <View style={[styles.iconGlow, { backgroundColor: step.color }]} />
              <Ionicons color={step.color} name={step.icon} size={19} />
            </View>
            <Text numberOfLines={1} style={styles.label}>{step.label}</Text>
            <Text numberOfLines={1} style={styles.detail}>{step.detail}</Text>
          </View>
        ))}
      </View>

      <View pointerEvents="none" style={styles.wave}>
        <Svg height="72" viewBox="0 0 360 72" width="100%">
          <Defs>
            <SvgLinearGradient id="journeyWave" x1="0" x2="1" y1="0" y2="0">
              <Stop offset="0" stopColor={palette.electric} stopOpacity="0.12" />
              <Stop offset="0.48" stopColor={palette.cyan} />
              <Stop offset="1" stopColor={palette.violet} stopOpacity="0.28" />
            </SvgLinearGradient>
          </Defs>
          <Path d="M0 41 C37 22 69 64 111 47 C151 31 162 13 205 33 C252 54 279 63 315 39 C331 29 345 25 360 30" fill="none" opacity="0.24" stroke={palette.electric} strokeWidth="9" />
          <Path d="M0 41 C37 22 69 64 111 47 C151 31 162 13 205 33 C252 54 279 63 315 39 C331 29 345 25 360 30" fill="none" stroke="url(#journeyWave)" strokeWidth="2" />
        </Svg>
        <Animated.View
          style={[
            styles.waveSpark,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
              transform: [{ translateX: pulse.interpolate({ inputRange: [0, 1], outputRange: [46, 284] }) }]
            }
          ]}
        />
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  panel: { minHeight: 330, overflow: "hidden", paddingHorizontal: spacing.md, paddingTop: spacing.lg },
  top: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  eyebrow: { ...typography.caption, color: palette.electric, fontSize: 9 },
  title: { color: palette.white, fontSize: 16, fontWeight: "800", lineHeight: 22, marginTop: 3 },
  stepPill: { alignItems: "center", backgroundColor: "rgba(15,51,110,0.46)", borderColor: "rgba(96,158,255,0.22)", borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  stepPillText: { color: palette.paperMuted, fontSize: 9, fontWeight: "800" },
  timeline: { flexDirection: "row", height: 188, justifyContent: "space-between", marginTop: spacing.lg, position: "relative" },
  track: { backgroundColor: "rgba(69,111,180,0.22)", height: 2, left: 18, position: "absolute", right: 18, top: 34 },
  trackActive: { backgroundColor: palette.electric, height: 2, left: 18, position: "absolute", right: 18, shadowColor: palette.cyan, shadowOpacity: 1, shadowRadius: 7, top: 34 },
  nodeColumn: { alignItems: "center", flex: 1, minWidth: 0, zIndex: 2 },
  day: { color: palette.paperMuted, fontSize: 9, fontWeight: "800", marginBottom: 6 },
  node: { alignItems: "center", backgroundColor: "rgba(16,54,124,0.92)", borderColor: "rgba(94,161,255,0.42)", borderRadius: radius.pill, borderWidth: 1, height: 20, justifyContent: "center", shadowColor: palette.electric, shadowOpacity: 0.36, shadowRadius: 6, width: 20 },
  nodeActive: { borderColor: palette.cyan, borderWidth: 2, shadowOpacity: 0.95, shadowRadius: 12 },
  nodeCore: { borderRadius: radius.pill, height: 7, width: 7 },
  dropLine: { borderColor: "rgba(49,144,255,0.52)", borderStyle: "dotted", borderWidth: 1, height: 17, marginVertical: 2, width: 1 },
  iconTile: { alignItems: "center", backgroundColor: "rgba(4,15,39,0.90)", borderRadius: radius.sm, borderWidth: 1, height: 39, justifyContent: "center", overflow: "hidden", position: "relative", shadowColor: palette.electric, shadowOpacity: 0.30, shadowRadius: 8, width: 39 },
  iconGlow: { borderRadius: radius.pill, height: 23, opacity: 0.13, position: "absolute", width: 23 },
  label: { color: palette.white, fontSize: 6.8, fontWeight: "900", marginTop: 7, textAlign: "center", width: "100%" },
  detail: { color: palette.muted, fontSize: 6.5, fontWeight: "700", marginTop: 2, textAlign: "center", width: "100%" },
  wave: { bottom: 0, height: 74, left: 0, position: "absolute", right: 0 },
  waveSpark: { backgroundColor: palette.white, borderRadius: radius.pill, height: 5, left: 0, position: "absolute", shadowColor: palette.cyan, shadowOpacity: 1, shadowRadius: 10, top: 32, width: 5 }
});
