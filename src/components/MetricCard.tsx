import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { palette, radius, spacing, typography } from "../theme";

type Props = {
  label: string;
  value: string;
  delta: string;
  accent: string;
};

export function MetricCard({ label, value, delta, accent }: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.delta}>{delta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 142,
    padding: spacing.md,
    width: 158
  },
  accent: {
    borderRadius: radius.pill,
    height: 6,
    marginBottom: spacing.md,
    width: 42
  },
  label: {
    ...typography.caption,
    color: palette.muted
  },
  value: {
    ...typography.h2,
    color: palette.white,
    marginTop: spacing.xs
  },
  delta: {
    ...typography.caption,
    color: palette.paperMuted,
    marginTop: spacing.sm
  }
});
