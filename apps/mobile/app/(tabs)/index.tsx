import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Button, Caption, Card, Display, Pill, Screen } from "@/src/components/ui";
import { CORE_WALKTHROUGH } from "@/src/api/walkthrough";
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

  const finish = async () => {
    await olive.finishDay();
    router.push("/swipe");
  };

  const openCoreWalkthrough = async () => {
    const seeded =
      olive.day.patients.find((p) => p.visitId === CORE_WALKTHROUGH.visitId) ??
      olive.day.patients.find((p) => p.patientId === CORE_WALKTHROUGH.patientId);
    if (seeded) {
      await open(seeded);
      return;
    }
    setBusyId(CORE_WALKTHROUGH.patientId);
    try {
      const visit = await olive.getVisit(CORE_WALKTHROUGH.visitId);
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
          <Caption>Harbourfront Dental · Saturday</Caption>
          <Display>Today</Display>
          <Body style={{ color: color.inkMuted, marginTop: 6 }}>
            {olive.user.name} · {olive.day.date}
          </Body>
          <View style={styles.row}>
            <Pill label="Demo" tone="mist" />
            <Pill label={CORE_WALKTHROUGH.loginEmail} tone="mist" />
          </View>
          {olive.sessionError ? (
            <Body style={{ color: color.refuse, marginTop: 10 }}>{olive.sessionError}</Body>
          ) : (
            <Caption style={{ marginTop: 8 }}>
              Signed in · continue {CORE_WALKTHROUGH.patientName} · {CORE_WALKTHROUGH.visitId.slice(-4)}
            </Caption>
          )}

          <View style={{ marginTop: 20 }}>
            <Button
              label={`Continue ${CORE_WALKTHROUGH.patientName}`}
              disabled={busyId === CORE_WALKTHROUGH.patientId}
              onPress={openCoreWalkthrough}
            />
          </View>

          <View style={{ gap: 12, marginTop: 20 }}>
            {olive.day.patients.map((row) => (
              <Pressable key={row.patientId} onPress={() => open(row)} disabled={busyId === row.patientId}>
                <Card>
                  <View style={styles.cardTop}>
                    <Caption>{row.time ?? "—"}</Caption>
                    <StatusChip row={row} />
                  </View>
                  <Body style={{ fontWeight: "600", fontSize: 18, marginTop: 4 }}>{row.displayName}</Body>
                  {row.reason ? <Caption style={{ marginTop: 2 }}>{row.reason}</Caption> : null}
                  <Caption style={{ marginTop: 10, color: color.olive }}>
                    {ctaLabel(row)}
                  </Caption>
                </Card>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 28, gap: 10 }}>
            <Button label="Finish day" onPress={finish} />
            <Button label="Reset demo" variant="ghost" onPress={() => olive.resetDemo()} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function StatusChip({ row }: { row: DayPatient }) {
  if (row.recording === "declined") return <Pill label="Recording declined" tone="refuse" />;
  if (row.recording === "live") return <Pill label="Live" tone="olive" />;
  if (row.recording === "captured") return <Pill label="Recorded" tone="olive" />;
  if (row.visitStatus === "completed") return <Pill label="Done" tone="mist" />;
  if (row.visitStatus === "in_progress") return <Pill label="In chair" tone="warn" />;
  return <Pill label="Scheduled" tone="mist" />;
}

function ctaLabel(row: DayPatient) {
  if (row.recording === "live") return "Continue live visit";
  if (row.visitStatus === "completed") return "Open note";
  if (row.visitStatus === "in_progress") return "Consent, then start";
  return "Start visit";
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
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
