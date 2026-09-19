import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from "react-native";

import { color, font, radius, space, type } from "@/src/theme/tokens";

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Display({ children, style, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[styles.display, style]}>
      {children}
    </Text>
  );
}

export function Title({ children, style, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[styles.title, style]}>
      {children}
    </Text>
  );
}

export function Subtitle({ children, style, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[styles.subtitle, style]}>
      {children}
    </Text>
  );
}

export function Body({ children, style, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[styles.body, style]}>
      {children}
    </Text>
  );
}

export function Caption({ children, style, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[styles.caption, style]}>
      {children}
    </Text>
  );
}

export function Mono({ children, style, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[styles.mono, style]}>
      {children}
    </Text>
  );
}

export function Pill({
  label,
  tone = "olive",
}: {
  label: string;
  tone?: "olive" | "warn" | "refuse" | "mist";
}) {
  const map = {
    olive: { bg: color.okSoft, fg: color.oliveInk },
    warn: { bg: color.warnSoft, fg: color.warn },
    refuse: { bg: color.refuseSoft, fg: color.refuse },
    mist: { bg: color.mistWashStrong, fg: color.inkMuted },
  } as const;
  return (
    <View style={[styles.pill, { backgroundColor: map[tone].bg }]}>
      <Caption style={{ color: map[tone].fg }}>{label}</Caption>
    </View>
  );
}

export function Button({
  label,
  variant = "primary",
  disabled,
  style,
  ...rest
}: PressableProps & { label: string; variant?: "primary" | "secondary" | "ghost" | "refuse" }) {
  const palette = {
    primary: { bg: color.olive, fg: color.white, border: color.olive },
    secondary: { bg: color.white, fg: color.oliveInk, border: color.line },
    ghost: { bg: "transparent", fg: color.olive, border: "transparent" },
    refuse: { bg: color.white, fg: color.refuse, border: "rgba(122, 58, 50, 0.28)" },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.btn,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.4 : state.pressed ? 0.86 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...rest}
    >
      <Text style={[styles.btnLabel, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.mist,
  },
  display: {
    ...type.display,
    color: color.ink,
    fontFamily: font.display,
  },
  title: {
    ...type.title,
    color: color.ink,
    fontFamily: font.display,
  },
  subtitle: {
    ...type.subtitle,
    color: color.ink,
    fontFamily: font.ui,
  },
  body: {
    ...type.body,
    color: color.ink,
    fontFamily: font.ui,
  },
  caption: {
    ...type.caption,
    color: color.inkMuted,
    fontFamily: font.ui,
  },
  mono: {
    ...type.mono,
    color: color.oliveMid,
    fontFamily: font.mono,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  btn: {
    minHeight: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderWidth: 1,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: font.ui,
  },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: color.line,
  },
});
