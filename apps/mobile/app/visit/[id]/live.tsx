import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/src/api";
import { startAmbientCapture } from "@/src/api/recordingGate";
import { api } from "@/src/api";
import type { TranscriptSegment } from "@/src/api/types";
import { SlideToEnd } from "@/src/components/SlideToEnd";
import { TranscriptSheet } from "@/src/components/TranscriptSheet";
import { Waveform } from "@/src/components/Waveform";
import { Body, Button, Caption, Screen, Title } from "@/src/components/ui";
import { EDGE } from "@/src/copy/edges";
import { useOlive } from "@/src/store/OliveProvider";
import { color, font, radius, space } from "@/src/theme/tokens";

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
        <View>
          <Title>Visit</Title>
          <Caption style={{ marginTop: 6 }}>
            {patient?.displayName ?? "Visit"}
            {patient?.reason ? ` · ${patient.reason.split("·")[0].trim()}` : ""}
          </Caption>
        </View>
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
          <Body style={styles.timer}>{clock}</Body>
          <View style={styles.listen}>
            <View style={[styles.dot, { backgroundColor: capturing && !paused ? color.sage : color.inkFaint }]} />
            <Caption>
              {gateError ? "Mic closed" : paused ? "Paused" : capturing ? "Listening" : "Mic closed"}
            </Caption>
          </View>
          <View style={{ marginTop: 18 }}>
            <Waveform active={capturing && !paused} />
          </View>
          {gateError ? (
            <Body style={{ color: color.refuse, textAlign: "center", marginTop: 16 }}>{gateError}</Body>
          ) : (
            <Pressable onPress={() => setSheet(true)} style={styles.transcript}>
              <Caption style={{ color: color.olive, fontFamily: font.uiMed }}>View transcript</Caption>
            </Pressable>
          )}
        </View>
        <View style={styles.bottom}>
          <SlideToEnd disabled={!capturing && !gateError} onComplete={() => void end()} />
          <View style={{ height: 10 }} />
          <Button
            label={paused ? "Resume" : "Pause"}
            variant="secondary"
            size="lg"
            disabled={!capturing}
            onPress={() => setPaused((p) => !p)}
          />
        </View>
        <TranscriptSheet visible={sheet} onClose={() => setSheet(false)} segments={segments} />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: space.lg, paddingBottom: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  timer: {
    fontFamily: font.display,
    fontSize: 80,
    lineHeight: 84,
    letterSpacing: -2.4,
    color: color.charcoal,
    fontWeight: "400",
  },
  listen: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  transcript: {
    marginTop: 22,
    backgroundColor: color.white,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  bottom: { paddingBottom: 8 },
  badBanner: {
    backgroundColor: color.warnSoft,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    marginTop: space.sm,
  },
  badRow: { marginTop: 6, flexDirection: "row", gap: 16 },
});
