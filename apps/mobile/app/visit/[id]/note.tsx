import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/src/api";
import { isAiAssistedDraft, type Note } from "@/src/api/types";
import { Body, Button, Caption, Pill, Screen, Title } from "@/src/components/ui";
import { EDGE } from "@/src/copy/edges";
import { formatSoap, parseSoap, SOAP_LABELS, soapPreview, type Soap } from "@/src/copy/soap";
import { useOlive } from "@/src/store/OliveProvider";
import { color, radius, space } from "@/src/theme/tokens";

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const olive = useOlive();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [soap, setSoap] = useState<Soap>(() => parseSoap(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const patient = olive.day.patients.find((p) => p.visitId === id);
  const declined = patient?.recording === "declined";
  const aiDraft = note ? isAiAssistedDraft(note, declined) : false;

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
      setSoap(parseSoap(n.body));
    })();
  }, [id, olive]);

  const signed = note?.status === "signed";
  const canSign = note?.status === "draft";
  const preview = useMemo(() => soapPreview(soap), [soap]);

  const persist = async (next: Soap) => {
    if (!id || signed) return;
    setSoap(next);
    try {
      const n = await olive.patchNote(id, formatSoap(next));
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
      setSoap(parseSoap(n.body));
      setConfirm(false);
      setEditing(false);
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
          <Caption style={{ marginTop: 16 }}>{patient?.displayName ?? "Visit"}</Caption>
          <Title style={{ marginTop: 4 }}>{soap.title || "Note"}</Title>
          <View style={styles.badges}>
            {signed ? <Pill label="Signed" tone="olive" /> : null}
            {!signed && aiDraft ? <Pill label="AI-assisted draft" tone="warn" /> : null}
            {!signed && declined ? <Pill label="Recording declined" tone="refuse" /> : null}
          </View>

          {editing ? (
            <View style={{ marginTop: 20, gap: 14 }}>
              {SOAP_LABELS.map((section) => (
                <View key={section.key}>
                  <Caption>
                    {section.label} · {section.hint}
                  </Caption>
                  <TextInput
                    multiline
                    editable={!signed}
                    value={soap[section.key]}
                    onChangeText={(text) => void persist({ ...soap, [section.key]: text })}
                    style={[styles.section, signed && styles.locked]}
                    textAlignVertical="top"
                  />
                </View>
              ))}
            </View>
          ) : (
            <Body style={{ marginTop: 20, color: color.inkMuted }}>{preview}</Body>
          )}
          {error ? <Body style={{ color: color.refuse, marginTop: 10 }}>{error}</Body> : null}
        </ScrollView>
        {confirm ? (
          <View style={styles.confirm}>
            <Title>{EDGE.signConfirm.title}</Title>
            <Caption style={{ marginTop: 10 }}>{EDGE.signConfirm.oliveTruth}</Caption>
            <Caption style={{ marginTop: 6 }}>{EDGE.signConfirm.audio}</Caption>
            <Caption style={{ marginTop: 6 }}>{EDGE.signConfirm.noOd}</Caption>
            <View style={{ marginTop: 16, gap: 8 }}>
              <Button label={EDGE.signConfirm.sign} disabled={busy} onPress={sign} />
              <Button label={EDGE.signConfirm.cancel} variant="ghost" onPress={() => setConfirm(false)} />
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            {signed ? (
              <Button label="Review follow-ups" onPress={() => router.push("/swipe")} />
            ) : (
              <Button label="Sign note" disabled={!canSign || busy} onPress={() => setConfirm(true)} />
            )}
            <Button
              label={editing ? "Done" : "Edit"}
              variant="ghost"
              onPress={() => setEditing((v) => !v)}
            />
          </View>
        )}
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: 24 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  section: {
    marginTop: 6,
    minHeight: 72,
    backgroundColor: color.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    padding: space.sm,
    fontSize: 16,
    lineHeight: 22,
    color: color.ink,
  },
  locked: { backgroundColor: color.mistWash },
  actions: { paddingHorizontal: space.lg, paddingBottom: space.md },
  confirm: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.paper,
  },
});
