import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/src/api";
import { startAmbientCapture } from "@/src/api/recordingGate";
import { api } from "@/src/api";
import type { TranscriptSegment } from "@/src/api/types";
import { PausePulse } from "@/src/components/PausePulse";
import { SlideToEnd } from "@/src/components/SlideToEnd";
import { TranscriptSheet } from "@/src/components/TranscriptSheet";
import { Body, Caption, Screen, Title } from "@/src/components/ui";
import { EDGE } from "@/src/copy/edges";
import { useOlive } from "@/src/store/OliveProvider";
import { truncate } from "@/src/theme/format";
import { color, font, radius, shadow, space } from "@/src/theme/tokens";

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

  const snippet = useMemo(() => {
    const patientSeg = segments.find((seg) => seg.speakerLabel === "speaker_patient");
    const text = patientSeg?.text ?? segments[0]?.text ?? "";
    return text ? truncate(text, 52) : capturing && !paused ? "Listening…" : "";
  }, [capturing, paused, segments]);

  const end = async () => {
    if (!id) return;
    await olive.endVisit(id);
    router.replace({
      pathname: "/",
      params: { saved: "draft", draftName: patient?.displayName ?? "" },
    });
  };

  return (
    <Screen>
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Title style={styles.patientName}>{patient?.displayName ?? "Visit"}</Title>
          <Caption style={styles.patientMeta}>{patient?.reason ?? "Visit"}</Caption>
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
          <PausePulse
            paused={paused}
            disabled={!capturing}
            onPress={() => setPaused((p) => !p)}
          />
          <View style={styles.listen}>
            <View
              style={[
                styles.dot,
                { backgroundColor: capturing && !paused ? color.sage : color.inkFaint },
              ]}
            />
            <Caption style={{ color: capturing && !paused ? color.olive : color.inkMuted }}>
              {gateError
                ? "Mic closed"
                : paused
                  ? EDGE.live.paused
                  : capturing
                    ? EDGE.live.listening
                    : "Mic closed"}
            </Caption>
          </View>
          {gateError ? (
            <Body style={{ color: color.refuse, textAlign: "center", marginTop: 16 }}>{gateError}</Body>
          ) : (
            <>
              {snippet ? (
                <View style={styles.snippet}>
                  <Caption style={styles.snippetKicker}>{EDGE.live.patient}</Caption>
                  <Body style={styles.snippetText}>{snippet}</Body>
                </View>
              ) : null}
              <Pressable onPress={() => setSheet(true)} style={styles.transcript}>
                <Caption style={{ color: color.olive, fontFamily: font.uiMed }}>
                  {EDGE.live.viewFull}
                </Caption>
              </Pressable>
            </>
          )}
        </View>
        <View style={styles.bottom}>
          <SlideToEnd disabled={!capturing && !gateError} onComplete={() => void end()} />
        </View>
        <TranscriptSheet visible={sheet} onClose={() => setSheet(false)} segments={segments} />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: space.lg, paddingBottom: 8 },
  header: { alignItems: "center", paddingTop: 4 },
  patientName: { textAlign: "center", fontSize: 28, lineHeight: 34 },
  patientMeta: { marginTop: 6, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  timer: {
    fontFamily: font.display,
    fontSize: 88,
    lineHeight: 92,
    letterSpacing: -2.6,
    color: color.charcoal,
    fontWeight: "400",
    marginBottom: 4,
  },
  listen: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  snippet: {
    alignSelf: "stretch",
    marginTop: 22,
    backgroundColor: color.white,
    borderRadius: radius.xl,
    paddingHorizontal: 18,
    paddingVertical: 14,
    ...shadow.glass,
  },
  snippetKicker: {
    color: color.olive,
    fontFamily: font.uiSemi,
    fontSize: 11,
    letterSpacing: 1.1,
  },
  snippetText: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: color.charcoal,
  },
  transcript: { marginTop: 16, paddingVertical: 6 },
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
