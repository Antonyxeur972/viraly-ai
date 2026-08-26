import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { palette, radius, spacing, typography } from "../theme";
import { IconName } from "../types";

type Props = {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  icon: IconName;
};

export function ScreenHero({ eyebrow, title, subtitle, icon }: Props) {
  const entrance = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, {
      damping: 19,
      mass: 0.82,
      stiffness: 120,
      toValue: 1,
      useNativeDriver: true
    }).start();

    const orbitLoop = Animated.loop(
      Animated.timing(orbit, {
        duration: 12000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true
      })
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { duration: 1800, toValue: 1, useNativeDriver: true }),
        Animated.timing(pulse, { duration: 1800, toValue: 0, useNativeDriver: true })
      ])
    );
    orbitLoop.start();
    pulseLoop.start();
    return () => {
      orbitLoop.stop();
      pulseLoop.stop();
    };
  }, [entrance, orbit, pulse]);

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
      <View style={styles.copy}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View pointerEvents="none" style={styles.signal}>
        <Animated.View
          style={[
            styles.orbitWide,
            { transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }
          ]}
        >
          <View style={styles.orbitNode} />
        </Animated.View>
        <Animated.View
          style={[
            styles.orbitTight,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.85] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] }) }]
            }
          ]}
        />
        <LinearGradient colors={["rgba(33,139,255,0.94)", "rgba(91,76,255,0.82)"]} style={styles.signalCore}>
          <Ionicons color={palette.white} name={icon} size={25} />
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 178,
    position: "relative"
  },
  copy: {
    gap: spacing.sm,
    maxWidth: "88%",
    paddingRight: 42,
    zIndex: 2
  },
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
    maxWidth: 365
  },
  signal: {
    height: 94,
    position: "absolute",
    right: -4,
    top: 0,
    width: 94
  },
  orbitWide: {
    borderColor: "rgba(56,145,255,0.30)",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 92,
    left: 1,
    position: "absolute",
    top: 1,
    width: 92
  },
  orbitTight: {
    borderColor: "rgba(72,205,255,0.44)",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 68,
    left: 13,
    position: "absolute",
    top: 13,
    width: 68
  },
  orbitNode: {
    backgroundColor: palette.cyan,
    borderRadius: radius.pill,
    height: 7,
    left: 12,
    position: "absolute",
    top: 0,
    width: 7
  },
  signalCore: {
    alignItems: "center",
    borderColor: "rgba(185,221,255,0.38)",
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    left: 21,
    position: "absolute",
    top: 21,
    width: 52
  }
});
