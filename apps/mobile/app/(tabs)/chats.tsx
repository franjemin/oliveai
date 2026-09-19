import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";

import { Body, Caption, Screen, Title } from "@/src/components/ui";
import { color, space } from "@/src/theme/tokens";

export default function ChatsShell() {
  return (
    <Screen>
      <SafeAreaView style={styles.pad} edges={["top"]}>
        <Caption>Deferred</Caption>
        <Title>Chats</Title>
        <View style={{ marginTop: 16 }}>
          <Body style={{ color: color.inkMuted }}>
            In-app threads land after the clinic demo. Prefer chat over SMS for PHI — this tab is a shell only.
          </Body>
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.lg },
});
