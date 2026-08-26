import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Line,
  Path,
  Stop,
  Text as SvgText
} from "react-native-svg";

import { palette, spacing, typography } from "../theme";

export function GrowthChart() {
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(reveal, { duration: 850, toValue: 1, useNativeDriver: true }).start();
  }, [reveal]);

  return (
    <Animated.View style={[styles.chartWrap, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      <Svg height={184} viewBox="0 0 360 184" width="100%">
        <Defs>
          <LinearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={palette.electric} stopOpacity="0.28" />
            <Stop offset="1" stopColor={palette.electric} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[28, 68, 108, 148].map((y) => (
          <Line
            key={y}
            stroke="rgba(255,255,255,0.09)"
            strokeDasharray="3 5"
            strokeWidth="1"
            x1="26"
            x2="348"
            y1={y}
            y2={y}
          />
        ))}
        <Path
          d="M26 130 C52 126, 54 151, 84 142 C106 135, 111 93, 139 94 C164 95, 170 111, 195 101 C223 90, 235 66, 264 75 C291 83, 305 91, 348 30 L348 149 L26 149 Z"
          fill="url(#area)"
        />
        <Path
          d="M26 130 C52 126, 54 151, 84 142 C106 135, 111 93, 139 94 C164 95, 170 111, 195 101 C223 90, 235 66, 264 75 C291 83, 305 91, 348 30"
          fill="none"
          stroke={palette.electric}
          strokeLinecap="round"
          strokeWidth="3"
        />
        <Path
          d="M26 143 C62 141, 86 132, 116 128 C151 124, 180 113, 210 106 C254 95, 295 83, 348 65"
          fill="none"
          stroke={palette.cyan}
          strokeLinecap="round"
          strokeWidth="2"
        />
        <Path
          d="M26 150 C72 149, 95 146, 130 142 C178 138, 207 127, 246 119 C286 109, 316 97, 348 87"
          fill="none"
          stroke={palette.violet}
          strokeDasharray="4 4"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <Circle cx="348" cy="30" fill={palette.electric} opacity="0.24" r="10" />
        <Circle cx="348" cy="30" fill={palette.white} r="4" />
        <Circle cx="348" cy="65" fill={palette.cyan} r="3" />
        <Circle cx="348" cy="87" fill={palette.violet} r="3" />
        {[
          ["03/06", 26],
          ["04/06", 80],
          ["05/06", 134],
          ["06/06", 188],
          ["07/06", 242],
          ["08/06", 296],
          ["09/06", 348]
        ].map(([label, x]) => (
          <SvgText
            fill="rgba(255,255,255,0.48)"
            fontSize="8"
            key={String(label)}
            textAnchor={x === 26 ? "start" : x === 348 ? "end" : "middle"}
            x={Number(x)}
            y="174"
          >
            {label}
          </SvgText>
        ))}
      </Svg>
    </Animated.View>
  );
}

type DonutProps = {
  value?: number;
};

export function TrafficDonut({ value = 48 }: DonutProps) {
  const circumference = 2 * Math.PI * 39;
  const dash = (circumference * value) / 100;

  return (
    <View style={styles.donutWrap}>
      <Svg height={112} viewBox="0 0 112 112" width={112}>
        <G rotation="-90" origin="56, 56">
          <Circle
            cx="56"
            cy="56"
            fill="none"
            r="39"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="12"
          />
          <Circle
            cx="56"
            cy="56"
            fill="none"
            r="39"
            stroke={palette.mint}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="round"
            strokeWidth="12"
          />
        </G>
      </Svg>
      <View style={styles.donutLabel}>
        <Text style={styles.donutValue}>{value}%</Text>
        <Text style={styles.donutMeta}>Pour toi</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: {
    marginHorizontal: -spacing.xs
  },
  donutWrap: {
    alignItems: "center",
    height: 112,
    justifyContent: "center",
    position: "relative",
    width: 112
  },
  donutLabel: {
    alignItems: "center",
    position: "absolute"
  },
  donutValue: {
    ...typography.h3,
    color: palette.white
  },
  donutMeta: {
    ...typography.caption,
    color: palette.muted,
    fontSize: 9
  }
});
