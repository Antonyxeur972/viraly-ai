import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { palette, radius, spacing, typography } from "../theme";
import { GlassPanel } from "./GlassPanel";

type Props = {
  label: string;
  value: string;
  delta: string;
  accent: string;
};

export function MetricCard({ label, value, delta, accent }: Props) {
  return (
    <GlassPanel style={styles.card} textureOpacity={0.1}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.delta}>{delta}</Text>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 118,
    padding: spacing.md,
    minWidth: 140
  },
  accent: {
    borderRadius: radius.pill,
    height: 3,
    marginBottom: spacing.md,
    width: 30
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
