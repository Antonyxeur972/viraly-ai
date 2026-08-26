import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { PropsWithChildren } from "react";
import {
  Image,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle
} from "react-native";

import { palette, radius, shadow } from "../theme";

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  textureOpacity?: number;
  glow?: boolean;
}>;

export function GlassPanel({ children, style, textureOpacity = 0.13, glow = false }: Props) {
  return (
    <BlurView intensity={38} tint="dark" style={[styles.panel, glow && styles.glow, style]}>
      <LinearGradient
        colors={["rgba(20,49,100,0.36)", "rgba(4,13,33,0.12)", "rgba(3,8,21,0.46)"]}
        locations={[0, 0.46, 1]}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          resizeMode="cover"
          source={require("../../assets/viraly-mineral-texture.png")}
          style={[styles.texture, { opacity: textureOpacity }]}
        />
      </View>
      <LinearGradient
        colors={["rgba(117,198,255,0.48)", "rgba(71,116,255,0.08)", "transparent"]}
        end={{ x: 1, y: 0 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={styles.topLight}
      />
      <View pointerEvents="none" style={styles.innerLine} />
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    ...shadow.md
  },
  glow: {
    borderColor: palette.lineStrong,
    shadowColor: palette.electric,
    shadowOpacity: 0.30,
    shadowRadius: 22
  },
  texture: {
    ...StyleSheet.absoluteFillObject
  },
  topLight: {
    height: 1,
    left: 10,
    position: "absolute",
    right: 10,
    top: 0
  },
  innerLine: {
    borderColor: "rgba(255,255,255,0.025)",
    borderRadius: radius.lg,
    borderWidth: 1,
    bottom: 2,
    left: 2,
    position: "absolute",
    right: 2,
    top: 2
  }
});
