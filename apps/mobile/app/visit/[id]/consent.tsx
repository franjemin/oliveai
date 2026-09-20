import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Body, Button, Caption, Kicker, Title } from "@/src/components/ui";
import { AUDIO_DISCLOSURE, consentLead } from "@/src/copy/consent";
import { useOlive } from "@/src/store/OliveProvider";
import { color, font, radius, shadow, space } from "@/src/theme/tokens";

export default function ConsentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const olive = useOlive();
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "refuse" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [why, setWhy] = useState(false);
  const patient = olive.day.patients.find((p) => p.visitId === id);

  const accept = async () => {
    if (!id) return;
    setBusy("accept");
    setError(null);
    try {
      await olive.acceptConsent(id, "patient");
      router.replace(`/visit/${id}/live`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recording gate closed.");
    } finally {
      setBusy(null);
    }
  };

  const refuse = async () => {
    if (!id) return;
    setBusy("refuse");
    setError(null);
    try {
      await olive.refuseConsent(id, "patient");
      router.replace(`/visit/${id}/denied` as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record refuse.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.dim} onPress={() => router.back()}>
        <Caption style={styles.ghostBack}>Today</Caption>
      </Pressable>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Kicker style={{ color: color.sage }}>{AUDIO_DISCLOSURE.eyebrow}</Kicker>
        <Title style={{ marginTop: 8 }}>{AUDIO_DISCLOSURE.shortTitle}</Title>
        <Caption style={{ marginTop: 8 }}>
          {patient?.displayName ?? "Patient"}
          {patient?.reason ? ` · ${patient.reason.split("·")[0].trim()}` : ""}
        </Caption>
        <Body style={{ marginTop: 16, color: color.inkMuted }}>{consentLead(olive.user.name)}</Body>
        {error ? <Body style={{ color: color.refuse, marginTop: 12 }}>{error}</Body> : null}

        <Pressable onPress={() => setWhy((v) => !v)} style={styles.why}>
          <Caption style={{ color: color.sage, fontFamily: font.uiSemi }}>{AUDIO_DISCLOSURE.whyLink}</Caption>
        </Pressable>
        {why ? (
          <ScrollView style={styles.whyBox} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
            {AUDIO_DISCLOSURE.points.map((point) => (
              <View key={point.heading}>
                <Caption style={{ color: color.charcoal, fontFamily: font.uiSemi }}>{point.heading}</Caption>
                <Caption style={{ marginTop: 2 }}>{point.body}</Caption>
              </View>
            ))}
          </ScrollView>
        ) : null}

        <Caption style={styles.agree}>{AUDIO_DISCLOSURE.agreeMicrocopy}</Caption>
        <Button label={AUDIO_DISCLOSURE.startCta} disabled={busy !== null} onPress={accept} />
        <Pressable onPress={refuse} disabled={busy !== null} style={styles.refuse}>
          <Caption style={{ color: color.inkFaint, textAlign: "center" }}>{AUDIO_DISCLOSURE.refuseCta}</Caption>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "rgba(44, 43, 40, 0.18)", justifyContent: "flex-end" },
  dim: { flex: 1, justifyContent: "flex-start", paddingHorizontal: space.lg, paddingTop: 18 },
  ghostBack: { color: "rgba(44, 43, 40, 0.28)", fontSize: 22, fontFamily: font.displayBold },
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
  why: { alignSelf: "center", paddingVertical: 16 },
  whyBox: { maxHeight: 160, marginBottom: 8 },
  agree: { textAlign: "center", marginBottom: 12 },
  refuse: { paddingVertical: 14 },
});
