import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";

import { Body, Caption, Screen, Title } from "@/src/components/ui";
import { color, space } from "@/src/theme/tokens";

export default function PatientsShell() {
  return (
    <Screen>
      <SafeAreaView style={styles.pad} edges={["top"]}>
        <Caption>Deferred</Caption>
        <Title>Patients</Title>
        <View style={{ marginTop: 16 }}>
          <Body style={{ color: color.inkMuted }}>
            Chart chrome, memories, and PMS profiles are out of the Sep 22 demo. Today is the visit spine.
          </Body>
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.lg },
});
