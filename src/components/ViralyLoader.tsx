import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { palette } from "../theme";

type Props = {
  compact?: boolean;
};

export function ViralyLoader({ compact = false }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotation, {
        duration: 2200,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true
      })
    );
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { duration: 850, toValue: 1, useNativeDriver: true }),
        Animated.timing(pulse, { duration: 850, toValue: 0, useNativeDriver: true })
      ])
    );
    spin.start();
    breathe.start();
    return () => {
      spin.stop();
      breathe.stop();
    };
  }, [pulse, rotation]);

  const size = compact ? 62 : 104;
  return (
    <View style={[styles.wrap, { height: size, width: size }]}>
      <Animated.View
        style={[
          styles.orbit,
          {
            borderRadius: size / 2,
            transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }]
          }
        ]}
      >
        <View style={styles.orbitLight} />
      </Animated.View>
      <Animated.View
        style={[
          styles.core,
          {
            borderRadius: size / 2,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.04] }) }]
          }
        ]}
      >
        <Text style={[styles.v, compact && styles.vCompact]}>V</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  orbit: { ...StyleSheet.absoluteFillObject, borderColor: "rgba(77,179,255,0.22)", borderWidth: 1.5 },
  orbitLight: { backgroundColor: palette.cyan, borderRadius: 5, height: 9, position: "absolute", right: -4, top: "47%", width: 9 },
  core: { alignItems: "center", backgroundColor: "rgba(14,80,208,0.24)", borderColor: "rgba(74,183,255,0.74)", borderWidth: 1, height: "72%", justifyContent: "center", shadowColor: palette.electric, shadowOpacity: 0.8, shadowRadius: 24, width: "72%" },
  v: { color: palette.white, fontSize: 40, fontWeight: "900" },
  vCompact: { fontSize: 25 }
});
