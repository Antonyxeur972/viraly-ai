import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";

export function AmbientMotion() {
  const drift = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();

  useEffect(() => {
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { duration: 9000, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(drift, { duration: 9000, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true })
      ])
    );
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(2200),
        Animated.timing(scan, { duration: 7600, easing: Easing.linear, toValue: 1, useNativeDriver: true }),
        Animated.timing(scan, { duration: 0, toValue: 0, useNativeDriver: true })
      ])
    );
    driftLoop.start();
    scanLoop.start();
    return () => {
      driftLoop.stop();
      scanLoop.stop();
    };
  }, [drift, scan]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.Image
        resizeMode="cover"
        source={require("../../assets/viraly-neural-field.png")}
        style={[
          styles.field,
          {
            opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.22] }),
            transform: [
              { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-4, 5] }) },
              { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [5, -5] }) },
              { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.055] }) }
            ]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.scan,
          { transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [-160, height + 160] }) }] }
        ]}
      >
        <LinearGradient colors={["transparent", "rgba(53,142,255,0.055)", "transparent"]} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    ...StyleSheet.absoluteFillObject
  },
  scan: {
    height: 140,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  }
});
