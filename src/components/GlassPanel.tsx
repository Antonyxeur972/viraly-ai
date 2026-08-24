import { BlurView } from "expo-blur";
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
}>;

export function GlassPanel({ children, style, textureOpacity = 0.13 }: Props) {
  return (
    <BlurView intensity={28} tint="dark" style={[styles.panel, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          resizeMode="cover"
          source={require("../../assets/viraly-mineral-texture.png")}
          style={[styles.texture, { opacity: textureOpacity }]}
        />
      </View>
      <View pointerEvents="none" style={styles.highlight} />
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
  texture: {
    ...StyleSheet.absoluteFillObject
  },
  highlight: {
    backgroundColor: "rgba(215,255,180,0.13)",
    height: 1,
    left: 1,
    position: "absolute",
    right: 1,
    top: 0
  }
});
