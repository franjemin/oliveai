import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { color, font, radius, shadow } from "@/src/theme/tokens";

const ITEMS: { href: Href; label: string; key: string }[] = [
  { href: "/", label: "Today", key: "today" },
  { href: "/follow-ups", label: "Follow-ups", key: "follow-ups" },
  { href: "/chats", label: "Chats", key: "chats" },
  { href: "/patients", label: "Patients", key: "patients" },
];

export function Dock({ active }: { active: "today" | "follow-ups" | "chats" | "patients" }) {
  const router = useRouter();
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.pill}>
        {ITEMS.map((item) => {
          const on = item.key === active;
          return (
            <Pressable
              key={item.key}
              onPress={() => router.replace(item.href)}
              style={[styles.item, on && styles.itemOn]}
            >
              <Text style={[styles.label, on && styles.labelOn]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.white,
    borderRadius: radius.pill,
    padding: 5,
    ...shadow.float,
  },
  item: {
    flex: 1,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  itemOn: {
    backgroundColor: color.paper,
  },
  label: {
    fontFamily: font.ui,
    fontSize: 12,
    color: color.inkFaint,
  },
  labelOn: {
    fontFamily: font.uiSemi,
    color: color.charcoal,
  },
});
