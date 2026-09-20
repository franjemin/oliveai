import { StyleSheet, Text, View } from "react-native";

import { EDGE, draftSavedDetail } from "@/src/copy/edges";
import { color, font, radius, shadow } from "@/src/theme/tokens";

/** Charcoal “Draft saved” toast — patient · sign at end of day. */
export function DraftToast({ name }: { name: string }) {
  return (
    <View style={styles.toast} pointerEvents="none" accessibilityLiveRegion="polite">
      <View style={styles.check} accessibilityLabel="Saved">
        <Text style={styles.mark}>✓</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{EDGE.draftSaved}</Text>
        <Text style={styles.detail}>{draftSavedDetail(name)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 96,
    backgroundColor: color.charcoal,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow.toast,
  },
  check: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.olive,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    color: color.paper,
    fontSize: 16,
    lineHeight: 18,
    fontFamily: font.uiSemi,
  },
  title: {
    color: color.paper,
    fontFamily: font.uiSemi,
    fontSize: 16,
    lineHeight: 20,
  },
  detail: {
    marginTop: 2,
    color: "rgba(255, 254, 250, 0.62)",
    fontFamily: font.ui,
    fontSize: 13,
    lineHeight: 18,
  },
});
