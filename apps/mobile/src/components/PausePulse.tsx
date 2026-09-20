import { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { EDGE } from "@/src/copy/edges";
import { color, font } from "@/src/theme/tokens";

const native = Platform.OS !== "web";

/** Massive olive Pause with pulse rings — Live hi-fi (no bottom Pause twin). */
export function PausePulse({
  paused,
  disabled,
  onPress,
}: {
  paused: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (paused || disabled) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: native,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(0);
    };
  }, [disabled, paused, pulse]);

  const ring = (from: number, to: number) => ({
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [from, to] }),
    transform: [
      {
        scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] }),
      },
    ],
  });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View style={[styles.ring, styles.ringOuter, ring(0.18, 0.06)]} pointerEvents="none" />
      <Animated.View style={[styles.ring, styles.ringMid, ring(0.28, 0.1)]} pointerEvents="none" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={paused ? "Resume" : "Pause"}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.core, { opacity: disabled ? 0.45 : pressed ? 0.9 : 1 }]}
      >
        {paused ? (
          <View style={styles.play} />
        ) : (
          <View style={styles.bars}>
            <View style={styles.bar} />
            <View style={styles.bar} />
          </View>
        )}
        <Text style={styles.label}>{paused ? EDGE.live.resume : EDGE.live.pause}</Text>
      </Pressable>
    </View>
  );
}

const CORE = 148;

const styles = StyleSheet.create({
  wrap: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(122, 158, 126, 0.16)",
  },
  ringOuter: {
    width: 280,
    height: 280,
    backgroundColor: "rgba(122, 158, 126, 0.1)",
  },
  ringMid: {
    width: 214,
    height: 214,
    backgroundColor: "rgba(107, 143, 113, 0.18)",
  },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    backgroundColor: color.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  bars: {
    flexDirection: "row",
    gap: 10,
    height: 36,
    alignItems: "center",
  },
  bar: {
    width: 8,
    height: 32,
    borderRadius: 4,
    backgroundColor: color.paper,
  },
  play: {
    width: 0,
    height: 0,
    marginLeft: 6,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 20,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: color.paper,
  },
  label: {
    marginTop: 10,
    color: color.paper,
    fontFamily: font.uiSemi,
    fontSize: 12,
    letterSpacing: 1.6,
  },
});
