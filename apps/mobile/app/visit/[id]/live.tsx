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
import { Body, Button, Caption, Display, Screen } from "@/src/components/ui";
import { EDGE } from "@/src/copy/edges";
import { useOlive } from "@/src/store/OliveProvider";
import { color, radius, space } from "@/src/theme/tokens";

export default function LiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const olive = useOlive();
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [paused, setPaused] = useState(false);
  const [badAudio, setBadAudio] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const patient = olive.day.patients.find((p) => p.visitId === id);
  const edge = useLocalSearchParams<{ edge?: string }>().edge;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        await startAmbientCapture(api, id);
        if (!cancelled) {
          setCapturing(true);
          if (edge === "bad-audio") setBadAudio(true);
        }
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
  }, [edge, id]);

  useEffect(() => {
    if (!capturing || paused) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [capturing, paused]);

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
        <Caption style={{ textAlign: "center" }}>{patient?.displayName ?? "Visit"}</Caption>
        {badAudio ? (
          <View style={styles.badBanner}>
            <Caption style={{ color: color.warn }}>{EDGE.badAudio.title}</Caption>
            <View style={styles.badRow}>
              <Pressable
                onPress={() => {
                  setBadAudio(false);
                  setPaused(false);
                  setCapturing(true);
                }}
              >
                <Caption style={{ color: color.olive }}>{EDGE.badAudio.fixMic}</Caption>
              </Pressable>
              <Pressable onPress={() => setBadAudio(false)}>
                <Caption style={{ color: color.inkMuted }}>{EDGE.badAudio.continueAnyway}</Caption>
              </Pressable>
            </View>
          </View>
        ) : null}
        <View style={styles.center}>
          <Caption>{gateError ? "Mic closed" : paused ? "Paused" : capturing ? "Listening" : "Mic closed"}</Caption>
          <Display style={styles.timer}>{clock}</Display>
          <Waveform active={capturing && !paused} />
          {gateError ? (
            <Body style={{ color: color.refuse, textAlign: "center", marginTop: 16 }}>{gateError}</Body>
          ) : null}
        </View>
        <View style={styles.bottom}>
          <Button label="End visit" disabled={!capturing && !gateError} onPress={end} />
          <Pressable onPress={() => setPaused((p) => !p)} disabled={!capturing} style={styles.link}>
            <Caption style={{ color: color.inkMuted }}>{paused ? "Resume" : "Pause"}</Caption>
          </Pressable>
          <Pressable onPress={() => setSheet(true)} style={styles.link}>
            <Caption style={{ color: color.olive }}>View transcript</Caption>
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
  timer: { fontSize: 72, lineHeight: 76, marginVertical: 20, letterSpacing: -2 },
  bottom: { paddingBottom: space.md, gap: 4 },
  link: { alignItems: "center", paddingVertical: 8 },
  badBanner: {
    backgroundColor: color.warnSoft,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    marginTop: space.sm,
  },
  badRow: { marginTop: 6, flexDirection: "row", gap: 16 },
});
