import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { palette, radius, spacing, typography } from "../theme";

type Props = {
  score: number;
  label: string;
  caption: string;
  color?: string;
};

export function ScoreDial({ score, label, caption, color = palette.mint }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, { borderColor: color }]}>
        <Text style={styles.score}>{score}</Text>
        <Text style={styles.max}>/100</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: palette.paper,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.lg,
    padding: spacing.lg
  },
  ring: {
    alignItems: "center",
    borderRadius: 58,
    borderWidth: 8,
    height: 116,
    justifyContent: "center",
    width: 116
  },
  score: {
    color: palette.ink,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 42
  },
  max: {
    ...typography.caption,
    color: palette.graphite
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  label: {
    ...typography.h2,
    color: palette.ink
  },
  caption: {
    ...typography.body,
    color: palette.graphite
  }
});
