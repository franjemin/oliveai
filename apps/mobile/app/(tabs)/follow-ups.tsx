import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { FollowUp } from "@/src/api/types";
import { Body, Button, Caption, Card, Screen, Title } from "@/src/components/ui";
import { EDGE } from "@/src/copy/edges";
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
          <View style={{ marginTop: 20, gap: 12 }}>
            {items.length === 0 ? (
              <Body style={{ color: color.inkMuted }}>{EDGE.emptySwipe.body}</Body>
            ) : (
              items.map((fu) => (
                <Pressable key={fu.id} onPress={() => router.push("/swipe")}>
                  <Card>
                    <Caption>
                      {olive.day.patients.find((p) => p.patientId === fu.patientId)?.displayName ?? "Patient"}
                    </Caption>
                    <Body style={{ marginTop: 8 }} numberOfLines={3}>
                      {fu.body}
                    </Body>
                  </Card>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
        {items.length > 0 ? (
          <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
            <Button label="Review" onPress={() => router.push("/swipe")} />
          </View>
        ) : null}
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: 48 },
});
