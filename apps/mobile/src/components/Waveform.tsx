import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { color } from "@/src/theme/tokens";

const HEIGHTS = [10, 18, 12, 22, 14, 20, 11, 24, 13, 19, 12, 16];

export function Waveform({ active }: { active: boolean }) {
  const bars = useMemo(() => HEIGHTS, []);
  return (
    <View style={styles.row} accessibilityLabel={active ? "Live waveform" : "Idle waveform"}>
      {bars.map((max, i) => (
        <Bar key={i} max={max} delay={i * 55} active={active} />
      ))}
    </View>
  );
}

function Bar({ max, delay, active }: { max: number; delay: number; active: boolean }) {
  const height = useRef(new Animated.Value(6)).current;
  useEffect(() => {
    if (!active) {
      height.setValue(6);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(height, {
          toValue: max,
          duration: 340 + delay,
          useNativeDriver: false,
        }),
        Animated.timing(height, {
          toValue: 7,
          duration: 340 + delay,
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
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: color.sage,
  },
});
