import { useLocalSearchParams, useRouter } from "expo-router";

import { PostSignBridge } from "@/src/components/PostSignBridge";
import { EDGE } from "@/src/copy/edges";
import { shortReason } from "@/src/theme/format";
import { useOlive } from "@/src/store/OliveProvider";

export default function SignedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const olive = useOlive();
  const router = useRouter();
  const patient = olive.day.patients.find((p) => p.visitId === id);
  const patientLine = [patient?.displayName ?? "Visit", shortReason(patient?.reason) || null, EDGE.postSign.body]
    .filter(Boolean)
    .join(" · ");

  return (
    <PostSignBridge
      patientLine={patientLine}
      onReview={() => router.replace("/follow-ups")}
      onBack={() => router.replace("/")}
    />
  );
}
