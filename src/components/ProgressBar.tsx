import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { palette, radius } from "../theme";

type Props = {
  value: number;
  color: string;
};

export function ProgressBar({ value, color }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      duration: 720,
      toValue: Math.max(0, Math.min(100, value)),
      useNativeDriver: false
    }).start();
  }, [progress, value]);

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: progress.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] })
          }
        ]}
      >
        <LinearGradient colors={["transparent", "rgba(255,255,255,0.68)", "transparent"]} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: palette.line,
    borderRadius: radius.pill,
    borderColor: "rgba(112,165,255,0.08)",
    borderWidth: 1,
    height: 7,
    overflow: "hidden",
    width: "100%"
  },
  fill: {
    borderRadius: radius.pill,
    height: "100%",
    overflow: "hidden",
    shadowColor: palette.electric,
    shadowOpacity: 0.8,
    shadowRadius: 8
  }
});
