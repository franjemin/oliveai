import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Button, Caption, Screen, Title } from "@/src/components/ui";
import { EDGE } from "@/src/copy/edges";
import { useOlive } from "@/src/store/OliveProvider";
import { space } from "@/src/theme/tokens";

export default function ConsentDeniedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const olive = useOlive();
  const router = useRouter();
  const patient = olive.day.patients.find((p) => p.visitId === id);

  return (
    <Screen>
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Caption>{patient?.displayName ?? "Visit"}</Caption>
          <Title style={{ marginTop: 8 }}>{EDGE.consentDenied.title}</Title>
          <Body style={{ marginTop: 12, color: "#2C2B288F" }}>{EDGE.consentDenied.body}</Body>
        </View>
        <Button
          label={EDGE.consentDenied.cta}
          onPress={() => router.replace({ pathname: "/", params: { saved: "draft" } })}
        />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.lg },
});
