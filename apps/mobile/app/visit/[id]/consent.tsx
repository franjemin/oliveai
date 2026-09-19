import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ConsentParty } from "@/src/api/types";
import { Body, Button, Caption, Mono, Pill, Screen, Title } from "@/src/components/ui";
import { AUDIO_DISCLOSURE } from "@/src/copy/consent";
import { useOlive } from "@/src/store/OliveProvider";
import { color, radius, space } from "@/src/theme/tokens";

export default function ConsentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const olive = useOlive();
  const router = useRouter();
  const [party, setParty] = useState<ConsentParty>("patient");
  const [busy, setBusy] = useState<"accept" | "refuse" | null>(null);
  const [error, setError] = useState<string | null>(null);
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
          <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
            <Caption style={{ color: color.olive }}>← Today</Caption>
          </Pressable>
          <Caption>Per-visit consent · {patient?.displayName ?? "Patient"}</Caption>
          <Title style={{ marginTop: 6 }}>{AUDIO_DISCLOSURE.title}</Title>
          <Body style={{ marginTop: 10, color: color.inkMuted }}>{AUDIO_DISCLOSURE.lead}</Body>
          <View style={styles.idRow}>
            <Pill label="Versioned disclosure" tone="olive" />
            <Mono>{AUDIO_DISCLOSURE.id}</Mono>
          </View>

          <View style={{ marginTop: 22, gap: 16 }}>
            {AUDIO_DISCLOSURE.points.map((pt) => (
              <View key={pt.heading}>
                <Caption style={{ color: color.oliveInk }}>{pt.heading}</Caption>
                <Body style={{ marginTop: 4 }}>{pt.body}</Body>
              </View>
            ))}
          </View>

          <Caption style={{ marginTop: 24 }}>Whose consent</Caption>
          <View style={styles.partyRow}>
            <PartyChip label="Patient" active={party === "patient"} onPress={() => setParty("patient")} />
            <PartyChip label="Substitute decision-maker" active={party === "sdm"} onPress={() => setParty("sdm")} />
          </View>

          {error ? (
            <Body style={{ color: color.refuse, marginTop: 16 }}>{error}</Body>
          ) : (
            <Caption style={{ marginTop: 16 }}>
              Microphone stays closed until Accept succeeds and recording-gate returns allowed.
            </Caption>
          )}
        </ScrollView>
        <View style={styles.actions}>
          <Button label="Start recording" disabled={busy !== null} onPress={accept} />
          <Caption style={{ textAlign: "center" }}>
            By starting, you confirm they agreed to this visit’s AI scribe.
          </Caption>
          <Button label="Refuse recording" variant="refuse" disabled={busy !== null} onPress={refuse} />
        </View>
      </SafeAreaView>
    </Screen>
  );
}

function PartyChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? color.okSoft : color.white, borderColor: active ? color.oliveSoft : color.line },
      ]}
    >
      <Caption style={{ color: active ? color.oliveInk : color.inkMuted }}>{label}</Caption>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: 24 },
  idRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, flexWrap: "wrap" },
  partyRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actions: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: 10 },
});
