import React from "react";
import { StyleSheet, View } from "react-native";

import { palette, radius } from "../theme";

type Props = {
  value: number;
  color: string;
};

export function ProgressBar({ value, color }: Props) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { backgroundColor: color, width: `${value}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: palette.line,
    borderRadius: radius.pill,
    height: 5,
    overflow: "hidden",
    width: "100%"
  },
  fill: {
    borderRadius: radius.pill,
    height: "100%"
  }
});
