/**
 * Visual tokens locked to Design hi-fi frames (01–05b).
 * Cream paper, sage→olive CTA, charcoal ink. Nunito (brand) + Inter (UI).
 */
export const color = {
  paper: "#FFFEFA",
  paperAlt: "#F7F5F0",
  mist: "#F7F5F0",
  mistWash: "rgba(122, 158, 126, 0.08)",
  mistWashStrong: "rgba(122, 158, 126, 0.14)",
  sage: "#7A9E7E",
  sageMid: "#719878",
  olive: "#6B8F71",
  oliveMid: "#6B8F71",
  oliveInk: "#2C2B28",
  oliveSoft: "#A8C0AA",
  oliveDeep: "#5F8266",
  charcoal: "#2C2B28",
  ink: "#2C2B28",
  inkMuted: "rgba(44, 43, 40, 0.56)",
  inkFaint: "rgba(44, 43, 40, 0.38)",
  line: "rgba(44, 43, 40, 0.08)",
  glass: "rgba(255, 255, 255, 0.92)",
  card: "#FFFFFF",
  white: "#FFFFFF",
  overlay: "rgba(44, 43, 40, 0.22)",
  refuse: "#8A534C",
  refuseSoft: "#F6EBE9",
  warn: "#8A6A3B",
  warnSoft: "#F6EEDC",
  ok: "#6B8F71",
  okSoft: "#E7F0E8",
  stage: "#E8E6DF",
  track: "#2C2B28",
} as const;

export const gradient = {
  cta: ["#7A9E7E", "#6B8F71"] as const,
} as const;

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  xl: 32,
  sheet: 36,
  pill: 999,
} as const;

export const type = {
  display: {
    fontSize: 52,
    lineHeight: 56,
    fontWeight: "800" as const,
    letterSpacing: -1.6,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700" as const,
    letterSpacing: -0.9,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500" as const,
  },
  kicker: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600" as const,
    letterSpacing: 1.15,
    textTransform: "uppercase" as const,
  },
  mono: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    letterSpacing: 0.2,
  },
} as const;

export const font = {
  display: "Nunito",
  displayBold: "Nunito-Bold",
  displayBlack: "Nunito-ExtraBold",
  ui: "Inter",
  uiMed: "Inter-Medium",
  uiSemi: "Inter-SemiBold",
  mono: "Inter",
} as const;

export const shadow = {
  glass: {
    shadowColor: "#2C2B28",
    shadowOpacity: 0.07,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  float: {
    shadowColor: "#2C2B28",
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  toast: {
    shadowColor: "#2C2B28",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

export const DISCLOSURE_SCRIPT_ID = "audio-disclosure-v1";
