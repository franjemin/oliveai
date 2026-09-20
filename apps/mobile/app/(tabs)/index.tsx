import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Button, Caption, Card, Display, Kicker, Screen } from "@/src/components/ui";
import { OliveWordmark } from "@/src/components/OliveMark";
import { EDGE } from "@/src/copy/edges";
import { useOlive } from "@/src/store/OliveProvider";
import { prettyTime, shortReason, weekdayStamp } from "@/src/theme/format";
import { color, font, radius, shadow, space } from "@/src/theme/tokens";
import type { DayPatient } from "@/src/api/types";

export default function TodayScreen() {
  const olive = useOlive();
  const router = useRouter();
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [unsignedCount, setUnsignedCount] = useState(0);

  const refreshDay = olive.refreshDay;
  const unsignedNotes = olive.unsignedNotes;
  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await refreshDay();
        const unsigned = await unsignedNotes();
        setUnsignedCount(unsigned.length);
      })();
    }, [refreshDay, unsignedNotes]),
  );

  useEffect(() => {
    if (saved !== "draft") return;
    setToast(EDGE.draftSaved);
    const t = setTimeout(() => {
      setToast(null);
      router.setParams({ saved: undefined });
    }, 2200);
    return () => clearTimeout(t);
  }, [router, saved]);

  const { next, later } = useMemo(() => {
    const open = olive.day.patients.filter(
      (row) => row.visitStatus !== "completed" && row.recording !== "captured" && row.recording !== "declined",
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
      if (row.visitStatus === "completed" || row.recording === "captured" || row.recording === "declined") {
        const note = await olive.getNote(visit.id).catch(() => null);
        router.push(note?.status === "signed" ? `/visit/${visit.id}/signed` : `/visit/${visit.id}/note`);
        return;
      }
      router.push(`/visit/${visit.id}/consent`);
    } finally {
      setBusyId(null);
    }
  };

  const finishDay = async () => {
    const unsigned = await olive.unsignedNotes();
    if (unsigned[0]) {
      router.push({
        pathname: "/visit/[id]/note",
        params: { id: unsigned[0].visitId, from: "day" },
      } as Href);
      return;
    }
    await olive.finishDay();
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
          ) : unsignedCount > 0 ? (
            <View style={{ marginTop: 28 }}>
              <Kicker>{EDGE.notesToSign.kicker}</Kicker>
              <Card style={{ marginTop: 12 }}>
                <Body style={styles.heroName}>
                  {unsignedCount} note{unsignedCount === 1 ? "" : "s"} ready to sign
                </Body>
                <Caption style={{ marginTop: 6 }}>Sign at end of day, then send follow-ups.</Caption>
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

          {next && unsignedCount > 0 ? (
            <View style={{ marginTop: 28 }}>
              <Button label={EDGE.finishDay} variant="outline" onPress={() => void finishDay()} />
            </View>
          ) : null}
        </ScrollView>
        {toast ? (
          <View style={styles.toast} pointerEvents="none" accessibilityLiveRegion="polite">
            <Caption style={{ color: color.charcoal, fontFamily: font.uiMed, textAlign: "center" }}>{toast}</Caption>
          </View>
        ) : null}
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
  toast: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    bottom: 96,
    backgroundColor: color.white,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 14,
    ...shadow.toast,
  },
});
