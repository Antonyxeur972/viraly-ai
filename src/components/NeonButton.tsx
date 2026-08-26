import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { palette, radius, shadow, spacing, typography } from "../theme";
import { IconName } from "../types";

type Props = {
  title: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  variant?: "primary" | "outline";
  compact?: boolean;
};

export function NeonButton({
  title,
  onPress,
  icon = "sparkles",
  disabled = false,
  variant = "primary",
  compact = false
}: Props) {
  const press = useRef(new Animated.Value(1)).current;
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (variant !== "primary" || disabled) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(1100),
        Animated.timing(shine, {
          duration: 1250,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(shine, { duration: 0, toValue: 0, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [disabled, shine, variant]);

  const animatePress = (toValue: number) => {
    Animated.spring(press, { damping: 18, stiffness: 260, toValue, useNativeDriver: true }).start();
  };

  const content = (
    <>
      <View style={styles.content}>
        <Ionicons color={variant === "primary" ? palette.white : palette.electric} name={icon} size={compact ? 17 : 20} />
        <Text style={[styles.text, variant === "outline" && styles.textOutline]}>{title}</Text>
        {variant === "primary" ? <Ionicons color={palette.white} name="arrow-forward" size={compact ? 17 : 20} /> : null}
      </View>
      {variant === "primary" ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shine,
            { transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-90, 520] }) }, { rotate: "18deg" }] }
          ]}
        />
      ) : null}
    </>
  );

  return (
    <Animated.View style={[styles.wrap, compact && styles.wrapCompact, disabled && styles.disabled, { transform: [{ scale: press }] }]}>
      <TouchableOpacity
        activeOpacity={0.92}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animatePress(0.975)}
        onPressOut={() => animatePress(1)}
        style={styles.touchable}
      >
        {variant === "primary" ? (
          <LinearGradient colors={["#0D5DEA", "#198EFF", "#4D58F4"]} locations={[0, 0.57, 1]} style={styles.gradient}>
            {content}
          </LinearGradient>
        ) : (
          <View style={styles.outline}>{content}</View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderColor: "rgba(94,187,255,0.72)",
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 56,
    overflow: "hidden",
    ...shadow.electric
  },
  wrapCompact: {
    minHeight: 48
  },
  disabled: {
    opacity: 0.34
  },
  touchable: {
    flex: 1
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    minHeight: 54,
    overflow: "hidden"
  },
  outline: {
    backgroundColor: "rgba(4,12,30,0.82)",
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
    overflow: "hidden"
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    zIndex: 2
  },
  text: {
    ...typography.body,
    color: palette.white,
    flexShrink: 1,
    fontWeight: "900",
    textAlign: "center"
  },
  textOutline: {
    color: palette.electric
  },
  shine: {
    backgroundColor: "rgba(255,255,255,0.26)",
    bottom: -24,
    position: "absolute",
    top: -24,
    width: 34
  }
});
