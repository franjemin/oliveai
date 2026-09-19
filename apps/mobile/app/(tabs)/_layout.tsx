import { Tabs } from "expo-router";
import { Platform, Text } from "react-native";

import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { color } from "@/src/theme/tokens";

function Glyph({ mark, tint }: { mark: string; tint: string }) {
  return <Text style={{ color: tint, fontSize: 16, fontWeight: "700" }}>{mark}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: color.olive,
        tabBarInactiveTintColor: color.inkFaint,
        tabBarStyle: {
          backgroundColor: color.paper,
          borderTopColor: color.line,
          height: Platform.OS === "web" ? 64 : 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerShown: useClientOnlyValue(false, false),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color: tint }) => <Glyph mark="●" tint={String(tint)} />,
        }}
      />
      <Tabs.Screen
        name="follow-ups"
        options={{
          title: "Follow-ups",
          tabBarIcon: ({ color: tint }) => <Glyph mark="↔" tint={String(tint)} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          tabBarIcon: ({ color: tint }) => <Glyph mark="◯" tint={String(tint)} />,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: "Patients",
          tabBarIcon: ({ color: tint }) => <Glyph mark="☰" tint={String(tint)} />,
        }}
      />
    </Tabs>
  );
}
