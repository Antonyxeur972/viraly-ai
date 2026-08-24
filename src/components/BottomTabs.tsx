import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
    <GlassPanel style={styles.wrap} textureOpacity={0.08}>
      {items.map((item) => {
        const focused = item.key === activeTab;
        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.tab, focused && styles.tabActive]}
          >
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              {renderIcon(item, focused)}
            </View>
            <Text style={[styles.label, focused && styles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
    borderColor: "rgba(181,255,63,0.20)",
    marginBottom: spacing.xs,
    marginHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs
  },
  tab: {
    alignItems: "center",
    borderRadius: radius.sm,
    gap: 2,
    minHeight: 58,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    flex: 1,
    maxWidth: 76
  },
  tabActive: {
    backgroundColor: "rgba(167,245,66,0.07)"
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 31,
    justifyContent: "center",
    width: 42
  },
  iconWrapActive: {
    backgroundColor: palette.mint
  },
  label: {
    ...typography.caption,
    color: palette.muted,
    fontSize: 11
  },
  labelActive: {
    color: palette.white
  }
});
