import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ChatThreadView } from "@/src/api/types";
import { Body, Caption, Card, Screen, Title } from "@/src/components/ui";
import { useOlive } from "@/src/store/OliveProvider";
import { color, space } from "@/src/theme/tokens";

export default function ChatsScreen() {
  const olive = useOlive();
  const router = useRouter();
  const [threads, setThreads] = useState<ChatThreadView[]>([]);

  const load = useCallback(async () => {
    setThreads(await olive.listThreads());
  }, [olive.listThreads]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Caption>Clinic</Caption>
          <Title>Chats</Title>
          <Body style={{ color: color.inkMuted, marginTop: 8 }}>
            Secure threads after Send. Broader chat chrome is still deferred.
          </Body>
          <View style={{ marginTop: 20, gap: 12 }}>
            {threads.length === 0 ? (
              <Card>
                <Body>No secure threads yet. Send a follow-up from Swipe.</Body>
              </Card>
            ) : (
              threads.map((thread) => {
                const name =
                  olive.day.patients.find((p) => p.patientId === thread.patientId)?.displayName ?? "Patient";
                const last = thread.messages[thread.messages.length - 1];
                return (
                  <Pressable key={thread.id} onPress={() => router.push(`/thread/${thread.patientId}` as Href)}>
                    <Card>
                      <Caption>{name}</Caption>
                      <Body style={{ marginTop: 6 }} numberOfLines={3}>
                        {last?.body ?? "Secure thread"}
                      </Body>
                    </Card>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: 48 },
});
