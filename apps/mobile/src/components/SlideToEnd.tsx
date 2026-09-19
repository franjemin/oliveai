import { useMemo, useRef } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";

import { color, font, radius } from "@/src/theme/tokens";

const KNOB = 58;
const INSET = 5;

export function SlideToEnd({
  label = "Slide to end visit",
  disabled,
  onComplete,
}: {
  label?: string;
  disabled?: boolean;
  onComplete: () => void;
}) {
  const trackW = useRef(0);
  const translate = useRef(new Animated.Value(0)).current;
  const fired = useRef(false);
  const disabledRef = useRef(disabled);
  const completeRef = useRef(onComplete);
  disabledRef.current = disabled;
  completeRef.current = onComplete;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderMove: (_, g) => {
          const maxX = Math.max(0, trackW.current - KNOB - INSET * 2);
          translate.setValue(Math.max(0, Math.min(g.dx, maxX)));
        },
        onPanResponderRelease: (_, g) => {
          const maxX = Math.max(0, trackW.current - KNOB - INSET * 2);
          const done = g.dx > maxX * 0.68;
          if (done && !fired.current) {
            fired.current = true;
            Animated.timing(translate, { toValue: maxX, duration: 120, useNativeDriver: true }).start(() => {
              completeRef.current();
              fired.current = false;
              translate.setValue(0);
            });
            return;
          }
          Animated.spring(translate, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        },
      }),
    [translate],
  );

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      onLayout={(e) => {
        trackW.current = e.nativeEvent.layout.width;
      }}
      style={[styles.track, disabled && { opacity: 0.4 }]}
    >
      <Text style={styles.label}>{label}</Text>
      <Animated.View {...pan.panHandlers} style={[styles.knob, { transform: [{ translateX: translate }] }]}>
        <Text style={styles.chev}>›</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: color.track,
    justifyContent: "center",
    overflow: "hidden",
  },
  label: {
    textAlign: "center",
    color: "rgba(255,254,250,0.92)",
    fontFamily: font.uiSemi,
    fontSize: 16,
    paddingLeft: 22,
  },
  knob: {
    position: "absolute",
    left: INSET,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  chev: {
    color: color.charcoal,
    fontSize: 28,
    lineHeight: 30,
    marginTop: -2,
    fontFamily: font.ui,
  },
});
