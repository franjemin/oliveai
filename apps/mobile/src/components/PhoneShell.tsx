import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { color } from "@/src/theme/tokens";

export function PhoneShell({ children }: { children: ReactNode }) {
  if (Platform.OS !== "web") {
    return <View style={styles.fill}>{children}</View>;
  }
  return (
    <View style={styles.stage}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.mist },
  stage: {
    flex: 1,
    backgroundColor: "#E4E2D8",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  phone: {
    width: 390,
    height: 844,
    maxHeight: "96%",
    backgroundColor: color.mist,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(44, 48, 38, 0.12)",
    shadowColor: "#1C1F18",
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
  },
});
