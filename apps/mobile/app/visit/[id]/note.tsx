import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/src/api";
import { isAiAssistedDraft, type Note } from "@/src/api/types";
import { SignConfirmSheet } from "@/src/components/SignConfirmSheet";
import { Body, Button, Caption, Pill, Screen, Title } from "@/src/components/ui";
import { EDGE } from "@/src/copy/edges";
import { formatSoap, parseSoap, SOAP_LABELS, soapPreview, type Soap } from "@/src/copy/soap";
import { useOlive } from "@/src/store/OliveProvider";
import { shortReason } from "@/src/theme/format";
import { color, font, radius, space } from "@/src/theme/tokens";

export default function NoteScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const olive = useOlive();
  const router = useRouter();
  const dayStack = from === "day";
  const [note, setNote] = useState<Note | null>(null);
  const [soap, setSoap] = useState<Soap>(() => parseSoap(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [stackIndex, setStackIndex] = useState(1);
  const [stackTotal, setStackTotal] = useState(1);
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
      if (n.status === "signed") {
        if (dayStack) {
          await advanceDayStack(id);
          return;
        }
        setNote(n);
        setSoap(parseSoap(n.body));
        return;
      }
      setNote(n);
      setSoap(parseSoap(n.body));
      if (dayStack) {
        const stack = await olive.unsignedNotes();
        const idx = Math.max(1, stack.findIndex((row) => row.visitId === id) + 1);
        setStackIndex(idx);
        setStackTotal(Math.max(stack.length, 1));
      }
    })();
  }, [dayStack, id, olive, router]);

  const signed = note?.status === "signed";
  const canSign = note?.status === "draft";
  const preview = useMemo(() => soapPreview(soap), [soap]);

  const advanceDayStack = async (signedVisitId: string) => {
    const rest = (await olive.unsignedNotes()).filter((row) => row.visitId !== signedVisitId);
    if (rest[0]) {
      router.replace({
        pathname: "/visit/[id]/note",
        params: { id: rest[0].visitId, from: "day" },
      });
      return;
    }
    router.replace("/follow-ups");
  };

  const persistIfDirty = async (nextSoap = soap) => {
    if (!id || signed) return note;
    const nextBody = formatSoap(nextSoap);
    if (!note || nextBody === note.body) return note;
    try {
      const n = await olive.patchNote(id, nextBody);
      setNote(n);
      setError(null);
      return n;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
      return note;
    }
  };

  const sign = async () => {
    if (!id || !canSign) return;
    setBusy(true);
    try {
      await persistIfDirty();
      const n = await olive.signNote(id);
      setNote(n);
      setSoap(parseSoap(n.body));
      setEditing(false);
      setConfirm(false);
      if (dayStack) {
        await advanceDayStack(id);
        return;
      }
      router.replace(`/visit/${id}/signed`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign failed.");
    } finally {
      setBusy(false);
    }
  };

  const patientLine = [patient?.displayName ?? "Visit", shortReason(patient?.reason) || null].filter(Boolean).join(" · ");

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.pad}>
          <View style={styles.noteTop}>
            <Pressable onPress={() => router.replace("/")}>
              <Caption style={{ color: color.inkMuted }}>← Today</Caption>
            </Pressable>
            {aiDraft ? <Pill label="AI-assisted draft" tone="olive" /> : null}
          </View>
          <Title style={{ marginTop: 18 }}>Note</Title>
          <Caption style={{ marginTop: 6 }}>
            {dayStack ? `${EDGE.notesToSign.kicker} · ${stackIndex} of ${stackTotal}` : patientLine}
          </Caption>
          {dayStack ? <Caption style={{ marginTop: 4 }}>{patientLine}</Caption> : null}

          {editing ? (
            <View style={{ marginTop: 22, gap: 14 }}>
              {SOAP_LABELS.map((section) => (
                <View key={section.key}>
                  <Caption>
                    {section.label} · {section.hint}
                  </Caption>
                  <TextInput
                    multiline
                    editable={!signed}
                    value={soap[section.key]}
                    onChangeText={(text) => setSoap({ ...soap, [section.key]: text })}
                    style={styles.section}
                    textAlignVertical="top"
                  />
                </View>
              ))}
            </View>
          ) : (
            <Body style={styles.preview}>{preview}</Body>
          )}
          <Pressable
            onPress={() => {
              if (editing) void persistIfDirty();
              setEditing((v) => !v);
            }}
            style={styles.editPill}
          >
            <Caption style={{ color: color.olive, fontFamily: font.uiMed }}>
              {editing ? "Done" : "Edit full note"}
            </Caption>
          </Pressable>
          {error ? <Body style={{ color: color.refuse, marginTop: 10 }}>{error}</Body> : null}
        </ScrollView>
        <View style={styles.actions}>
          {signed ? (
            <Pressable onPress={() => router.replace("/")} style={{ paddingVertical: 14 }}>
              <Caption style={{ textAlign: "center", color: color.inkFaint }}>Back to Today</Caption>
            </Pressable>
          ) : (
            <>
              <Caption style={{ textAlign: "center", marginBottom: 12 }}>{EDGE.signConfirm.oliveTruth}</Caption>
              <Button label="Sign note" disabled={!canSign || busy} onPress={() => setConfirm(true)} />
              <Pressable
                onPress={() => {
                  void persistIfDirty().then(() => router.replace("/"));
                }}
                style={{ paddingVertical: 14 }}
              >
                <Caption style={{ textAlign: "center", color: color.inkFaint }}>Save draft</Caption>
              </Pressable>
            </>
          )}
        </View>
        <SignConfirmSheet
          visible={confirm}
          busy={busy}
          onSign={() => void sign()}
          onCancel={() => setConfirm(false)}
        />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: 24 },
  noteTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  preview: {
    marginTop: 22,
    color: color.ink,
    fontSize: 17,
    lineHeight: 26,
  },
  editPill: {
    alignSelf: "flex-start",
    marginTop: 20,
    backgroundColor: color.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  section: {
    marginTop: 6,
    minHeight: 72,
    backgroundColor: color.white,
    borderRadius: radius.md,
    padding: space.sm,
    fontSize: 16,
    lineHeight: 22,
    color: color.ink,
    fontFamily: font.ui,
    borderWidth: 0,
  },
  actions: { paddingHorizontal: space.lg, paddingBottom: 8 },
});
