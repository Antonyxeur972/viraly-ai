import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";

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
          styles.mesh,
          {
            opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.34] }),
            transform: [
              { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [18, -6] }) },
              { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }
            ]
          }
        ]}
      >
        <Svg height="100%" viewBox="0 0 390 844" width="100%">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <Path
              d={`M${-90 + index * 72} 844 L${150 + index * 45} 585`}
              key={`v-${index}`}
              opacity="0.16"
              stroke="#2887FF"
              strokeWidth="0.6"
            />
          ))}
          {[620, 662, 705, 750, 798, 842].map((y, index) => (
            <Line key={`h-${y}`} opacity={0.13 + index * 0.025} stroke="#2887FF" strokeWidth="0.6" x1="0" x2="390" y1={y} y2={y} />
          ))}
          <Path d="M-10 590 C82 545 115 621 200 568 C279 519 333 553 410 488" fill="none" opacity="0.18" stroke="#3BC8FF" strokeWidth="1" />
          <Path d="M-20 475 C88 403 181 463 267 386 C318 340 364 354 416 308" fill="none" opacity="0.10" stroke="#7458FF" strokeWidth="0.8" />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          styles.edgeRay,
          {
            opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.38] }),
            transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-22, 20] }) }, { rotate: "-18deg" }]
          }
        ]}
      >
        <LinearGradient colors={["transparent", "rgba(20,118,255,0.18)", "rgba(74,222,255,0.04)", "transparent"]} style={StyleSheet.absoluteFill} />
      </Animated.View>
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
  },
  mesh: {
    ...StyleSheet.absoluteFillObject
  },
  edgeRay: {
    height: "125%",
    position: "absolute",
    right: -80,
    top: -80,
    width: 90
  }
});
