import { Pressable, StyleSheet, View } from "react-native";

import { Body, Button, Caption, Title } from "@/src/components/ui";
import { EDGE } from "@/src/copy/edges";
import { color, radius, shadow, space } from "@/src/theme/tokens";

export function SignConfirmSheet({
  visible,
  busy,
  onSign,
  onCancel,
}: {
  visible: boolean;
  busy?: boolean;
  onSign: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable style={styles.dim} onPress={onCancel} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Title>{EDGE.signConfirm.title}</Title>
        <Caption style={styles.beat}>{EDGE.signConfirm.oliveTruth}</Caption>
        <Caption style={styles.beat}>{EDGE.signConfirm.audio}</Caption>
        <Caption style={styles.beat}>{EDGE.signConfirm.noOd}</Caption>
        <View style={{ marginTop: 22 }}>
          <Button label={EDGE.signConfirm.sign} disabled={busy} onPress={onSign} />
        </View>
        <Pressable onPress={onCancel} style={styles.cancel}>
          <Body style={{ color: color.inkMuted, textAlign: "center" }}>{EDGE.signConfirm.cancel}</Body>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 8,
  },
  dim: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: color.overlay,
  },
  sheet: {
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.lg,
    paddingTop: 12,
    paddingBottom: 28,
    ...shadow.glass,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(44, 43, 40, 0.14)",
    marginBottom: 18,
  },
  beat: {
    marginTop: 10,
    color: color.inkMuted,
  },
  cancel: {
    paddingVertical: 14,
  },
});
