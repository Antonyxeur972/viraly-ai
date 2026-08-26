import React, { PropsWithChildren, useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

export function ScreenTransition({ children }: PropsWithChildren) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(value, {
      damping: 20,
      mass: 0.8,
      stiffness: 125,
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [value]);

  return (
    <Animated.View
      style={[
        styles.fill,
        {
          opacity: value,
          transform: [
            { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.992, 1] }) }
          ]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
