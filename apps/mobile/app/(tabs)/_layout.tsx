import { Tabs } from "expo-router";

import { Dock } from "@/src/components/Dock";
import { color } from "@/src/theme/tokens";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={({ state }) => {
        const name = state.routes[state.index]?.name ?? "index";
        const active =
          name === "follow-ups" ? "follow-ups" : name === "chats" ? "chats" : name === "patients" ? "patients" : "today";
        return <Dock active={active} />;
      }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="follow-ups" options={{ title: "Follow-ups" }} />
      <Tabs.Screen name="chats" options={{ title: "Chats" }} />
      <Tabs.Screen name="patients" options={{ title: "Patients" }} />
    </Tabs>
  );
}
