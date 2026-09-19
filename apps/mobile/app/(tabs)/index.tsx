import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Button, Caption, Card, Display, Kicker, Screen } from "@/src/components/ui";
import { OliveWordmark } from "@/src/components/OliveMark";
import { useOlive } from "@/src/store/OliveProvider";
import { prettyTime, shortReason, weekdayStamp } from "@/src/theme/format";
import { color, font, space } from "@/src/theme/tokens";
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

  const { next, later } = useMemo(() => {
    const open = olive.day.patients.filter(
      (row) => row.visitStatus !== "completed" && row.recording !== "captured",
    );
    const nextUp = open[0] ?? null;
    return {
      next: nextUp,
      later: olive.day.patients.filter((row) => row.patientId !== nextUp?.patientId),
    };
  }, [olive.day.patients]);

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
          <View style={styles.top}>
            <OliveWordmark />
            <Caption>{weekdayStamp()}</Caption>
          </View>
          <Display
            onLongPress={() => {
              void olive.resetDemo();
            }}
            style={styles.today}
          >
            Today
          </Display>
          {olive.sessionError ? (
            <Body style={{ color: color.refuse, marginTop: 10 }}>{olive.sessionError}</Body>
          ) : null}

          {next ? (
            <View style={{ marginTop: 28 }}>
              <Kicker>
                Next up · {prettyTime(next.time)}
              </Kicker>
              <Card style={{ marginTop: 12 }}>
                <Body style={styles.heroName}>{next.displayName}</Body>
                <Caption style={{ marginTop: 6 }}>{next.reason ?? "Visit"}</Caption>
                <View style={{ marginTop: 22 }}>
                  <Button
                    label="Start"
                    disabled={busyId === next.patientId}
                    onPress={() => open(next)}
                  />
                </View>
              </Card>
            </View>
          ) : null}

          {later.length > 0 ? (
            <View style={{ marginTop: 36 }}>
              <Kicker>Later</Kicker>
              <View style={{ marginTop: 8 }}>
                {later.map((row) => (
                  <Pressable
                    key={row.patientId}
                    onPress={() => open(row)}
                    disabled={busyId === row.patientId}
                    style={styles.laterRow}
                  >
                    <Caption style={styles.laterTime}>{prettyTime(row.time)}</Caption>
                    <Body style={styles.laterName}>{row.displayName}</Body>
                    <Caption style={styles.laterReason}>{shortReason(row.reason)}</Caption>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingTop: 8, paddingBottom: 120 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  today: { marginTop: 22 },
  heroName: {
    fontFamily: font.displayBold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  laterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
    gap: 14,
  },
  laterTime: { width: 52, color: color.inkFaint },
  laterName: { flex: 1, fontFamily: font.uiMed, fontSize: 16 },
  laterReason: { color: color.inkFaint },
});
