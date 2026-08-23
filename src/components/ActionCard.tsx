import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { palette, radius, spacing, typography } from "../theme";
import { IconName } from "../types";
import { GlassPanel } from "./GlassPanel";

type Props = {
  title: string;
  body: string;
  accent: string;
  icon: IconName;
  meta?: string;
};

export function ActionCard({ title, body, accent, icon, meta }: Props) {
  return (
    <GlassPanel style={styles.card} textureOpacity={0.09}>
      <View style={[styles.iconWrap, { backgroundColor: accent }]}>
        <Ionicons color={palette.ink} name={icon} size={20} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        <Text style={styles.body}>{body}</Text>
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  title: {
    ...typography.h3,
    color: palette.white,
    flex: 1
  },
  meta: {
    ...typography.caption,
    color: palette.paperMuted,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radius.pill,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3
  },
  body: {
    ...typography.body,
    color: palette.paperMuted
  }
});
