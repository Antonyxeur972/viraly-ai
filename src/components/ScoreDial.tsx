import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { palette, spacing, typography } from "../theme";
import { GlassPanel } from "./GlassPanel";

type Props = {
  score: number;
  label: string;
  caption: string;
  color?: string;
};

export function ScoreDial({ score, label, caption, color = palette.mint }: Props) {
  const circumference = 2 * Math.PI * 47;
  const dash = (circumference * Math.min(100, Math.max(0, score))) / 100;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { duration: 1600, toValue: 1, useNativeDriver: true }),
        Animated.timing(pulse, { duration: 1600, toValue: 0, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <GlassPanel glow style={styles.wrap}>
      <View style={styles.ring}>
        <Animated.View
          style={[
            styles.pulseRing,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.54] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.08] }) }]
            }
          ]}
        />
        <Svg height={116} style={StyleSheet.absoluteFill} viewBox="0 0 116 116" width={116}>
          <G rotation="-90" origin="58, 58">
            <Circle cx="58" cy="58" fill="none" r="47" stroke="rgba(255,255,255,0.09)" strokeWidth="8" />
            <Circle
              cx="58"
              cy="58"
              fill="none"
              r="47"
              stroke={color}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeLinecap="round"
              strokeWidth="8"
            />
          </G>
        </Svg>
        <Text style={styles.score}>{score}</Text>
        <Text style={styles.max}>/100</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xl,
    padding: spacing.xl
  },
  ring: {
    alignItems: "center",
    height: 116,
    justifyContent: "center",
    position: "relative",
    width: 116
  },
  pulseRing: {
    borderColor: palette.electric,
    borderRadius: 58,
    borderWidth: 1,
    height: 112,
    position: "absolute",
    shadowColor: palette.electric,
    shadowOpacity: 0.8,
    shadowRadius: 16,
    width: 112
  },
  score: {
    color: palette.white,
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 45
  },
  max: {
    ...typography.caption,
    color: palette.muted
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  label: {
    ...typography.h2,
    color: palette.white
  },
  caption: {
    ...typography.body,
    color: palette.paperMuted
  }
});
