import React from "react";
import { StyleSheet, Text } from "react-native";

import { palette, radius, spacing, typography } from "../theme";

type Props = {
  label: string;
  color?: string;
};

export function Tag({ label, color = palette.paper }: Props) {
  return (
    <Text style={[styles.tag, { backgroundColor: color }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  tag: {
    ...typography.caption,
    borderRadius: radius.pill,
    color: palette.ink,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4
  }
});
