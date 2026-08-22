import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { palette, radius, spacing, typography } from "../theme";
import { IconName } from "../types";

type Props = {
  title: string;
  body: string;
  accent: string;
  icon: IconName;
  meta?: string;
};

export function ActionCard({ title, body, accent, icon, meta }: Props) {
  return (
    <View style={styles.card}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "flex-start",
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
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
    color: palette.ink,
    backgroundColor: palette.paper,
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
