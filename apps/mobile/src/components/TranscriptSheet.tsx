import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { TranscriptSegment } from "@/src/api/types";
import { color, font, radius, shadow, space } from "@/src/theme/tokens";
import { Body, Caption, Title } from "./ui";

export function TranscriptSheet({
  visible,
  onClose,
  segments,
  declined,
}: {
  visible: boolean;
  onClose: () => void;
  segments: TranscriptSegment[];
  declined?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Title>Transcript</Title>
        <Caption style={{ marginTop: 6, marginBottom: 16 }}>Live draft — not the signed note.</Caption>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
          {declined ? (
            <Body>No transcript. Recording was declined for this visit.</Body>
          ) : segments.length === 0 ? (
            <Body style={{ color: color.inkMuted }}>Listening… segments appear as the visit is diarized.</Body>
          ) : (
            segments.map((seg) => {
              const clinician = seg.speakerLabel === "speaker_clinician";
              return (
                <View key={seg.id} style={[styles.bubble, clinician ? styles.clinician : styles.patient]}>
                  <Caption style={{ color: color.sage, fontFamily: font.uiSemi }}>
                    {clinician ? "Dr. Chen" : "Patient"}
                  </Caption>
                  <Body style={{ marginTop: 4 }}>{seg.text}</Body>
                </View>
              );
            })
          )}
        </ScrollView>
        <Pressable onPress={onClose} style={styles.close}>
          <Body style={{ color: color.olive, fontFamily: font.uiSemi }}>Close</Body>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.overlay,
  },
  sheet: {
    height: "72%",
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.lg,
    ...shadow.glass,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(44, 43, 40, 0.14)",
    marginBottom: space.md,
  },
  bubble: {
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  clinician: {
    backgroundColor: color.okSoft,
  },
  patient: {
    backgroundColor: color.paperAlt,
  },
  close: {
    alignItems: "center",
    paddingVertical: space.md,
  },
});
