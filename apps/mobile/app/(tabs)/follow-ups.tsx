import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/src/api";
import { tokenFromInboxPath } from "@/src/api/map";
import type { FollowUp } from "@/src/api/types";
import { SwipeDeck } from "@/src/components/SwipeDeck";
import { Body, Button, Caption, Card, Kicker, Screen, Title } from "@/src/components/ui";
import { EDGE } from "@/src/copy/edges";
import { SECURE_SEND_MICROCOPY, SEND_FAIL_COPY, VOICE_LEARNING_TOAST } from "@/src/copy/messaging";
import { useOlive } from "@/src/store/OliveProvider";
import { color, font, radius, shadow, space } from "@/src/theme/tokens";

export default function FollowUpsTab() {
  const olive = useOlive();
  const router = useRouter();
  const pending = olive.pendingFollowUps;
  const [queue, setQueue] = useState<FollowUp[]>([]);
  const [total, setTotal] = useState(0);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<{ title: string; body: string; tone: "ok" | "refuse" } | null>(null);
  const [inboxToken, setInboxToken] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const next = await pending();
    setQueue(next);
    setDraft(next[0]?.body ?? "");
    setTotal((prev) => (prev === 0 ? Math.max(next.length, 1) : Math.max(prev, next.length)));
  }, [pending]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const current = queue[0];
  const next = queue[1];
  const patient = olive.day.patients.find((p) => p.patientId === current?.patientId);
  const nextPatient = olive.day.patients.find((p) => p.patientId === next?.patientId);
  const index = Math.max(1, total - queue.length + (current ? 1 : 0));
  const progress = total === 0 ? 0 : Math.min(1, (total - queue.length) / total);

  const saveEdit = async (opts?: { silent?: boolean }) => {
    if (!current || draft === current.body) return;
    const before = current.body;
    await olive.saveFollowUpEdit(current.id, before, draft);
    if (!opts?.silent) {
      setToast(VOICE_LEARNING_TOAST);
      setTimeout(() => setToast(null), 2800);
    }
    await load();
  };

  const send = async () => {
    if (!current) return;
    setBusy(true);
    try {
      if (draft !== current.body) await saveEdit({ silent: true });
      const sent = await olive.sendFollowUp(current.id);
      const notify = await olive.lastNotify(sent.id);
      setInboxToken(notify?.inboxToken ?? sent.magicLinkToken ?? tokenFromInboxPath(sent.inboxPath) ?? null);
      setStatus(null);
      setToast(null);
      await load();
    } catch (err) {
      const code = err instanceof ApiError ? err.error : "send_failed";
      const copy = SEND_FAIL_COPY[code] ?? {
        title: "Not sent",
        body: err instanceof Error ? err.message : "Notify send failed closed.",
      };
      setInboxToken(null);
      setStatus({ ...copy, tone: "refuse" });
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
      setStatus(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.pad}>
          <Title>Follow-ups</Title>
          <View style={styles.progressRow}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(8, progress * 100)}%` }]} />
            </View>
            <Caption>{current ? `${index} of ${Math.max(total, index)}` : "0 of 0"}</Caption>
          </View>

          {status ? (
            <View
              style={[
                styles.banner,
                { backgroundColor: status.tone === "ok" ? color.okSoft : color.refuseSoft },
              ]}
            >
              <Caption style={{ color: status.tone === "ok" ? color.oliveInk : color.refuse }}>
                {status.title}
              </Caption>
              <Body style={{ marginTop: 4 }}>{status.body}</Body>
              {inboxToken ? (
                <Pressable onPress={() => router.push(`/inbox/${inboxToken}` as Href)} style={{ marginTop: 10 }}>
                  <Caption style={{ color: color.olive }}>Open patient inbox</Caption>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {current ? (
            <SwipeDeck
              disabled={busy}
              onSend={() => void send()}
              onSkip={() => void skip()}
              peek={
                next ? (
                  <Card style={{ flex: 1 }}>
                    <Kicker style={{ color: color.sage }}>Secure message</Kicker>
                    <Title style={styles.cardName}>{nextPatient?.displayName ?? "Patient"}</Title>
                    <Body numberOfLines={3} style={{ marginTop: 12, color: color.inkMuted }}>
                      {next.body}
                    </Body>
                  </Card>
                ) : undefined
              }
            >
              <Card style={{ flex: 1 }}>
                <Kicker style={{ color: color.sage }}>Secure message</Kicker>
                <Title style={styles.cardName}>{patient?.displayName ?? "Patient"}</Title>
                <Caption style={{ marginTop: 4 }}>
                  Visit today{patient?.reason ? ` · ${patient.reason.split("·")[0].trim()}` : ""}
                </Caption>
                <View style={styles.message}>
                  <TextInput
                    multiline
                    value={draft}
                    onChangeText={setDraft}
                    onBlur={() => void saveEdit()}
                    style={styles.edit}
                    textAlignVertical="top"
                  />
                  <Caption style={{ color: color.sage, marginTop: 8 }}>Tap to edit</Caption>
                </View>
              </Card>
            </SwipeDeck>
          ) : (
            <View style={styles.empty}>
              <Title>{EDGE.emptySwipe.title}</Title>
              <Body style={{ color: color.inkMuted, marginTop: 8 }}>{EDGE.emptySwipe.body}</Body>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          {toast ? (
            <View style={styles.toast} accessibilityLiveRegion="polite">
              <Caption style={{ color: color.charcoal, fontFamily: font.uiMed, textAlign: "center" }}>
                {toast}
              </Caption>
            </View>
          ) : null}
          {current ? (
            <>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Button label="Skip" variant="secondary" disabled={busy} onPress={() => void skip()} />
                </View>
                <View style={{ flex: 1.15 }}>
                  <Button label="Send" disabled={busy} onPress={() => void send()} />
                </View>
              </View>
              <Caption style={{ textAlign: "center", marginTop: 12 }}>{SECURE_SEND_MICROCOPY}</Caption>
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
  pad: { flex: 1, paddingHorizontal: space.lg, paddingTop: 8 },
  progressRow: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 12 },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(44, 43, 40, 0.08)",
    overflow: "hidden",
  },
  fill: { height: 4, backgroundColor: color.olive, borderRadius: 2 },
  banner: { marginTop: 16, borderRadius: 16, padding: 14 },
  cardName: { marginTop: 10, fontSize: 26, lineHeight: 30 },
  message: {
    marginTop: 16,
    backgroundColor: color.paperAlt,
    borderRadius: radius.md,
    padding: 14,
    flex: 1,
  },
  edit: {
    minHeight: 140,
    fontSize: 16,
    lineHeight: 24,
    color: color.ink,
    fontFamily: font.ui,
    borderWidth: 0,
  },
  empty: { flex: 1, justifyContent: "center" },
  actions: { paddingHorizontal: space.lg, paddingBottom: 108, position: "relative" },
  row: { flexDirection: "row", gap: 10 },
  toast: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 168,
    zIndex: 6,
    backgroundColor: color.white,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 14,
    ...shadow.toast,
  },
});
