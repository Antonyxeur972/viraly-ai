import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { palette, spacing, typography } from "../theme";

type Props = {
  eyebrow?: string;
  title: string;
  action?: string;
};

export function SectionHeader({ eyebrow, title, action }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {action ? <Text style={styles.action}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  copy: {
    flex: 1,
    gap: 2
  },
  eyebrow: {
    ...typography.caption,
    color: palette.mint
  },
  title: {
    ...typography.h2,
    color: palette.white
  },
  action: {
    ...typography.caption,
    color: palette.lemon
  }
});
