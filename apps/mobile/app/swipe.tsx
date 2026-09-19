import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/src/api";
import type { FollowUp } from "@/src/api/types";
import { Body, Button, Caption, Card, Mono, Pill, Screen, Title } from "@/src/components/ui";
import { SMS_FAIL_COPY, clinicSmsFooter, composeSmsPreview } from "@/src/copy/sms";
import { useOlive } from "@/src/store/OliveProvider";
import { color, space } from "@/src/theme/tokens";

export default function SwipeScreen() {
  const olive = useOlive();
  const router = useRouter();
  const [queue, setQueue] = useState<FollowUp[]>([]);
  const [banner, setBanner] = useState<{ title: string; body: string; tone: "ok" | "refuse" } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setQueue(await olive.pendingFollowUps());
  }, [olive]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const current = queue[0];
  const patient = olive.day.patients.find((p) => p.patientId === current?.patientId);

  const send = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await olive.sendFollowUp(current.id);
      setBanner({
        title: "SMS sent",
        body: `Labeled as ${clinicSmsFooter(olive.clinic.smsIdentity)}`,
        tone: "ok",
      });
      await load();
    } catch (err) {
      const code = err instanceof ApiError ? err.error : "send_failed";
      const copy = SMS_FAIL_COPY[code] ?? {
        title: "Not sent",
        body: err instanceof Error ? err.message : "Send failed closed.",
      };
      setBanner({ ...copy, tone: "refuse" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await olive.skipFollowUp(current.id);
      setBanner({ title: "Skipped", body: "No SMS sent.", tone: "ok" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={styles.pad}>
          <Caption>SMS · clinic as sender</Caption>
          <Title>Swipe</Title>
          <Caption style={{ marginTop: 6 }}>
            {queue.length} remaining · {olive.clinic.smsIdentity}
          </Caption>

          {banner ? (
            <View
              style={[
                styles.banner,
                { backgroundColor: banner.tone === "ok" ? color.okSoft : color.refuseSoft },
              ]}
            >
              <Caption style={{ color: banner.tone === "ok" ? color.oliveInk : color.refuse }}>
                {banner.title}
              </Caption>
              <Body style={{ marginTop: 4 }}>{banner.body}</Body>
            </View>
          ) : null}

          {current ? (
            <Card style={{ marginTop: 20, flex: 1 }}>
              <View style={styles.top}>
                <Caption>{patient?.displayName ?? "Patient"}</Caption>
                <Pill label="SMS" tone="olive" />
              </View>
              <Body style={{ marginTop: 14 }}>{composeSmsPreview(current.body, olive.clinic.smsIdentity)}</Body>
              <Mono style={{ marginTop: 18 }}>clinical_transactional</Mono>
              {current.lastError ? (
                <Caption style={{ color: color.refuse, marginTop: 8 }}>Last error: {current.lastError}</Caption>
              ) : null}
            </Card>
          ) : (
            <Card style={{ marginTop: 20 }}>
              <Body>Queue clear. Back to Today when you’re done.</Body>
            </Card>
          )}
        </View>
        <View style={styles.actions}>
          {current ? (
            <>
              <Button label="Send SMS" disabled={busy} onPress={send} />
              <Button label="Skip" variant="secondary" disabled={busy} onPress={skip} />
            </>
          ) : (
            <Button label="Back to Today" onPress={() => router.replace("/")} />
          )}
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.md },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  banner: { marginTop: 16, borderRadius: 16, padding: 14 },
  actions: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: 10 },
});
