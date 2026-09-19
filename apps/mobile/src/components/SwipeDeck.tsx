import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";

import { color, font, radius } from "@/src/theme/tokens";

const THRESHOLD = 0.35;

export function SwipeDeck({
  children,
  peek,
  disabled,
  onSend,
  onSkip,
}: {
  children: ReactNode;
  peek?: ReactNode;
  disabled?: boolean;
  onSend: () => void;
  onSkip: () => void;
}) {
  const translate = useRef(new Animated.Value(0)).current;
  const widthRef = useRef(320);
  const disabledRef = useRef(disabled);
  const sendRef = useRef(onSend);
  const skipRef = useRef(onSkip);
  disabledRef.current = disabled;
  sendRef.current = onSend;
  skipRef.current = onSkip;

  useEffect(() => {
    translate.setValue(0);
  }, [children, translate]);

  const rotate = translate.interpolate({
    inputRange: [-240, 0, 240],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });
  const sendOpacity = translate.interpolate({
    inputRange: [0, 140],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const skipOpacity = translate.interpolate({
    inputRange: [-140, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const peekScale = translate.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: [1, 0.96, 1],
    extrapolate: "clamp",
  });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => !disabledRef.current && Math.abs(g.dx) > 8,
        onPanResponderMove: (_, g) => {
          translate.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const max = widthRef.current;
          const passed = Math.abs(g.dx) > max * THRESHOLD || Math.abs(g.vx) > 1.1;
          if (passed) {
            const dir = g.dx >= 0 ? 1 : -1;
            Animated.timing(translate, {
              toValue: dir * (max + 80),
              duration: 220,
              useNativeDriver: true,
            }).start(() => {
              if (dir > 0) sendRef.current();
              else skipRef.current();
              translate.setValue(0);
            });
            return;
          }
          Animated.spring(translate, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
        },
      }),
    [translate],
  );

  return (
    <View
      style={styles.stage}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
      }}
    >
      {peek ? (
        <Animated.View style={[styles.peek, { transform: [{ scale: peekScale }] }]}>{peek}</Animated.View>
      ) : null}
      <Animated.View
        {...pan.panHandlers}
        style={[
          styles.front,
          {
            transform: [{ translateX: translate }, { rotate }],
          },
        ]}
      >
        <Animated.View style={[styles.stamp, styles.stampSend, { opacity: sendOpacity }]}>
          <Text style={styles.stampSendText}>Send</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampSkip, { opacity: skipOpacity }]}>
          <Text style={styles.stampSkipText}>Skip</Text>
        </Animated.View>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, marginTop: 18 },
  peek: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 14,
    bottom: 0,
    opacity: 0.55,
  },
  front: {
    flex: 1,
  },
  stamp: {
    position: "absolute",
    top: 18,
    zIndex: 2,
    borderWidth: 3,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ rotate: "-12deg" }],
  },
  stampSend: {
    left: 16,
    borderColor: color.olive,
    backgroundColor: "rgba(107, 143, 113, 0.08)",
  },
  stampSkip: {
    right: 16,
    borderColor: "rgba(44, 43, 40, 0.35)",
    backgroundColor: "rgba(44, 43, 40, 0.04)",
    transform: [{ rotate: "12deg" }],
  },
  stampSendText: {
    fontFamily: font.displayBold,
    fontSize: 22,
    color: color.olive,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  stampSkipText: {
    fontFamily: font.displayBold,
    fontSize: 22,
    color: "rgba(44, 43, 40, 0.45)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
