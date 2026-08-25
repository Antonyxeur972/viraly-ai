export const palette = {
  ink: "#030711",
  graphite: "rgba(3, 8, 20, 0.97)",
  panel: "rgba(5, 13, 31, 0.86)",
  panelSoft: "rgba(11, 23, 50, 0.72)",
  line: "rgba(66, 139, 255, 0.20)",
  lineStrong: "rgba(66, 139, 255, 0.48)",
  paper: "#F4F7FF",
  paperMuted: "rgba(255, 255, 255, 0.72)",
  white: "#FFFFFF",
  muted: "rgba(255, 255, 255, 0.42)",
  mint: "#2D7CFF",
  mintDark: "#0B3F9A",
  coral: "#D1D8E8",
  lemon: "#E5ECF8",
  sky: "#77C7FF",
  violet: "#AAB8D8",
  green: "#2D7CFF"
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
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.48,
    shadowRadius: 22
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
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "800" as const,
    letterSpacing: 0
  },
  h2: {
    fontSize: 24,
    lineHeight: 29,
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
