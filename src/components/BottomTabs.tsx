import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { palette, radius, spacing, typography } from "../theme";
import { IconName } from "../types";

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
    <View style={styles.wrap}>
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
            {renderIcon(item, focused)}
            <Text style={[styles.label, focused && styles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: "rgba(3, 17, 13, 0.96)",
    borderColor: palette.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm
  },
  tab: {
    alignItems: "center",
    borderRadius: radius.md,
    gap: 3,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    flex: 1,
    maxWidth: 76
  },
  tabActive: {
    backgroundColor: "rgba(53, 230, 154, 0.14)"
  },
  label: {
    ...typography.caption,
    color: palette.muted,
    fontSize: 11
  },
  labelActive: {
    color: palette.mint
  }
});
