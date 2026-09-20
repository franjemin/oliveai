import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isAiAssistedDraft } from "@/src/api/types";
import { Body, Button, Caption, Card, Pill, Screen, Title } from "@/src/components/ui";
import { EDGE, notesToSignCount } from "@/src/copy/edges";
import { parseSoap, soapPreview } from "@/src/copy/soap";
import { useOlive } from "@/src/store/OliveProvider";
import { prettyTime, shortReason, truncate } from "@/src/theme/format";
import { color, font, space } from "@/src/theme/tokens";

export default function NotesToSignScreen() {
  const olive = useOlive();
  const router = useRouter();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof olive.unsignedNotes>>>([]);

  const load = useCallback(async () => {
    const next = await olive.unsignedNotes();
    setRows(next);
  }, [olive]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const first = rows[0];
  const patient = olive.day.patients.find((p) => p.visitId === first?.visitId);
  const declined = patient?.recording === "declined";
  const preview = first ? truncate(soapPreview(parseSoap(first.note.body)), 108) : "";
  const aiDraft = first ? isAiAssistedDraft(first.note, declined) : false;
  const meta = first
    ? [prettyTime(first.time), shortReason(first.reason) || null].filter(Boolean).join(" · ")
    : "";

  const openStack = () => {
    if (!first) {
      router.replace("/follow-ups");
      return;
    }
    router.replace({
      pathname: "/visit/[id]/note",
      params: { id: first.visitId, from: "day" },
    } as Href);
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Pressable onPress={() => router.replace("/")}>
            <Caption style={{ color: color.inkMuted }}>{EDGE.notesToSign.today}</Caption>
          </Pressable>
          <Title style={{ marginTop: 18 }}>{EDGE.notesToSign.title}</Title>
          <Caption style={{ marginTop: 8 }}>{notesToSignCount(rows.length)}</Caption>

          {first ? (
            <Card style={{ marginTop: 22 }}>
              <Body style={styles.name}>{first.displayName}</Body>
              {meta ? <Caption style={{ marginTop: 6 }}>{meta}</Caption> : null}
              <Body style={styles.preview}>{preview}</Body>
              {aiDraft ? (
                <View style={{ marginTop: 16 }}>
                  <Pill label="AI-assisted draft" tone="olive" />
                </View>
              ) : null}
            </Card>
          ) : (
            <Caption style={{ marginTop: 28 }}>No unsigned drafts.</Caption>
          )}
        </ScrollView>
        <View style={styles.actions}>
          <Button label={EDGE.notesToSign.cta} onPress={openStack} />
          <Caption style={styles.hint}>{EDGE.notesToSign.hint}</Caption>
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: 24 },
  name: {
    fontFamily: font.displayBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  preview: {
    marginTop: 14,
    fontSize: 16,
    lineHeight: 24,
    color: color.ink,
  },
  actions: { paddingHorizontal: space.lg, paddingBottom: 10 },
  hint: { textAlign: "center", marginTop: 12, color: color.inkFaint },
});
