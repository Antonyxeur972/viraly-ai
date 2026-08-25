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
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: palette.panel,
    borderRadius: radius.lg,
    overflow: "hidden",
    position: "relative",
    ...shadow.md
  },
  texture: {
    ...StyleSheet.absoluteFillObject
  }
});
