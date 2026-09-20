import { Stack } from "expo-router";
import { Platform } from "react-native";

import { color } from "@/src/theme/tokens";

export default function VisitLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.paper },
        animation: Platform.OS === "web" ? "none" : "default",
      }}
    />
  );
}
