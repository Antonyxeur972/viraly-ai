import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { palette, radius, spacing, typography } from "../theme";
import { IconName } from "../types";
import { GlassPanel } from "./GlassPanel";

export type TabItem<T extends string> = {
  key: T;
  label: string;
  icon: IconName;
};

type Props<T extends string> = {
  activeTab: T;
  items: TabItem<T>[];
  onChange: (tab: T) => void;
  renderIcon: (item: TabItem<T>, focused: boolean) => React.ReactNode;
};

export function BottomTabs<T extends string>({
  activeTab,
  items,
  onChange,
  renderIcon
}: Props<T>) {
  return (
    <GlassPanel glow style={styles.wrap} textureOpacity={0.08}>
      {items.map((item) => (
        <TabButton
          focused={item.key === activeTab}
          item={item}
          key={item.key}
          onPress={() => onChange(item.key)}
          renderIcon={renderIcon}
        />
      ))}
    </GlassPanel>
  );
}

function TabButton<T extends string>({
  focused,
  item,
  onPress,
  renderIcon
}: {
  focused: boolean;
  item: TabItem<T>;
  onPress: () => void;
  renderIcon: Props<T>["renderIcon"];
}) {
  const focus = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(focus, {
      damping: 18,
      stiffness: 220,
      toValue: focused ? 1 : 0,
      useNativeDriver: true
    }).start();
  }, [focus, focused]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      activeOpacity={0.86}
      onPress={onPress}
      style={styles.tab}
    >
      {focused ? (
        <LinearGradient
          colors={["rgba(23,111,255,0.96)", "rgba(18,83,215,0.72)", "rgba(6,28,74,0.56)"]}
          style={styles.activeSurface}
        />
      ) : null}
      <Animated.View
        style={[
          styles.iconWrap,
          focused && styles.iconWrapActive,
          { transform: [{ scale: focus.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] }) }] }
        ]}
      >
        <LinearGradient
          colors={focused ? ["rgba(55,153,255,0.98)", "rgba(17,81,218,0.86)", "rgba(5,25,70,0.94)"] : ["rgba(15,30,59,0.72)", "rgba(5,13,31,0.58)"]}
          style={[styles.symbolFrame, focused && styles.symbolFrameActive]}
        >
          <View style={styles.symbolCore}>{renderIcon(item, focused)}</View>
          {focused ? <><View style={styles.symbolOrbit} /><View style={styles.symbolDot} /></> : null}
        </LinearGradient>
      </Animated.View>
      <Text style={[styles.label, focused && styles.labelActive]}>{item.label}</Text>
      {focused ? <View style={styles.activeIndicator} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
    backgroundColor: "rgba(2,7,20,0.92)",
    marginBottom: spacing.xs,
    marginHorizontal: spacing.sm,
    minHeight: 78,
    paddingBottom: 6,
    paddingHorizontal: 6,
    paddingTop: 6
  },
  tab: {
    alignItems: "center",
    borderRadius: radius.sm,
    gap: 1,
    minHeight: 64,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 4,
    position: "relative",
    flex: 1,
    maxWidth: 78
  },
  iconWrap: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 50
  },
  iconWrapActive: {
    elevation: 10,
    shadowColor: palette.electric,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.84,
    shadowRadius: 12
  },
  symbolFrame: {
    alignItems: "center",
    borderColor: "rgba(91,132,198,0.22)",
    borderRadius: 13,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
    transform: [{ rotate: "-3deg" }],
    width: 42
  },
  symbolFrameActive: {
    borderColor: "rgba(118,216,255,0.86)",
    shadowColor: palette.cyan,
    shadowOpacity: 0.95,
    shadowRadius: 10
  },
  symbolCore: { alignItems: "center", justifyContent: "center", transform: [{ rotate: "3deg" }] },
  symbolOrbit: { borderColor: "rgba(145,222,255,0.44)", borderRadius: radius.pill, borderWidth: 1, height: 48, position: "absolute", transform: [{ rotate: "18deg" }], width: 31 },
  symbolDot: { backgroundColor: palette.cyan, borderRadius: radius.pill, height: 4, position: "absolute", right: -3, shadowColor: palette.cyan, shadowOpacity: 1, shadowRadius: 6, top: 5, width: 4 },
  label: {
    ...typography.caption,
    color: palette.muted,
    fontSize: 11
  },
  labelActive: {
    color: palette.white,
    textShadowColor: palette.cyan,
    textShadowRadius: 7
  },
  activeSurface: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "rgba(96,188,255,0.58)",
    borderRadius: radius.sm,
    borderWidth: 1
  },
  activeIndicator: {
    backgroundColor: palette.cyan,
    borderRadius: radius.pill,
    bottom: 1,
    height: 2,
    position: "absolute",
    shadowColor: palette.cyan,
    shadowOpacity: 0.9,
    shadowRadius: 7,
    width: 18
  }
});
