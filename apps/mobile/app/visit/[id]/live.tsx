import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/src/api";
import { startAmbientCapture } from "@/src/api/recordingGate";
import { api } from "@/src/api";
import type { TranscriptSegment } from "@/src/api/types";
import { TranscriptSheet } from "@/src/components/TranscriptSheet";
import { Waveform } from "@/src/components/Waveform";
import { Body, Button, Caption, Display, Mono, Screen } from "@/src/components/ui";
import { useOlive } from "@/src/store/OliveProvider";
import { color, space } from "@/src/theme/tokens";

export default function LiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const olive = useOlive();
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const patient = olive.day.patients.find((p) => p.visitId === id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        await startAmbientCapture(api, id);
        if (!cancelled) setCapturing(true);
      } catch (err) {
        if (!cancelled) {
          setCapturing(false);
          setGateError(err instanceof ApiError ? err.message : "Microphone closed.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!capturing) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [capturing]);

  useEffect(() => {
    if (!id || !capturing) return;
    const poll = async () => {
      const tr = await olive.getTranscript(id);
      setSegments(tr.segments);
    };
    void poll();
    const t = setInterval(poll, 2500);
    return () => clearInterval(t);
  }, [capturing, id, olive]);

  const clock = useMemo(() => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [seconds]);

  const end = async () => {
    if (!id) return;
    await olive.endVisit(id);
    router.replace(`/visit/${id}/note`);
  };

  return (
    <Screen>
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <View style={styles.wash} />
        <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start", marginBottom: 8 }}>
          <Caption style={{ color: color.olive }}>← Back</Caption>
        </Pressable>
        <Caption style={{ textAlign: "center" }}>{patient?.displayName ?? "Visit"}</Caption>
        <Caption style={{ textAlign: "center", marginTop: 4 }}>
          {capturing ? "Listening" : "Mic closed"}
        </Caption>
        <View style={styles.center}>
          <Display style={styles.timer}>{clock}</Display>
          <Waveform active={capturing} />
          {gateError ? (
            <Body style={{ color: color.refuse, textAlign: "center", marginTop: 16 }}>{gateError}</Body>
          ) : (
            <Mono style={{ marginTop: 18 }}>audio-disclosure-v1</Mono>
          )}
        </View>
        <View style={styles.bottom}>
          <Button label="End visit" onPress={end} />
          <Pressable onPress={() => setSheet(true)} style={styles.link}>
            <Body style={{ color: color.olive, fontWeight: "600" }}>View transcript</Body>
          </Pressable>
        </View>
        <TranscriptSheet visible={sheet} onClose={() => setSheet(false)} segments={segments} />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: space.lg },
  wash: {
    position: "absolute",
    top: 80,
    left: 24,
    right: 24,
    height: 280,
    backgroundColor: color.mistWash,
    borderRadius: 160,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  timer: { fontSize: 72, lineHeight: 76, marginBottom: 28, letterSpacing: -2 },
  bottom: { paddingBottom: space.md, gap: 8 },
  link: { alignItems: "center", paddingVertical: 12 },
});
