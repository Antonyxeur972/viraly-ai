export const palette = {
  ink: "#06110E",
  graphite: "rgba(8, 13, 12, 0.95)",
  panel: "rgba(7, 13, 11, 0.80)",
  panelSoft: "rgba(16, 23, 20, 0.68)",
  line: "rgba(255, 255, 255, 0.12)",
  paper: "#F1F5F2",
  paperMuted: "rgba(245, 248, 246, 0.72)",
  white: "#FFFFFF",
  muted: "rgba(245, 248, 246, 0.46)",
  mint: "#45F2A4",
  mintDark: "#0B6246",
  coral: "#8E9B95",
  lemon: "#DDE6E1",
  sky: "#70A58F",
  violet: "#667A71",
  green: "#45F2A4"
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
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
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
  md: 10,
  lg: 14,
  pill: 999
};

export const typography = {
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900" as const,
    letterSpacing: 0
  },
  h2: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900" as const,
    letterSpacing: 0
  },
  h3: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800" as const,
    letterSpacing: 0
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600" as const,
    letterSpacing: 0
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800" as const,
    letterSpacing: 0
  }
};
