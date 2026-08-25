import React from "react";
import { StyleSheet, Text } from "react-native";

import { palette, radius, spacing, typography } from "../theme";

type Props = {
  label: string;
  color?: string;
};

export function Tag({ label, color = palette.paper }: Props) {
  return (
    <Text style={[styles.tag, { borderColor: color, color }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  tag: {
    ...typography.caption,
    backgroundColor: "rgba(4,9,22,0.68)",
    borderWidth: 1,
    borderRadius: radius.pill,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4
  }
});
