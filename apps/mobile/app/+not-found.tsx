import { Link, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Body, Title } from "@/src/components/ui";
import { color, space } from "@/src/theme/tokens";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Olive" }} />
      <View style={styles.container}>
        <Title>This screen isn’t in Core.</Title>
        <Link href="/" style={styles.link}>
          <Body style={{ color: color.olive }}>Back to Today</Body>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: space.lg, backgroundColor: color.mist },
  link: { marginTop: 16 },
});
