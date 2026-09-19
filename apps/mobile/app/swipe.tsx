import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/src/api";
import { tokenFromInboxPath } from "@/src/api/map";
import type { FollowUp } from "@/src/api/types";
import { Body, Button, Caption, Card, Pill, Screen, Title } from "@/src/components/ui";
import { EDGE } from "@/src/copy/edges";
import { SECURE_SEND_MICROCOPY, SEND_FAIL_COPY, VOICE_LEARNING_TOAST } from "@/src/copy/messaging";
import { useOlive } from "@/src/store/OliveProvider";
import { color, radius, space } from "@/src/theme/tokens";

export default function SwipeScreen() {
  const olive = useOlive();
  const router = useRouter();
  const pending = olive.pendingFollowUps;
  const [queue, setQueue] = useState<FollowUp[]>([]);
  const [draft, setDraft] = useState("");
  const [banner, setBanner] = useState<{ title: string; body: string; tone: "ok" | "refuse" } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [inboxToken, setInboxToken] = useState<string | null>(null);
  const [lastPatientId, setLastPatientId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const next = await pending();
    setQueue(next);
    setDraft(next[0]?.body ?? "");
  }, [pending]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const current = queue[0];
  const patient = olive.day.patients.find((p) => p.patientId === current?.patientId);

  const saveEdit = async () => {
    if (!current || draft === current.body) return;
    const before = current.body;
    await olive.saveFollowUpEdit(current.id, before, draft);
    setToast(VOICE_LEARNING_TOAST);
    await load();
  };

  const send = async () => {
    if (!current) return;
    setBusy(true);
    try {
      if (draft !== current.body) await saveEdit();
      const sent = await olive.sendFollowUp(current.id);
      const notify = await olive.lastNotify(sent.id);
      setInboxToken(notify?.inboxToken ?? sent.magicLinkToken ?? tokenFromInboxPath(sent.inboxPath) ?? null);
      setLastPatientId(sent.patientId);
      setBanner({ title: "Secure message sent", body: SECURE_SEND_MICROCOPY, tone: "ok" });
      await load();
    } catch (err) {
      const code = err instanceof ApiError ? err.error : "send_failed";
      const copy = SEND_FAIL_COPY[code] ?? {
        title: "Not sent",
        body: err instanceof Error ? err.message : "Notify send failed closed.",
      };
      setInboxToken(null);
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
      setInboxToken(null);
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

          {toast ? (
            <View style={styles.toast}>
              <Body>{toast}</Body>
            </View>
          ) : null}

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
              {inboxToken ? (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <Pressable onPress={() => router.push(`/inbox/${inboxToken}` as Href)}>
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
              <TextInput
                multiline
                value={draft}
                onChangeText={setDraft}
                onBlur={() => void saveEdit()}
                style={styles.edit}
                textAlignVertical="top"
              />
              <Caption style={{ marginTop: 12 }}>{SECURE_SEND_MICROCOPY}</Caption>
              {current.lastError ? (
                <Caption style={{ color: color.refuse, marginTop: 8 }}>Last error: {current.lastError}</Caption>
              ) : null}
            </Card>
          ) : (
            <View style={styles.empty}>
              <Title>{EDGE.emptySwipe.title}</Title>
              <Body style={{ marginTop: 8, color: color.inkMuted }}>{EDGE.emptySwipe.body}</Body>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          {current ? (
            <>
              <Button label="Send" disabled={busy} onPress={send} />
              <Button label="Skip" variant="secondary" disabled={busy} onPress={skip} />
            </>
          ) : (
            <Button label={EDGE.emptySwipe.cta} onPress={() => router.replace("/")} />
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
  toast: {
    marginTop: 16,
    backgroundColor: color.okSoft,
    borderRadius: radius.md,
    padding: space.md,
  },
  edit: {
    marginTop: 12,
    minHeight: 160,
    fontSize: 16,
    lineHeight: 23,
    color: color.ink,
  },
  empty: { flex: 1, justifyContent: "center" },
  actions: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: 10 },
});
