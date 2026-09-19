import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
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

import { color, font, gradient, radius, shadow, space, type } from "@/src/theme/tokens";

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

export function Kicker({ children, style, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[styles.kicker, style]}>
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
    olive: { bg: color.okSoft, fg: color.oliveDeep },
    warn: { bg: color.okSoft, fg: color.oliveDeep },
    refuse: { bg: color.refuseSoft, fg: color.refuse },
    mist: { bg: color.paperAlt, fg: color.inkMuted },
  } as const;
  return (
    <View style={[styles.pill, { backgroundColor: map[tone].bg }]}>
      <Caption style={{ color: map[tone].fg, fontFamily: font.uiMed }}>{label}</Caption>
    </View>
  );
}

export function Button({
  label,
  variant = "primary",
  size = "md",
  disabled,
  style,
  ...rest
}: PressableProps & {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "refuse" | "end";
  size?: "md" | "lg";
}) {
  const palette = {
    primary: { bg: color.olive, fg: color.white, border: "transparent" },
    secondary: { bg: color.paperAlt, fg: color.charcoal, border: "transparent" },
    ghost: { bg: "transparent", fg: color.inkMuted, border: "transparent" },
    refuse: { bg: "transparent", fg: color.inkFaint, border: "transparent" },
    end: { bg: color.charcoal, fg: color.white, border: "transparent" },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.btnWrap,
        size === "lg" && styles.btnLg,
        typeof style === "function" ? style(state) : style,
        { opacity: disabled ? 0.4 : state.pressed ? 0.88 : 1 },
      ]}
      {...rest}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={[...gradient.cta]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.btnFill, size === "lg" && styles.btnLg]}
        >
          <Text style={[styles.btnLabel, size === "lg" && styles.btnLabelLg, { color: color.white }]}>{label}</Text>
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.btnFill,
            size === "lg" && styles.btnLg,
            { backgroundColor: palette.bg, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.btnLabel, size === "lg" && styles.btnLabelLg, { color: palette.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.paper,
  },
  display: {
    ...type.display,
    color: color.ink,
    fontFamily: font.displayBlack,
  },
  title: {
    ...type.title,
    color: color.ink,
    fontFamily: font.displayBold,
  },
  subtitle: {
    ...type.subtitle,
    color: color.ink,
    fontFamily: font.displayBold,
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
  kicker: {
    ...type.kicker,
    color: color.inkFaint,
    fontFamily: font.uiSemi,
  },
  mono: {
    ...type.mono,
    color: color.olive,
    fontFamily: font.uiMed,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  btnWrap: {
    minHeight: 56,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  btnFill: {
    minHeight: 56,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  btnLg: {
    minHeight: 64,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: font.uiSemi,
  },
  btnLabelLg: {
    fontSize: 17,
  },
  card: {
    backgroundColor: color.white,
    borderRadius: radius.xl,
    padding: 22,
    ...shadow.glass,
  },
});
