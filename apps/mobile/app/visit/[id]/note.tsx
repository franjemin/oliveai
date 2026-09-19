import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/src/api";
import { isAiAssistedDraft, type Note } from "@/src/api/types";
import { Body, Button, Caption, Pill, Screen, Title } from "@/src/components/ui";
import { EDGE } from "@/src/copy/edges";
import { formatSoap, parseSoap, SOAP_LABELS, soapPreview, type Soap } from "@/src/copy/soap";
import { useOlive } from "@/src/store/OliveProvider";
import { color, font, radius, space } from "@/src/theme/tokens";

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const olive = useOlive();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [soap, setSoap] = useState<Soap>(() => parseSoap(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
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
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign failed.");
    } finally {
      setBusy(false);
    }
  };

  const patientLine = [
    patient?.displayName ?? "Visit",
    patient?.reason ? patient.reason.split("·")[0].trim() : null,
    signed ? EDGE.postSign.body : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (signed) {
    return (
      <Screen>
        <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
          <View style={styles.signedCenter}>
            <View style={styles.check}>
              <Caption style={styles.checkMark}>✓</Caption>
            </View>
            <Title style={{ marginTop: 28, textAlign: "center" }}>{EDGE.postSign.title}</Title>
            <Caption style={{ marginTop: 12, textAlign: "center" }}>{patientLine}</Caption>
            <View style={{ marginTop: 16, alignItems: "center" }}>
              <Pill label={EDGE.postSign.chip} tone="olive" />
            </View>
          </View>
          <View style={styles.actions}>
            <Button label={EDGE.postSign.cta} onPress={() => router.replace("/follow-ups")} />
            <View style={{ height: 10 }} />
            <Button label={EDGE.postSign.back} variant="secondary" onPress={() => router.replace("/")} />
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

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
          <Caption style={{ marginTop: 6 }}>{patientLine}</Caption>

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
                    onChangeText={(text) => void persist({ ...soap, [section.key]: text })}
                    style={styles.section}
                    textAlignVertical="top"
                  />
                </View>
              ))}
            </View>
          ) : (
            <Body style={styles.preview}>{preview}</Body>
          )}
          <Pressable onPress={() => setEditing((v) => !v)} style={styles.editPill}>
            <Caption style={{ color: color.olive, fontFamily: font.uiMed }}>
              {editing ? "Done" : "Edit full note"}
            </Caption>
          </Pressable>
          {error ? <Body style={{ color: color.refuse, marginTop: 10 }}>{error}</Body> : null}
        </ScrollView>
        <View style={styles.actions}>
          <Caption style={{ textAlign: "center", marginBottom: 12 }}>{EDGE.signConfirm.oliveTruth}</Caption>
          <Button label="Sign note" disabled={!canSign || busy} onPress={() => void sign()} />
          <Pressable
            onPress={() => router.replace("/")}
            style={{ paddingVertical: 14 }}
          >
            <Caption style={{ textAlign: "center", color: color.inkFaint }}>Save draft</Caption>
          </Pressable>
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: space.lg, paddingBottom: 8 },
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
  signedCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  check: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.olive,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { color: color.white, fontSize: 22, fontFamily: font.uiSemi },
});
