import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Caption, Pill, Screen, Title } from "@/src/components/ui";
import { EDGE } from "@/src/copy/edges";
import { color, font, space } from "@/src/theme/tokens";

/** 04b — post-sign bridge. Early sign vs last EOD batch. */
export function PostSignBridge({
  title,
  patientLine,
  chip,
  onReview,
  onBack,
}: {
  title?: string;
  patientLine: string;
  chip?: string;
  onReview: () => void;
  onBack: () => void;
}) {
  return (
    <Screen>
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <View style={styles.glow} />
          <View style={styles.check} accessibilityRole="image" accessibilityLabel="Signed">
            <Caption style={styles.mark}>✓</Caption>
          </View>
          <Title style={styles.title}>{title ?? EDGE.postSign.title}</Title>
          <Caption style={styles.line}>{patientLine}</Caption>
          <View style={styles.chip}>
            <Pill label={chip ?? EDGE.postSign.chip} tone="olive" />
          </View>
        </View>
        <View style={styles.actions}>
          <Button label={EDGE.postSign.cta} onPress={onReview} />
          <View style={{ height: 10 }} />
          <Button label={EDGE.postSign.back} variant="secondary" onPress={onBack} />
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: space.lg, paddingBottom: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  glow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(107, 143, 113, 0.16)",
    top: "28%",
  },
  check: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: color.olive,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: { color: color.white, fontSize: 28, lineHeight: 30, fontFamily: font.uiSemi },
  title: { marginTop: 28, textAlign: "center" },
  line: { marginTop: 14, textAlign: "center", maxWidth: 280 },
  chip: { marginTop: 18, alignItems: "center" },
  actions: { paddingBottom: 6 },
});
