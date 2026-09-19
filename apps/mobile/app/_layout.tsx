import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { PhoneShell } from "@/src/components/PhoneShell";
import { OliveProvider } from "@/src/store/OliveProvider";
import { color } from "@/src/theme/tokens";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <OliveProvider>
      <PhoneShell>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.mist },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="visit/[id]" />
          <Stack.Screen name="swipe" />
          <Stack.Screen name="thread/[patientId]" />
          <Stack.Screen name="inbox/[token]" />
        </Stack>
      </PhoneShell>
    </OliveProvider>
  );
}
