import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { color } from "@/src/theme/tokens";

const HEIGHTS = [18, 34, 22, 48, 28, 40, 16, 44, 24, 36, 20, 42, 18, 32, 26];

export function Waveform({ active }: { active: boolean }) {
  const bars = useMemo(() => HEIGHTS.map((h) => h), []);
  return (
    <View style={styles.row} accessibilityLabel={active ? "Live waveform" : "Idle waveform"}>
      {bars.map((max, i) => (
        <Bar key={i} max={max} delay={i * 70} active={active} />
      ))}
    </View>
  );
}

function Bar({ max, delay, active }: { max: number; delay: number; active: boolean }) {
  const height = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    if (!active) {
      height.setValue(8);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(height, {
          toValue: max,
          duration: 380 + delay,
          useNativeDriver: false,
        }),
        Animated.timing(height, {
          toValue: 10,
          duration: 380 + delay,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, delay, height, max]);

  return <Animated.View style={[styles.bar, { height }]} />;
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 5,
  },
  bar: {
    width: 7,
    borderRadius: 4,
    backgroundColor: color.olive,
  },
});
