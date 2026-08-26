import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View } from "react-native";

import { palette, spacing, typography } from "../theme";

type Props = {
  text: string;
  textStyle?: StyleProp<TextStyle>;
};

function readableParts(text: string) {
  return text
    .replace(/([.!?])\s+(?=[A-ZÀ-ÖØ-Ý0-9])/g, "$1\n")
    .split(/\n+/)
    .map((part) => part.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}

export function ReadableText({ text, textStyle }: Props) {
  const parts = readableParts(text);

  return (
    <View style={styles.list}>
      {parts.map((part, index) => (
        <View key={`${part}-${index}`} style={styles.row}>
          <View style={styles.dot} />
          <Text style={[styles.text, textStyle]}>{part}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  dot: { backgroundColor: palette.mint, borderRadius: 3, height: 5, marginTop: 8, width: 5 },
  text: { ...typography.body, color: palette.paperMuted, flex: 1 }
});
