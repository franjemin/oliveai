import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ChatMessage } from "@/src/api/types";
import { Body, Button, Caption, Card, Screen, Title } from "@/src/components/ui";
import { useOlive } from "@/src/store/OliveProvider";
import { color, space } from "@/src/theme/tokens";

export default function SecureThreadScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const olive = useOlive();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const patient = olive.day.patients.find((p) => p.patientId === patientId);

  useEffect(() => {
    if (!patientId) return;
    void olive.getChat(patientId).then((res) => setMessages(res.messages));
  }, [olive, patientId]);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Caption>Secure thread</Caption>
          <Title style={{ marginTop: 6 }}>{patient?.displayName ?? "Patient"}</Title>
          <View style={{ marginTop: 20, gap: 12 }}>
            {messages.length === 0 ? (
              <Body style={{ color: color.inkMuted }}>No secure messages yet.</Body>
            ) : (
              messages.map((msg) => (
                <Card key={msg.id}>
                  <Caption>{msg.authorType === "staff" ? olive.user.name : patient?.displayName}</Caption>
                  <Body style={{ marginTop: 8 }}>{msg.body}</Body>
                </Card>
              ))
            )}
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
