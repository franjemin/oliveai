import { useLocalSearchParams, useRouter } from "expo-router";

import { PostSignBridge } from "@/src/components/PostSignBridge";
import { EDGE, batchSignedLine } from "@/src/copy/edges";
import { shortReason } from "@/src/theme/format";
import { useOlive } from "@/src/store/OliveProvider";

export default function SignedScreen() {
  const { id, batch, count } = useLocalSearchParams<{ id: string; batch?: string; count?: string }>();
  const olive = useOlive();
  const router = useRouter();
  const eod = batch === "1";
  const n = Math.max(1, Number(count) || 1);
  const patient = olive.day.patients.find((p) => p.visitId === id);
  const earlyLine = [patient?.displayName ?? "Visit", shortReason(patient?.reason) || null, EDGE.postSign.body]
    .filter(Boolean)
    .join(" · ");

  return (
    <PostSignBridge
      title={eod ? EDGE.postSign.allSigned : EDGE.postSign.title}
      patientLine={eod ? batchSignedLine(n) : earlyLine}
      chip={eod ? EDGE.postSign.batchChip : EDGE.postSign.chip}
      onReview={() => router.replace("/follow-ups")}
      onBack={() => router.replace("/")}
    />
  );
}
