import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { color, font } from "@/src/theme/tokens";

export function PhoneShell({ children }: { children: ReactNode }) {
  const [clock, setClock] = useState("");
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const tick = () =>
      setClock(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (Platform.OS !== "web") {
    return <View style={styles.fill}>{children}</View>;
  }
  return (
    <View style={styles.stage}>
      <View style={styles.phone}>
        <View style={styles.island} />
        <View style={styles.status} pointerEvents="none">
          <Text style={styles.statusTime}>{clock}</Text>
          <Text style={styles.statusMeta}>●●● LTE</Text>
        </View>
        <View style={styles.content}>{children}</View>
        <View style={styles.home} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.paper },
  stage: {
    flex: 1,
    backgroundColor: color.stage,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  phone: {
    width: 390,
    height: 844,
    maxHeight: "96%",
    backgroundColor: color.paper,
    borderRadius: 48,
    overflow: "hidden",
    borderWidth: 10,
    borderColor: "#1A1916",
    shadowColor: "#1A1916",
    shadowOpacity: 0.28,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 22 },
  },
  island: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    left: "50%",
    marginLeft: -60,
    width: 120,
    height: 34,
    borderRadius: 20,
    backgroundColor: "#0B0B0A",
    zIndex: 4,
  },
  status: {
    position: "absolute",
    top: 16,
    left: 28,
    right: 28,
    zIndex: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusTime: {
    fontFamily: font.uiSemi,
    fontSize: 15,
    color: color.charcoal,
  },
  statusMeta: {
    fontFamily: font.ui,
    fontSize: 11,
    color: color.inkMuted,
    letterSpacing: 0.4,
  },
  content: {
    flex: 1,
    paddingTop: 52,
    paddingBottom: 18,
  },
  home: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    left: "50%",
    marginLeft: -64,
    width: 128,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(44, 43, 40, 0.18)",
    zIndex: 4,
  },
});
