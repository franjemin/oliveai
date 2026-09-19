import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Button, Caption, Card, Display, Pill, Screen } from "@/src/components/ui";
import { useOlive } from "@/src/store/OliveProvider";
import { color, space } from "@/src/theme/tokens";
import type { DayPatient } from "@/src/api/types";

export default function TodayScreen() {
  const olive = useOlive();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const refreshDay = olive.refreshDay;
  useFocusEffect(
    useCallback(() => {
      void refreshDay();
    }, [refreshDay]),
  );

  const open = async (row: DayPatient) => {
    setBusyId(row.patientId);
    try {
      const visit = row.visitId
        ? await olive.getVisit(row.visitId)
        : await olive.openVisit(row.patientId);
      if (row.recording === "live") {
        router.push(`/visit/${visit.id}/live`);
        return;
      }
      if (row.visitStatus === "completed") {
        router.push(`/visit/${visit.id}/note`);
        return;
      }
      router.push(`/visit/${visit.id}/consent`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.pad}>
          <View style={styles.mist} />
          <Caption>Harbourfront Dental</Caption>
          <Display
            onLongPress={() => {
              void olive.resetDemo();
            }}
          >
            Today
          </Display>
          {olive.sessionError ? (
            <Body style={{ color: color.refuse, marginTop: 10 }}>{olive.sessionError}</Body>
          ) : null}

          <View style={{ gap: 12, marginTop: 28 }}>
            {olive.day.patients.map((row) => (
              <Pressable key={row.patientId} onPress={() => open(row)} disabled={busyId === row.patientId}>
                <Card>
                  <View style={styles.cardTop}>
                    <Caption>{row.time ?? "—"}</Caption>
                    <StatusChip row={row} />
                  </View>
                  <Body style={{ fontWeight: "600", fontSize: 18, marginTop: 4 }}>{row.displayName}</Body>
                  {row.reason ? <Caption style={{ marginTop: 2 }}>{row.reason}</Caption> : null}
                </Card>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 32 }}>
            <Button
              label="Finish day"
              variant="ghost"
              onPress={async () => {
                await olive.finishDay();
                router.push("/swipe");
              }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function StatusChip({ row }: { row: DayPatient }) {
  if (row.recording === "declined") return <Pill label="Declined" tone="refuse" />;
  if (row.recording === "live") return <Pill label="Live" tone="olive" />;
  if (row.recording === "captured" || row.visitStatus === "completed") return <Pill label="Done" tone="mist" />;
  if (row.visitStatus === "in_progress") return <Pill label="Next" tone="olive" />;
  return <Pill label="Later" tone="mist" />;
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: 48 },
  mist: {
    position: "absolute",
    top: -40,
    left: -20,
    right: -20,
    height: 220,
    backgroundColor: color.mistWash,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
