import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";

import { Body, Screen, Title } from "@/src/components/ui";
import { color, space } from "@/src/theme/tokens";

export default function PatientsShell() {
  return (
    <Screen>
      <SafeAreaView style={styles.pad} edges={["top"]}>
        <Title>Patients</Title>
        <View style={{ marginTop: 16 }}>
          <Body style={{ color: color.inkMuted }}>Use Today to open a visit.</Body>
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingHorizontal: space.lg, paddingTop: 8 },
});
