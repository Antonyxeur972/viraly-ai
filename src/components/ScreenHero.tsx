import React, { ReactNode, useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { palette, radius, spacing, typography } from "../theme";
import { IconName } from "../types";
import { CinematicVariant, CinematicVisual } from "./CinematicVisuals";

type Props = {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  icon: IconName;
  variant?: CinematicVariant;
  score?: number;
  metric?: string;
  audienceMetric?: string;
  wide?: boolean;
};

export function ScreenHero({ eyebrow, title, subtitle, variant = "plan", score, metric, audienceMetric, wide = false }: Props) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, {
      damping: 19,
      mass: 0.82,
      stiffness: 120,
      toValue: 1,
      useNativeDriver: true
    }).start();

  }, [entrance]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: entrance,
          transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }]
        }
      ]}
    >
      <View style={[styles.copy, wide && styles.copyWide]}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View pointerEvents={variant === "growth" ? "box-none" : "none"} style={[styles.visual, wide && styles.visualWide]}>
        <CinematicVisual audienceMetric={audienceMetric} metric={metric} score={score} variant={variant} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 245,
    position: "relative"
  },
  copy: {
    gap: spacing.sm,
    maxWidth: "68%",
    paddingRight: 0,
    zIndex: 2
  },
  copyWide: { maxWidth: "84%" },
  eyebrowRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  eyebrowLine: {
    backgroundColor: palette.electric,
    borderRadius: radius.pill,
    height: 2,
    width: 24
  },
  eyebrow: {
    ...typography.caption,
    color: palette.electric,
    textTransform: "uppercase"
  },
  title: {
    ...typography.title,
    color: palette.white
  },
  subtitle: {
    ...typography.body,
    color: palette.paperMuted,
    maxWidth: 310
  },
  visual: {
    height: 174,
    position: "absolute",
    right: -20,
    top: 0,
    width: 200
  },
  visualWide: { opacity: 0.76, right: -34, top: -3 }
});
