import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop
} from "react-native-svg";

import { palette, radius } from "../theme";

export type CinematicVariant = "growth" | "ideas" | "coach" | "plan" | "audit";

type Props = {
  variant: CinematicVariant;
  score?: number;
  metric?: string;
};

export function CinematicVisual({ variant, score = 82, metric }: Props) {
  const drift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { duration: 3200, easing: Easing.inOut(Easing.cubic), toValue: 1, useNativeDriver: true }),
        Animated.timing(drift, { duration: 3200, easing: Easing.inOut(Easing.cubic), toValue: 0, useNativeDriver: true })
      ])
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { duration: 1450, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(pulse, { duration: 1450, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true })
      ])
    );
    const orbitLoop = Animated.loop(
      Animated.timing(orbit, { duration: 11000, easing: Easing.linear, toValue: 1, useNativeDriver: true })
    );
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(scan, { duration: 2400, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(scan, { duration: 0, toValue: 0, useNativeDriver: true })
      ])
    );

    driftLoop.start();
    pulseLoop.start();
    orbitLoop.start();
    scanLoop.start();
    return () => {
      driftLoop.stop();
      pulseLoop.stop();
      orbitLoop.stop();
      scanLoop.stop();
    };
  }, [drift, orbit, pulse, scan]);

  const motion = { drift, pulse, orbit, scan };
  if (variant === "growth") return <GrowthDeck metric={metric} motion={motion} score={score} />;
  if (variant === "coach") return <CoachOrb motion={motion} />;
  if (variant === "ideas") return <IdeaTrails motion={motion} />;
  if (variant === "audit") return <AuditLens motion={motion} />;
  return <PlanSignal motion={motion} />;
}

type Motion = {
  drift: Animated.Value;
  pulse: Animated.Value;
  orbit: Animated.Value;
  scan: Animated.Value;
};

function GrowthDeck({ motion, score, metric }: { motion: Motion; score: number; metric?: string }) {
  const circumference = 2 * Math.PI * 31;
  const dash = Math.max(0, Math.min(100, score)) / 100 * circumference;

  return (
    <View style={styles.scene}>
      <Animated.View
        style={[
          styles.deckGlow,
          {
            opacity: motion.pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.72] }),
            transform: [{ scale: motion.pulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12] }) }]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.depthCard,
          styles.depthCardBack,
          {
            transform: [
              { perspective: 700 },
              { translateY: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [2, -3] }) },
              { rotateY: "-12deg" },
              { rotateZ: "2deg" }
            ]
          }
        ]}
      >
        <LinearGradient colors={["rgba(22,49,100,0.96)", "rgba(3,10,27,0.98)"]} style={StyleSheet.absoluteFill} />
        <Text style={styles.cardValue}>{metric || "2.31K€"}</Text>
        <Text style={styles.cardLabel}>Revenus / mois</Text>
        <Svg height="46" viewBox="0 0 80 46" width="100%">
          <Path d="M2 40 C18 36 22 26 34 29 C45 32 51 13 61 17 C69 19 73 8 79 3" fill="none" stroke={palette.positive} strokeLinecap="round" strokeWidth="3" />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          styles.depthCard,
          styles.depthCardMiddle,
          {
            transform: [
              { perspective: 700 },
              { translateY: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [-2, 3] }) },
              { rotateY: "-9deg" },
              { rotateZ: "1deg" }
            ]
          }
        ]}
      >
        <LinearGradient colors={["rgba(22,49,100,0.98)", "rgba(3,10,27,0.98)"]} style={StyleSheet.absoluteFill} />
        <Text style={styles.cardValue}>+1.2K</Text>
        <Text style={styles.cardLabel}>Abonnés</Text>
        <View style={styles.bars}>
          {[16, 25, 20, 34, 43].map((height, index) => <View key={index} style={[styles.bar, { height }]} />)}
        </View>
      </Animated.View>
      <Animated.View
        style={[
          styles.depthCard,
          styles.depthCardFront,
          {
            transform: [
              { perspective: 700 },
              { translateY: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [3, -3] }) },
              { rotateY: "-5deg" },
              { rotateZ: "-1deg" }
            ]
          }
        ]}
      >
        <LinearGradient colors={["rgba(22,61,129,0.98)", "rgba(2,10,28,0.99)"]} style={StyleSheet.absoluteFill} />
        <Image resizeMode="cover" source={require("../../assets/viraly-mineral-texture.png")} style={styles.cardTexture} />
        <View style={styles.scoreRing}>
          <Svg height="78" viewBox="0 0 78 78" width="78">
            <Defs>
              <SvgLinearGradient id="scoreStroke" x1="0" x2="1" y1="0" y2="1">
                <Stop offset="0" stopColor={palette.cyan} />
                <Stop offset="0.58" stopColor={palette.electric} />
                <Stop offset="1" stopColor={palette.violet} />
              </SvgLinearGradient>
            </Defs>
            <G origin="39, 39" rotation="-90">
              <Circle cx="39" cy="39" fill="none" r="31" stroke="rgba(91,145,226,0.16)" strokeWidth="7" />
              <Circle cx="39" cy="39" fill="none" r="31" stroke="url(#scoreStroke)" strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round" strokeWidth="7" />
            </G>
          </Svg>
          <View style={styles.scoreCopy}>
            <Text style={styles.scoreNumber}>{score}%</Text>
            <Text style={styles.scoreLabel}>Score viral</Text>
          </View>
        </View>
        <View style={styles.progressPill}><View style={styles.progressDot} /><Text style={styles.progressText}>En progression</Text></View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cardScan,
            { transform: [{ translateX: motion.scan.interpolate({ inputRange: [0, 1], outputRange: [-80, 125] }) }, { rotate: "18deg" }] }
          ]}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.particleOrbit,
          { transform: [{ rotate: motion.orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }
        ]}
      >
        <View style={styles.particleOne} />
        <View style={styles.particleTwo} />
        <View style={styles.particleThree} />
      </Animated.View>
    </View>
  );
}

function CoachOrb({ motion }: { motion: Motion }) {
  return (
    <View style={styles.scene}>
      <Animated.View
        style={[
          styles.coachOrbit,
          { transform: [{ rotate: motion.orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }
        ]}
      >
        <View style={styles.coachNodeA} />
        <View style={styles.coachNodeB} />
      </Animated.View>
      <Svg height="154" style={styles.coachSvg} viewBox="0 0 190 154" width="190">
        <Defs>
          <RadialGradient cx="50%" cy="42%" id="orbFill" r="58%">
            <Stop offset="0" stopColor="#1E71FF" stopOpacity="0.62" />
            <Stop offset="0.52" stopColor="#08255E" stopOpacity="0.68" />
            <Stop offset="1" stopColor="#02091A" stopOpacity="0.12" />
          </RadialGradient>
          <SvgLinearGradient id="orbStroke" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor={palette.cyan} />
            <Stop offset="0.48" stopColor={palette.electric} />
            <Stop offset="1" stopColor={palette.violet} />
          </SvgLinearGradient>
        </Defs>
        <Ellipse cx="98" cy="127" fill="none" rx="66" ry="14" stroke="rgba(49,115,255,0.42)" />
        <Ellipse cx="98" cy="127" fill="none" rx="47" ry="9" stroke="rgba(63,183,255,0.36)" />
        <Circle cx="98" cy="72" fill="url(#orbFill)" r="42" stroke="url(#orbStroke)" strokeWidth="3" />
        <Circle cx="98" cy="72" fill="none" opacity="0.42" r="47" stroke="#1A78FF" strokeWidth="1" />
      </Svg>
      <Animated.View
        style={[
          styles.orbHalo,
          {
            opacity: motion.pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.68] }),
            transform: [{ scale: motion.pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.09] }) }]
          }
        ]}
      />
      <Animated.View style={[styles.orbFace, { transform: [{ translateY: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [2, -3] }) }] }]}>
        <View style={styles.eye} /><View style={styles.eye} />
      </Animated.View>
      <Animated.View style={[styles.bubble, styles.bubbleLeft, { transform: [{ translateY: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }]}>
        <View style={styles.bubbleDots}><View style={styles.bubbleDot} /><View style={styles.bubbleDot} /><View style={styles.bubbleDot} /></View>
      </Animated.View>
      <Animated.View style={[styles.bubble, styles.bubbleRight, { transform: [{ translateY: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [-4, 2] }) }] }]}>
        <View style={styles.bubbleDots}><View style={[styles.bubbleDot, styles.bubbleDotViolet]} /><View style={[styles.bubbleDot, styles.bubbleDotViolet]} /><View style={[styles.bubbleDot, styles.bubbleDotViolet]} /></View>
      </Animated.View>
    </View>
  );
}

function IdeaTrails({ motion }: { motion: Motion }) {
  return (
    <View style={styles.scene}>
      <Animated.View
        style={[
          styles.trailLayer,
          {
            opacity: motion.pulse.interpolate({ inputRange: [0, 1], outputRange: [0.58, 1] }),
            transform: [
              { translateX: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [-5, 3] }) },
              { translateY: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [3, -4] }) }
            ]
          }
        ]}
      >
        <Svg height="170" viewBox="0 0 200 170" width="200">
          <Defs>
            <SvgLinearGradient id="ideaTrail" x1="0" x2="1" y1="1" y2="0">
              <Stop offset="0" stopColor={palette.electric} stopOpacity="0" />
              <Stop offset="0.45" stopColor={palette.electric} stopOpacity="0.82" />
              <Stop offset="1" stopColor={palette.cyan} />
            </SvgLinearGradient>
          </Defs>
          <Path d="M5 158 C42 112 85 145 118 91 C141 53 167 44 199 18" fill="none" stroke="url(#ideaTrail)" strokeWidth="2.2" />
          <Path d="M3 166 C44 132 87 158 128 101 C156 62 175 56 200 34" fill="none" opacity="0.58" stroke={palette.electric} strokeWidth="1.2" />
          <Path d="M22 168 C67 142 93 165 140 114 C164 88 183 82 201 64" fill="none" opacity="0.34" stroke={palette.violet} strokeWidth="1" />
          {[ [112,96], [132,73], [152,57], [173,44], [188,29] ].map(([cx, cy], index) => <Circle cx={cx} cy={cy} fill={index % 2 ? palette.cyan : palette.electric} key={index} opacity={0.9 - index * 0.08} r={index % 2 ? 1.8 : 1.2} />)}
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          styles.sparkTile,
          {
            transform: [
              { translateY: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [4, -4] }) },
              { rotate: motion.pulse.interpolate({ inputRange: [0, 1], outputRange: ["-2deg", "3deg"] }) }
            ]
          }
        ]}
      >
        <LinearGradient colors={["rgba(23,67,143,0.86)", "rgba(3,11,30,0.94)"]} style={StyleSheet.absoluteFill} />
        <Ionicons color={palette.cyan} name="sparkles" size={27} />
      </Animated.View>
      <View style={[styles.ideaParticle, { right: 39, top: 78 }]} />
      <View style={[styles.ideaParticle, styles.ideaParticleSmall, { right: 76, top: 55 }]} />
      <View style={[styles.ideaParticle, styles.ideaParticleViolet, { right: 13, top: 101 }]} />
    </View>
  );
}

function AuditLens({ motion }: { motion: Motion }) {
  return (
    <View style={styles.scene}>
      <Animated.View
        style={[
          styles.auditDeck,
          {
            transform: [
              { perspective: 700 },
              { translateY: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [3, -4] }) },
              { rotateY: "-12deg" }
            ]
          }
        ]}
      >
        {[0, 1, 2].map((item) => (
          <View key={item} style={[styles.auditCard, { left: item * 31, top: item * 7, zIndex: 3 - item }]}>
            <LinearGradient colors={["rgba(18,59,130,0.94)", "rgba(4,13,32,0.98)"]} style={StyleSheet.absoluteFill} />
            <Text style={styles.auditIndex}>0{item + 1}</Text>
            <View style={[styles.auditLine, { width: 48 - item * 4 }]} />
            <View style={[styles.auditLine, styles.auditLineShort]} />
          </View>
        ))}
      </Animated.View>
      <Animated.View
        style={[
          styles.lensOrbit,
          { transform: [{ rotate: motion.orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }
        ]}
      >
        <View style={styles.lensNode} />
      </Animated.View>
      <Animated.View
        style={[
          styles.lens,
          {
            transform: [
              { translateX: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [-2, 4] }) },
              { translateY: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [4, -2] }) },
              { rotate: "-38deg" },
              { scale: motion.pulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.035] }) }
            ]
          }
        ]}
      >
        <LinearGradient colors={[palette.cyan, palette.electric, palette.violet]} style={styles.lensRing}>
          <View style={styles.lensGlass}><Ionicons color={palette.white} name="sparkles" size={18} /></View>
        </LinearGradient>
        <LinearGradient colors={[palette.electric, "#123875"]} style={styles.lensHandle} />
      </Animated.View>
    </View>
  );
}

function PlanSignal({ motion }: { motion: Motion }) {
  return (
    <View style={styles.scene}>
      <Animated.View
        style={[
          styles.planGrid,
          {
            opacity: motion.pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.48] }),
            transform: [{ translateY: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [3, -3] }) }]
          }
        ]}
      >
        <Svg height="120" viewBox="0 0 190 120" width="190">
          <Defs>
            <SvgLinearGradient id="planWave" x1="0" x2="1" y1="0" y2="0">
              <Stop offset="0" stopColor={palette.electric} stopOpacity="0" />
              <Stop offset="0.52" stopColor={palette.cyan} />
              <Stop offset="1" stopColor={palette.violet} stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          {[28, 48, 68, 88].map((y) => <Line key={y} opacity="0.22" stroke={palette.electric} x1="15" x2="185" y1={y} y2={y} />)}
          <Path d="M8 92 C37 82 50 45 78 55 C106 67 119 29 144 38 C163 45 178 25 190 16" fill="none" stroke="url(#planWave)" strokeWidth="2.4" />
          {[ [35,78], [78,55], [116,49], [146,38], [180,24] ].map(([cx, cy], index) => <Circle cx={cx} cy={cy} fill={index === 4 ? palette.white : palette.electric} key={index} r={index === 4 ? 3 : 2} />)}
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          styles.planCore,
          {
            transform: [
              { translateY: motion.drift.interpolate({ inputRange: [0, 1], outputRange: [3, -5] }) },
              { scale: motion.pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) }
            ]
          }
        ]}
      >
        <LinearGradient colors={["#0F66F4", "#5A4FFF"]} style={StyleSheet.absoluteFill} />
        <Ionicons color={palette.white} name="calendar-clear" size={27} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { height: 174, position: "relative", width: 200 },
  deckGlow: { backgroundColor: "rgba(14,104,255,0.48)", borderRadius: radius.pill, height: 92, left: 39, position: "absolute", shadowColor: palette.cyan, shadowOpacity: 0.9, shadowRadius: 28, top: 38, width: 92 },
  depthCard: { borderColor: "rgba(105,165,255,0.34)", borderRadius: radius.sm, borderWidth: 1, overflow: "hidden", padding: 9, position: "absolute", shadowColor: palette.electric, shadowOpacity: 0.46, shadowRadius: 14 },
  depthCardBack: { height: 104, right: 0, top: 27, width: 63, zIndex: 1 },
  depthCardMiddle: { height: 121, right: 32, top: 19, width: 74, zIndex: 2 },
  depthCardFront: { height: 144, left: 15, padding: 8, top: 7, width: 96, zIndex: 3 },
  cardTexture: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  cardValue: { color: palette.white, fontSize: 14, fontWeight: "900", marginTop: 6 },
  cardLabel: { color: palette.muted, fontSize: 7, fontWeight: "700", lineHeight: 10 },
  bars: { alignItems: "flex-end", flexDirection: "row", gap: 4, height: 52, marginTop: 8 },
  bar: { backgroundColor: palette.electric, borderRadius: 2, flex: 1, shadowColor: palette.cyan, shadowOpacity: 0.7, shadowRadius: 5 },
  scoreRing: { alignItems: "center", alignSelf: "center", height: 78, justifyContent: "center", marginTop: 3, position: "relative", width: 78 },
  scoreCopy: { alignItems: "center", position: "absolute" },
  scoreNumber: { color: palette.white, fontSize: 17, fontWeight: "900" },
  scoreLabel: { color: palette.paperMuted, fontSize: 6, fontWeight: "700" },
  progressPill: { alignItems: "center", alignSelf: "center", backgroundColor: "rgba(17,92,219,0.18)", borderColor: "rgba(64,157,255,0.35)", borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: 4, marginTop: 7, paddingHorizontal: 6, paddingVertical: 4 },
  progressDot: { backgroundColor: palette.electric, borderRadius: radius.pill, height: 4, width: 4 },
  progressText: { color: palette.sky, fontSize: 6, fontWeight: "800" },
  cardScan: { backgroundColor: "rgba(255,255,255,0.16)", bottom: -25, position: "absolute", top: -25, width: 17 },
  particleOrbit: { height: 164, left: 10, position: "absolute", top: 0, width: 178, zIndex: 8 },
  particleOne: { backgroundColor: palette.cyan, borderRadius: radius.pill, height: 4, left: 4, position: "absolute", shadowColor: palette.cyan, shadowOpacity: 1, shadowRadius: 6, top: 58, width: 4 },
  particleTwo: { backgroundColor: palette.electric, borderRadius: radius.pill, bottom: 8, height: 3, position: "absolute", right: 47, shadowColor: palette.electric, shadowOpacity: 1, shadowRadius: 6, width: 3 },
  particleThree: { backgroundColor: palette.violet, borderRadius: radius.pill, height: 3, position: "absolute", right: 2, top: 72, width: 3 },
  coachSvg: { left: 5, position: "absolute", top: 7 },
  coachOrbit: { borderColor: "rgba(39,112,255,0.18)", borderRadius: radius.pill, borderWidth: 1, height: 134, left: 26, position: "absolute", top: 12, width: 148 },
  coachNodeA: { backgroundColor: palette.electric, borderRadius: radius.pill, height: 5, left: 6, position: "absolute", top: 36, width: 5 },
  coachNodeB: { backgroundColor: palette.violet, borderRadius: radius.pill, bottom: 17, height: 4, position: "absolute", right: 8, width: 4 },
  orbHalo: { backgroundColor: "rgba(19,103,255,0.26)", borderRadius: radius.pill, height: 79, left: 59, position: "absolute", shadowColor: palette.electric, shadowOpacity: 1, shadowRadius: 23, top: 37, width: 79 },
  orbFace: { alignItems: "center", flexDirection: "row", gap: 11, height: 24, justifyContent: "center", left: 72, position: "absolute", top: 68, width: 52 },
  eye: { backgroundColor: palette.electric, borderRadius: radius.pill, height: 20, shadowColor: palette.cyan, shadowOpacity: 0.8, shadowRadius: 7, width: 9 },
  bubble: { alignItems: "center", backgroundColor: "rgba(10,25,59,0.94)", borderColor: "rgba(81,143,255,0.35)", borderRadius: radius.sm, borderWidth: 1, height: 34, justifyContent: "center", position: "absolute", width: 64 },
  bubbleLeft: { left: 4, top: 5 },
  bubbleRight: { right: 0, top: 66 },
  bubbleDots: { flexDirection: "row", gap: 6 },
  bubbleDot: { backgroundColor: palette.electric, borderRadius: radius.pill, height: 6, width: 6 },
  bubbleDotViolet: { backgroundColor: palette.violet },
  trailLayer: { bottom: 0, position: "absolute", right: 0 },
  sparkTile: { alignItems: "center", borderColor: "rgba(100,169,255,0.38)", borderRadius: radius.sm, borderWidth: 1, height: 54, justifyContent: "center", overflow: "hidden", position: "absolute", right: 6, shadowColor: palette.electric, shadowOpacity: 0.54, shadowRadius: 14, top: 8, width: 54 },
  ideaParticle: { backgroundColor: palette.cyan, borderRadius: radius.pill, height: 4, position: "absolute", shadowColor: palette.cyan, shadowOpacity: 1, shadowRadius: 7, width: 4 },
  ideaParticleSmall: { height: 2, width: 2 },
  ideaParticleViolet: { backgroundColor: palette.violet },
  auditDeck: { height: 98, left: 21, position: "absolute", top: 12, width: 150 },
  auditCard: { borderColor: "rgba(81,151,255,0.42)", borderRadius: radius.sm, borderWidth: 1, height: 82, overflow: "hidden", padding: 9, position: "absolute", width: 68 },
  auditIndex: { color: palette.sky, fontSize: 10, fontWeight: "900", marginBottom: 11 },
  auditLine: { backgroundColor: palette.electric, borderRadius: radius.pill, height: 2, marginBottom: 7 },
  auditLineShort: { opacity: 0.5, width: 35 },
  lensOrbit: { borderColor: "rgba(44,132,255,0.35)", borderRadius: radius.pill, borderWidth: 1, height: 130, left: 34, position: "absolute", top: 27, width: 150 },
  lensNode: { backgroundColor: palette.cyan, borderRadius: radius.pill, height: 5, position: "absolute", right: 9, shadowColor: palette.cyan, shadowOpacity: 1, shadowRadius: 8, top: 22, width: 5 },
  lens: { height: 108, left: 81, position: "absolute", top: 57, width: 56, zIndex: 5 },
  lensRing: { alignItems: "center", borderRadius: radius.pill, height: 55, justifyContent: "center", shadowColor: palette.electric, shadowOpacity: 0.94, shadowRadius: 15, width: 55 },
  lensGlass: { alignItems: "center", backgroundColor: "rgba(4,16,43,0.92)", borderRadius: radius.pill, height: 45, justifyContent: "center", width: 45 },
  lensHandle: { borderRadius: radius.pill, height: 53, left: 22, position: "absolute", top: 49, width: 12 },
  planGrid: { bottom: 0, position: "absolute", right: 0 },
  planCore: { alignItems: "center", borderColor: "rgba(126,199,255,0.54)", borderRadius: radius.sm, borderWidth: 1, height: 56, justifyContent: "center", overflow: "hidden", position: "absolute", right: 10, shadowColor: palette.electric, shadowOpacity: 0.82, shadowRadius: 17, top: 13, width: 56 }
});
