import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/src/api";
import type { Note } from "@/src/api/types";
import { Body, Button, Caption, Mono, Pill, Screen, Title } from "@/src/components/ui";
import { useOlive } from "@/src/store/OliveProvider";
import { color, radius, space } from "@/src/theme/tokens";

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const olive = useOlive();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const patient = olive.day.patients.find((p) => p.visitId === id);
  const declined = patient?.recording === "declined";

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        await olive.getVisit(id);
      } catch {
        /* visit may still be in progress after refuse */
      }
      const n = await olive.getNote(id);
      setNote(n);
      setBody(n.body);
    })();
  }, [id, olive]);

  const signed = note?.status === "signed";
  const canSign = note?.status === "draft";

  const save = async (next: string) => {
    if (!id || signed) return;
    setBody(next);
    try {
      const n = await olive.patchNote(id, next);
      setNote(n);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    }
  };

  const sign = async () => {
    if (!id || !canSign) return;
    setBusy(true);
    try {
      const n = await olive.signNote(id);
      setNote(n);
      setBody(n.body);
      setConfirm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Caption style={{ color: color.olive }} onPress={() => router.back()}>
            ← Back
          </Caption>
          <Caption>{patient?.displayName ?? "Visit"}</Caption>
          <Title style={{ marginTop: 4 }}>Note</Title>
          <View style={styles.badges}>
            {note?.aiAssisted && !signed ? <Pill label="AI-assisted draft" tone="warn" /> : null}
            {signed ? <Pill label="Signed" tone="olive" /> : null}
            {declined ? <Pill label="Recording declined" tone="refuse" /> : null}
            {!note?.aiAssisted && !signed ? <Pill label="Manual draft" tone="mist" /> : null}
          </View>
          {signed ? (
            <Caption style={{ marginTop: 8 }}>
              Signed by {olive.user.name} · {note?.signedAt ? new Date(note.signedAt).toLocaleString() : ""}
            </Caption>
          ) : (
            <Caption style={{ marginTop: 8 }}>
              You are responsible for the accuracy of this record. Sign only after review. Audio stays with the
              clinic record — retention is clinic-controlled.
            </Caption>
          )}
          <TextInput
            multiline
            editable={!signed}
            value={body}
            onChangeText={(t) => void save(t)}
            style={[styles.input, signed && styles.locked]}
            textAlignVertical="top"
          />
          {signed && note?.snapshot ? (
            <Mono style={{ marginTop: 8 }}>Immutable snapshot stored · no silent mutate</Mono>
          ) : null}
          {error ? <Body style={{ color: color.refuse, marginTop: 10 }}>{error}</Body> : null}
        </ScrollView>
        {confirm ? (
          <View style={styles.confirm}>
            <Title>Sign this note?</Title>
            <Body style={{ marginTop: 8 }}>
              You are signing Olive’s draft as the clinic record. No Open Dental write-back in this demo.
            </Body>
            <View style={{ marginTop: 16, gap: 10 }}>
              <Button label="Sign note" disabled={busy} onPress={sign} />
              <Button label="Cancel" variant="secondary" onPress={() => setConfirm(false)} />
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            {signed ? (
              <Button label="Review follow-ups" onPress={() => router.push("/swipe")} />
            ) : (
              <Button label="Sign note" disabled={!canSign || busy} onPress={() => setConfirm(true)} />
            )}
          </View>
        )}
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: 24 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  input: {
    marginTop: 16,
    minHeight: 320,
    backgroundColor: color.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    padding: space.md,
    fontSize: 16,
    lineHeight: 23,
    color: color.ink,
  },
  locked: { backgroundColor: color.mistWash },
  actions: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: 10 },
  confirm: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.paper,
  },
});
