import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { FollowUp } from "@/src/api/types";
import { Body, Button, Caption, Card, Pill, Screen, Title } from "@/src/components/ui";
import { SECURE_SEND_MICROCOPY } from "@/src/copy/messaging";
import { useOlive } from "@/src/store/OliveProvider";
import { color, space } from "@/src/theme/tokens";

export default function FollowUpsTab() {
  const olive = useOlive();
  const router = useRouter();
  const pending = olive.pendingFollowUps;
  const [items, setItems] = useState<FollowUp[]>([]);

  const load = useCallback(async () => {
    setItems(await pending());
  }, [pending]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Caption>End of day</Caption>
          <Title>Follow-ups</Title>
          <Body style={{ color: color.inkMuted, marginTop: 8 }}>{SECURE_SEND_MICROCOPY}</Body>
          <View style={{ marginTop: 20, gap: 12 }}>
            {items.length === 0 ? (
              <Card>
                <Title>All caught up</Title>
                <Body style={{ marginTop: 8 }}>No pending follow-ups. Finish a signed visit from Today.</Body>
              </Card>
            ) : (
              items.map((fu) => (
                <Card key={fu.id}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Caption>
                      {olive.day.patients.find((p) => p.patientId === fu.patientId)?.displayName ?? "Patient"}
                    </Caption>
                    <Pill label="Secure message" tone="olive" />
                  </View>
                  <Body style={{ marginTop: 8 }}>{fu.body}</Body>
                </Card>
              ))
            )}
          </View>
          <Button style={{ marginTop: 24 }} label="Open swipe" onPress={() => router.push("/swipe")} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: 48 },
});
