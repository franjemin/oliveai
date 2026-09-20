import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Button, Caption, Card, Display, Kicker, Pill, Screen } from "@/src/components/ui";
import { DraftToast } from "@/src/components/DraftToast";
import { OliveWordmark } from "@/src/components/OliveMark";
import { EDGE, draftsWaitingLabel, signDraftsBody } from "@/src/copy/edges";
import { useOlive } from "@/src/store/OliveProvider";
import { prettyTime, shortReason, weekdayStamp } from "@/src/theme/format";
import { color, font, radius, space } from "@/src/theme/tokens";
import type { DayPatient } from "@/src/api/types";

export default function TodayScreen() {
  const olive = useOlive();
  const router = useRouter();
  const { saved, draftName } = useLocalSearchParams<{ saved?: string; draftName?: string }>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toastName, setToastName] = useState<string | null>(null);
  const unsigned = olive.day.patients.filter((row) => row.unsignedDraft);
  const unsignedCount = unsigned.length;

  const refreshDay = olive.refreshDay;
  useFocusEffect(
    useCallback(() => {
      void refreshDay();
    }, [refreshDay]),
  );

  useEffect(() => {
    if (saved !== "draft") return;
    setToastName(typeof draftName === "string" && draftName ? draftName : "Visit");
    const t = setTimeout(() => setToastName(null), 2800);
    return () => clearTimeout(t);
  }, [draftName, saved]);

  const { next, later } = useMemo(() => {
    const open = olive.day.patients.filter(
      (row) => row.visitStatus !== "completed" && row.recording !== "captured" && row.recording !== "declined",
    );
    const nextUp = open[0] ?? null;
    return {
      next: nextUp,
      later: open.filter((row) => row.patientId !== nextUp?.patientId),
    };
  }, [olive.day.patients]);

  const open = async (row: DayPatient) => {
    setBusyId(row.patientId);
    try {
      const visit = row.visitId
        ? await olive.getVisit(row.visitId)
        : await olive.openVisit(row.patientId);
      if (row.recording === "live") {
        router.replace(`/visit/${visit.id}/live`);
        return;
      }
      if (row.visitStatus === "completed" || row.recording === "captured" || row.recording === "declined") {
        router.replace({
          pathname: "/visit/[id]/note",
          params: { id: visit.id, from: unsignedCount > 0 ? "day" : undefined },
        } as Href);
        return;
      }
      router.replace(`/visit/${visit.id}/consent`);
    } finally {
      setBusyId(null);
    }
  };

  const finishDay = async () => {
    const result = await olive.finishDay();
    if (result.unsignedDrafts && result.unsignedDrafts.length > 0) {
      router.replace("/notes-to-sign");
      return;
    }
    router.replace("/follow-ups");
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
              <Kicker>Next up · {prettyTime(next.time)}</Kicker>
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
          ) : unsignedCount > 0 ? (
            <View style={{ marginTop: 22 }}>
              <View style={styles.doneChip}>
                <Caption style={{ color: color.olive, fontFamily: font.uiMed }}>
                  {draftsWaitingLabel(unsignedCount)}
                </Caption>
              </View>
              <Card style={{ marginTop: 18 }}>
                <Kicker style={{ color: color.olive }}>{EDGE.endOfDay}</Kicker>
                <Body style={[styles.heroName, { marginTop: 8 }]}>{EDGE.finishDay}</Body>
                <Caption style={{ marginTop: 8 }}>{signDraftsBody(unsignedCount)}</Caption>
                <View style={{ marginTop: 22 }}>
                  <Button label={EDGE.finishDay} onPress={() => void finishDay()} />
                </View>
              </Card>
            </View>
          ) : (
            <View style={{ marginTop: 28 }}>
              <Kicker>Day</Kicker>
              <Card style={{ marginTop: 12 }}>
                <Body style={styles.heroName}>Ready to close</Body>
                <Caption style={{ marginTop: 6 }}>Send follow-ups after notes are signed.</Caption>
                <View style={{ marginTop: 22 }}>
                  <Button label={EDGE.finishDay} onPress={() => void finishDay()} />
                </View>
              </Card>
            </View>
          )}

          {next && later.length > 0 ? (
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

          {!next && unsignedCount > 0 ? (
            <View style={{ marginTop: 36 }}>
              <Kicker>{EDGE.unsignedDrafts}</Kicker>
              <View style={{ marginTop: 8 }}>
                {unsigned.map((row) => (
                  <Pressable
                    key={row.patientId}
                    onPress={() => open(row)}
                    disabled={busyId === row.patientId}
                    style={styles.laterRow}
                  >
                    <Caption style={styles.laterTime}>{prettyTime(row.time)}</Caption>
                    <Body style={styles.laterName}>{row.displayName}</Body>
                    <Pill label={EDGE.draftPill} tone="olive" />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {next && unsignedCount > 0 ? (
            <View style={{ marginTop: 28 }}>
              <Button label={EDGE.finishDay} variant="outline" onPress={() => void finishDay()} />
            </View>
          ) : null}
        </ScrollView>
        {toastName ? <DraftToast name={toastName} /> : null}
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
  doneChip: {
    alignSelf: "flex-start",
    backgroundColor: color.okSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
