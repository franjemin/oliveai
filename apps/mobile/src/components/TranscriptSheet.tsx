import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { TranscriptSegment } from "@/src/api/types";
import { AUDIO_RETENTION } from "@/src/copy/retention";
import { color, radius, space } from "@/src/theme/tokens";
import { Body, Caption, Mono, Title } from "./ui";

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
        <Caption style={{ marginTop: 6, marginBottom: 16 }}>{AUDIO_RETENTION.short}</Caption>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
          {declined ? (
            <Body>No transcript. Recording was declined for this visit.</Body>
          ) : segments.length === 0 ? (
            <Body>Listening… segments appear as the visit is diarized.</Body>
          ) : (
            segments.map((seg) => {
              const clinician = seg.speakerLabel === "speaker_clinician";
              return (
                <View key={seg.id} style={[styles.bubble, clinician ? styles.clinician : styles.patient]}>
                  <Mono>{clinician ? "Dr. Chen" : "Patient"}</Mono>
                  <Body style={{ marginTop: 4 }}>{seg.text}</Body>
                </View>
              );
            })
          )}
        </ScrollView>
        <Pressable onPress={onClose} style={styles.close}>
          <Body style={{ color: color.olive, fontWeight: "600" }}>Close</Body>
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
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.lg,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.line,
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
    backgroundColor: color.mistWashStrong,
  },
  close: {
    alignItems: "center",
    paddingVertical: space.md,
  },
});
