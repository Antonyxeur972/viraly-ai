export const palette = {
  ink: "#04120B",
  graphite: "rgba(3, 15, 10, 0.96)",
  panel: "rgba(5, 23, 15, 0.82)",
  panelSoft: "rgba(10, 31, 21, 0.70)",
  line: "rgba(181, 255, 63, 0.16)",
  lineStrong: "rgba(181, 255, 63, 0.40)",
  paper: "#F4F7F4",
  paperMuted: "rgba(255, 255, 255, 0.72)",
  white: "#FFFFFF",
  muted: "rgba(255, 255, 255, 0.42)",
  mint: "#A7F542",
  mintDark: "#2E771B",
  coral: "#C9D2CD",
  lemon: "#E7EEE9",
  sky: "#8FB8A8",
  violet: "#7C9489",
  green: "#A7F542"
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
