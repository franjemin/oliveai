import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MagicInbox } from "@/src/api/types";
import { Body, Button, Caption, Card, Screen, Title } from "@/src/components/ui";
import { useOlive } from "@/src/store/OliveProvider";
import { color, space } from "@/src/theme/tokens";

export default function PatientInboxScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const olive = useOlive();
  const router = useRouter();
  const [inbox, setInbox] = useState<MagicInbox | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void olive
      .getInbox(token)
      .then(setInbox)
      .catch((err) => setError(err instanceof Error ? err.message : "Inbox unavailable"));
  }, [olive, token]);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Caption>Patient inbox · magic link</Caption>
          <Title style={{ marginTop: 6 }}>{inbox?.clinicName ?? "Secure message"}</Title>
          <Caption style={{ marginTop: 6 }}>
            {inbox
              ? inbox.patientName
                ? `For ${inbox.patientName}`
                : inbox.stub
                  ? "Magic-link inbox stub"
                  : "In-app message"
              : "Opening secure message…"}
          </Caption>
          {error ? <Body style={{ color: color.refuse, marginTop: 16 }}>{error}</Body> : null}
          <View style={{ marginTop: 20, gap: 12 }}>
            {inbox?.messages.map((msg) => (
              <Card key={msg.id}>
                <Caption>{msg.authorType === "staff" ? inbox.clinicName : inbox.patientName}</Caption>
                <Body style={{ marginTop: 8 }}>{msg.body}</Body>
              </Card>
            ))}
            {inbox && inbox.messages.length === 0 ? <Body>No messages yet.</Body> : null}
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
          <Button label="Back" variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: 32 },
});
