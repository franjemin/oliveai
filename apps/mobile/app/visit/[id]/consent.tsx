import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ConsentParty } from "@/src/api/types";
import { Body, Button, Caption, Screen, Title } from "@/src/components/ui";
import { AUDIO_DISCLOSURE } from "@/src/copy/consent";
import { useOlive } from "@/src/store/OliveProvider";
import { color, space } from "@/src/theme/tokens";

export default function ConsentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const olive = useOlive();
  const router = useRouter();
  const [party, setParty] = useState<ConsentParty>("patient");
  const [busy, setBusy] = useState<"accept" | "refuse" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [why, setWhy] = useState(false);
  const [sdm, setSdm] = useState(false);
  const patient = olive.day.patients.find((p) => p.visitId === id);

  const accept = async () => {
    if (!id) return;
    setBusy("accept");
    setError(null);
    try {
      await olive.acceptConsent(id, party);
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
      await olive.refuseConsent(id, party);
      router.replace(`/visit/${id}/denied` as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record refuse.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Pressable onPress={() => router.back()}>
            <Caption style={{ color: color.olive }}>← Today</Caption>
          </Pressable>
          <Caption style={{ marginTop: 16 }}>{patient?.displayName ?? "Patient"}</Caption>
          <Title style={{ marginTop: 6 }}>{AUDIO_DISCLOSURE.title}</Title>
          <Body style={{ marginTop: 12, color: color.inkMuted }}>{AUDIO_DISCLOSURE.lead}</Body>

          <Pressable onPress={() => setWhy((v) => !v)} style={{ marginTop: 20 }}>
            <Caption style={{ color: color.olive }}>{why ? "Hide details" : "Why we ask"}</Caption>
          </Pressable>
          {why ? (
            <View style={{ marginTop: 14, gap: 14 }}>
              {AUDIO_DISCLOSURE.points.map((pt) => (
                <View key={pt.heading}>
                  <Caption style={{ color: color.oliveInk }}>{pt.heading}</Caption>
                  <Body style={{ marginTop: 4 }}>{pt.body}</Body>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable onPress={() => setSdm((v) => !v)} style={{ marginTop: 18 }}>
            <Caption style={{ color: color.inkFaint }}>{sdm ? "Consent is for the patient" : "Not the patient?"}</Caption>
          </Pressable>
          {sdm ? (
            <Pressable onPress={() => setParty(party === "sdm" ? "patient" : "sdm")} style={{ marginTop: 8 }}>
              <Caption style={{ color: color.olive }}>
                {party === "sdm" ? "Using substitute decision-maker" : "Use substitute decision-maker"}
              </Caption>
            </Pressable>
          ) : null}

          {error ? <Body style={{ color: color.refuse, marginTop: 16 }}>{error}</Body> : null}
        </ScrollView>
        <View style={styles.actions}>
          <Button label="Start recording" disabled={busy !== null} onPress={accept} />
          <Pressable onPress={refuse} disabled={busy !== null} style={styles.refuse}>
            <Caption style={{ color: color.refuse, textAlign: "center" }}>Refuse recording</Caption>
          </Pressable>
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: 24 },
  actions: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: 8 },
  refuse: { paddingVertical: 12 },
});
