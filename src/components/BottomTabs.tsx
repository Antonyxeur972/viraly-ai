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
          colors={["rgba(19,95,224,0.78)", "rgba(21,137,255,0.28)", "rgba(14,33,76,0.16)"]}
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
        {renderIcon(item, focused)}
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
    minHeight: 72,
    paddingBottom: 5,
    paddingHorizontal: 5,
    paddingTop: 5
  },
  tab: {
    alignItems: "center",
    borderRadius: radius.sm,
    gap: 1,
    minHeight: 60,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 4,
    position: "relative",
    flex: 1,
    maxWidth: 78
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 36,
    justifyContent: "center",
    width: 44
  },
  iconWrapActive: {
    elevation: 10,
    shadowColor: palette.electric,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.84,
    shadowRadius: 12
  },
  label: {
    ...typography.caption,
    color: palette.muted,
    fontSize: 11
  },
  labelActive: {
    color: palette.white
  },
  activeSurface: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "rgba(84,169,255,0.26)",
    borderRadius: radius.sm,
    borderWidth: 1
  },
  activeIndicator: {
    backgroundColor: palette.cyan,
    borderRadius: radius.pill,
    bottom: 2,
    height: 2,
    position: "absolute",
    shadowColor: palette.cyan,
    shadowOpacity: 0.9,
    shadowRadius: 7,
    width: 18
  }
});
