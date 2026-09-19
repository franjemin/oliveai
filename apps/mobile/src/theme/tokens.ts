/**
 * Olive locked tokens (hi-fi / brand-kit aligned).
 * Source folders `/workspace/olive-v1/hifi` and `/workspace/olive-brand/locked`
 * were not mounted in this environment; tokens follow the locked brief:
 * solid olive (no chartreuse gradient), softened mist washes, chairside calm.
 */
export const color = {
  olive: "#3F4A2E",
  oliveMid: "#5C6B43",
  oliveInk: "#2A3220",
  oliveSoft: "#8A946E",
  mist: "#F3F1EA",
  mistWash: "rgba(63, 74, 46, 0.06)",
  mistWashStrong: "rgba(63, 74, 46, 0.10)",
  paper: "#FBF9F4",
  card: "#FFFcf7",
  ink: "#1C1F18",
  inkMuted: "#5E6358",
  inkFaint: "#8A8E84",
  line: "rgba(44, 48, 38, 0.10)",
  refuse: "#7A3A32",
  refuseSoft: "#F4E6E3",
  warn: "#8A5A24",
  warnSoft: "#F6EBD8",
  ok: "#3F4A2E",
  okSoft: "#E4E8D8",
  white: "#FFFFFF",
  overlay: "rgba(28, 31, 24, 0.42)",
} as const;

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const type = {
  display: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "500" as const,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600" as const,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500" as const,
  },
  mono: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    letterSpacing: 0.2,
  },
} as const;

export const font = {
  display: "Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, serif",
  ui: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "ui-monospace, 'SpaceMono', 'SF Mono', Menlo, monospace",
} as const;

export const DISCLOSURE_SCRIPT_ID = "audio-disclosure-v1";
