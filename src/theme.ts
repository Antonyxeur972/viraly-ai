export const palette = {
  ink: "#01030A",
  graphite: "rgba(2, 7, 18, 0.97)",
  panel: "rgba(5, 14, 34, 0.84)",
  panelSoft: "rgba(10, 24, 52, 0.70)",
  panelElevated: "rgba(7, 18, 43, 0.94)",
  line: "rgba(129, 177, 255, 0.11)",
  lineStrong: "rgba(61, 145, 255, 0.40)",
  paper: "#F7F9FF",
  paperMuted: "rgba(239, 244, 255, 0.74)",
  white: "#FFFFFF",
  muted: "rgba(216, 226, 247, 0.44)",
  mint: "#2388FF",
  mintDark: "#082D75",
  electric: "#149CFF",
  cyan: "#45D6FF",
  violet: "#765CFF",
  positive: "#2BD994",
  coral: "#FF7A9F",
  lemon: "#F5D36B",
  sky: "#80C8FF",
  green: "#2BD994"
};

export const shadow = {
  sm: {
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8
  },
  md: {
    elevation: 10,
    shadowColor: "#051A45",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.62,
    shadowRadius: 26
  },
  electric: {
    elevation: 14,
    shadowColor: palette.electric,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.42,
    shadowRadius: 18
  }
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32
};

export const radius = {
  sm: 8,
  md: 8,
  lg: 8,
  pill: 999
};

export const typography = {
  title: {
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "900" as const,
    letterSpacing: 0
  },
  h2: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800" as const,
    letterSpacing: 0
  },
  h3: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700" as const,
    letterSpacing: 0
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500" as const,
    letterSpacing: 0
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700" as const,
    letterSpacing: 0
  }
};
