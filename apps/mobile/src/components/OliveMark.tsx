import { StyleSheet, Text, View } from "react-native";

import { color, font } from "@/src/theme/tokens";

export function OliveMark({ size = 22 }: { size?: number }) {
  const inner = Math.round(size * 0.38);
  return (
    <View
      accessibilityLabel="Olive"
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: size >= 20 ? 2 : 1.5,
        },
      ]}
    >
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: color.sage }} />
    </View>
  );
}

export function OliveWordmark() {
  return (
    <View style={styles.row}>
      <OliveMark />
      <Text style={styles.word}>Olive</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderColor: color.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  word: {
    fontFamily: font.displayBold,
    fontSize: 18,
    color: color.charcoal,
    letterSpacing: -0.3,
  },
});
