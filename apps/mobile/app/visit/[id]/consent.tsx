import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Button, Caption, Screen, Title } from "@/src/components/ui";
import { AUDIO_DISCLOSURE } from "@/src/copy/consent";
import { useOlive } from "@/src/store/OliveProvider";
import { color, space } from "@/src/theme/tokens";

export default function ConsentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const olive = useOlive();
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "refuse" | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    <Screen>
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <Pressable onPress={() => router.back()}>
          <Caption style={{ color: color.olive }}>← Today</Caption>
        </Pressable>
        <View style={styles.body}>
          <Caption>{patient?.displayName ?? "Patient"}</Caption>
          <Title style={{ marginTop: 8 }}>{AUDIO_DISCLOSURE.shortTitle}</Title>
          <Body style={{ marginTop: 12, color: color.inkMuted }}>{AUDIO_DISCLOSURE.shortLead}</Body>
          {error ? <Body style={{ color: color.refuse, marginTop: 16 }}>{error}</Body> : null}
        </View>
        <View style={styles.actions}>
          <Button label="Agree" disabled={busy !== null} onPress={accept} />
          <Button label="Refuse" variant="refuse" disabled={busy !== null} onPress={refuse} />
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.md },
  body: { flex: 1, justifyContent: "center" },
  actions: { gap: 10 },
});
