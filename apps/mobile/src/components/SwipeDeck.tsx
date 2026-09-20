import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";

import { SWIPE_HINT } from "@/src/copy/messaging";
import { color, font } from "@/src/theme/tokens";

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
    outputRange: ["-12deg", "0deg", "12deg"],
    extrapolate: "clamp",
  });
  const sendOpacity = translate.interpolate({
    inputRange: [0, 40, 160],
    outputRange: [0, 0.35, 1],
    extrapolate: "clamp",
  });
  const skipOpacity = translate.interpolate({
    inputRange: [-160, -40, 0],
    outputRange: [1, 0.35, 0],
    extrapolate: "clamp",
  });
  const peekScale = translate.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: [1, 0.97, 1],
    extrapolate: "clamp",
  });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => !disabledRef.current && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => {
          translate.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const max = widthRef.current;
          const passed = Math.abs(g.dx) > max * THRESHOLD || Math.abs(g.vx) > 1.1;
          if (passed) {
            const dir = g.dx >= 0 ? 1 : -1;
            Animated.timing(translate, {
              toValue: dir * (max + 120),
              duration: 240,
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
      accessibilityLabel={SWIPE_HINT}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
      }}
    >
      <Animated.View
        {...pan.panHandlers}
        style={[
          styles.front,
          {
            transform: [{ translateX: translate }, { rotate }],
          },
        ]}
      >
        <View style={styles.cardSlot}>
          {peek ? (
            <Animated.View style={[styles.peek, { transform: [{ scale: peekScale }] }]} pointerEvents="none">
              <Text style={styles.next}>NEXT</Text>
              {peek}
            </Animated.View>
          ) : (
            <View style={styles.peekEmpty} pointerEvents="none" />
          )}
          <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampSend, { opacity: sendOpacity }]}>
            <Text style={styles.stampSendMark}>✈</Text>
            <Text style={styles.stampSendText}>Send</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampSkip, { opacity: skipOpacity }]}>
            <Text style={styles.stampSkipText}>Skip</Text>
          </Animated.View>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, minHeight: 0, marginTop: 16, overflow: "visible" },
  front: {
    flex: 1,
    minHeight: 0,
    justifyContent: "center",
    overflow: "visible",
  },
  cardSlot: {
    alignSelf: "stretch",
    height: "100%",
    maxHeight: "100%",
    flexShrink: 1,
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
  },
  peek: {
    position: "absolute",
    left: 0,
    right: 18,
    top: 18,
    bottom: 0,
  },
  peekEmpty: {
    position: "absolute",
    left: 0,
    right: 18,
    top: 18,
    bottom: 0,
    backgroundColor: color.paperAlt,
    borderRadius: 28,
  },
  next: {
    position: "absolute",
    left: 16,
    top: "42%",
    zIndex: 1,
    fontFamily: font.uiSemi,
    fontSize: 11,
    letterSpacing: 1.2,
    color: "rgba(44, 43, 40, 0.28)",
  },
  stamp: {
    position: "absolute",
    top: 16,
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stampSend: {
    left: 16,
    backgroundColor: color.olive,
  },
  stampSkip: {
    right: 16,
    backgroundColor: color.stone,
  },
  stampSendMark: {
    color: color.white,
    fontFamily: font.uiSemi,
    fontSize: 13,
  },
  stampSendText: {
    fontFamily: font.uiSemi,
    fontSize: 14,
    color: color.white,
  },
  stampSkipText: {
    fontFamily: font.uiSemi,
    fontSize: 14,
    color: color.charcoal,
  },
});
