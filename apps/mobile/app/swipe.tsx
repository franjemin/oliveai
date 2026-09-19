import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/src/api";
import type { FollowUp, NotifyStub } from "@/src/api/types";
import { Body, Button, Caption, Card, Pill, Screen, Title } from "@/src/components/ui";
import { SECURE_SEND_MICROCOPY, SEND_FAIL_COPY } from "@/src/copy/messaging";
import { useOlive } from "@/src/store/OliveProvider";
import { color, space } from "@/src/theme/tokens";

export default function SwipeScreen() {
  const olive = useOlive();
  const router = useRouter();
  const pending = olive.pendingFollowUps;
  const [queue, setQueue] = useState<FollowUp[]>([]);
  const [banner, setBanner] = useState<{ title: string; body: string; tone: "ok" | "refuse" } | null>(null);
  const [lastNotify, setLastNotify] = useState<NotifyStub | null>(null);
  const [lastPatientId, setLastPatientId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setQueue(await pending());
  }, [pending]);

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
      const sent = await olive.sendFollowUp(current.id);
      const notify = await olive.lastNotify(sent.id);
      setLastNotify(notify);
      setLastPatientId(sent.patientId);
      setBanner({
        title: "Secure message sent",
        body: SECURE_SEND_MICROCOPY,
        tone: "ok",
      });
      await load();
    } catch (err) {
      const code = err instanceof ApiError ? err.error : "send_failed";
      const copy = SEND_FAIL_COPY[code] ?? {
        title: "Not sent",
        body: err instanceof Error ? err.message : "Notify send failed closed.",
      };
      setLastNotify(null);
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
      setLastNotify(null);
      setBanner({ title: "Skipped", body: "No secure message sent.", tone: "ok" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={styles.pad}>
          <Caption>Follow-ups</Caption>
          <Title>Swipe</Title>
          <Caption style={{ marginTop: 6 }}>
            {queue.length} remaining · {SECURE_SEND_MICROCOPY}
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
              {lastNotify ? (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <Pressable onPress={() => router.push(`/inbox/${lastNotify.inboxToken}` as Href)}>
                    <Body style={{ color: color.olive, fontWeight: "600" }}>Open patient inbox</Body>
                  </Pressable>
                  {lastPatientId ? (
                    <Pressable
                      onPress={() => {
                        if (lastPatientId) router.push(`/thread/${lastPatientId}` as Href);
                      }}
                    >
                      <Body style={{ color: color.olive, fontWeight: "600" }}>View secure thread</Body>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {current ? (
            <Card style={{ marginTop: 20, flex: 1 }}>
              <View style={styles.top}>
                <Caption>{patient?.displayName ?? "Patient"}</Caption>
                <Pill label="Secure message" tone="olive" />
              </View>
              <Body style={{ marginTop: 14 }}>{current.body}</Body>
              <Caption style={{ marginTop: 16 }}>{SECURE_SEND_MICROCOPY}</Caption>
              {current.lastError ? (
                <Caption style={{ color: color.refuse, marginTop: 8 }}>Last error: {current.lastError}</Caption>
              ) : null}
            </Card>
          ) : (
            <Card style={{ marginTop: 20 }}>
              <Title>All caught up</Title>
              <Body style={{ marginTop: 8 }}>No pending follow-ups.</Body>
            </Card>
          )}
        </View>
        <View style={styles.actions}>
          {current ? (
            <>
              <Button label="Send" disabled={busy} onPress={send} />
              <Caption style={{ textAlign: "center" }}>{SECURE_SEND_MICROCOPY}</Caption>
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
