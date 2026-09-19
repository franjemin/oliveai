import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { FollowUp } from "@/src/api/types";
import { Body, Button, Caption, Card, Screen, Title } from "@/src/components/ui";
import { clinicSmsFooter } from "@/src/copy/sms";
import { useOlive } from "@/src/store/OliveProvider";
import { color, space } from "@/src/theme/tokens";

export default function FollowUpsTab() {
  const olive = useOlive();
  const router = useRouter();
  const [items, setItems] = useState<FollowUp[]>([]);

  const pending = olive.pendingFollowUps;
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
          <Body style={{ color: color.inkMuted, marginTop: 8 }}>
            Same swipe queue as Finish day. SMS is labeled with clinic identity.
          </Body>
          <View style={{ marginTop: 20, gap: 12 }}>
            {items.length === 0 ? (
              <Card>
                <Body>No pending SMS. Finish a signed visit, or finish the day from Today.</Body>
              </Card>
            ) : (
              items.map((fu) => (
                <Card key={fu.id}>
                  <Caption>{olive.day.patients.find((p) => p.patientId === fu.patientId)?.displayName ?? "Patient"}</Caption>
                  <Body style={{ marginTop: 8 }}>{fu.body}</Body>
                  <Caption style={{ marginTop: 10 }}>{clinicSmsFooter(olive.clinic.smsIdentity)}</Caption>
                </Card>
              ))
            )}
          </View>
          <Button
            style={{ marginTop: 24 }}
            label="Open swipe"
            onPress={() => router.push("/swipe")}
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: 48 },
});
