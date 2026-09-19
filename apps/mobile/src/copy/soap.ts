export type Soap = {
  title: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  footer: string;
};

const HEADING: Array<[keyof Omit<Soap, "title" | "footer">, RegExp]> = [
  ["subjective", /^(s|subjective|cc|chief complaint)\b/i],
  ["objective", /^(o|objective|exam|examination)\b/i],
  ["assessment", /^(a|assessment|tx|treatment|dx|diagnosis)\b/i],
  ["plan", /^(p|plan)\b/i],
];

function mapHeading(raw: string): keyof Omit<Soap, "title" | "footer"> | null {
  const key = raw.trim();
  for (const [field, re] of HEADING) {
    if (re.test(key)) return field;
  }
  return null;
}

export function emptySoap(): Soap {
  return { title: "", subjective: "", objective: "", assessment: "", plan: "", footer: "" };
}

export function parseSoap(body: string): Soap {
  const soap = emptySoap();
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  soap.title = (lines[0] ?? "").trim();
  let current: keyof Omit<Soap, "title" | "footer"> | null = null;
  const leftover: string[] = [];

  for (const line of lines.slice(1)) {
    const heading = line.match(/^([A-Za-z][A-Za-z ]{0,20})[:.\s]+(.*)$/);
    const field = heading ? mapHeading(heading[1]) : null;
    if (field) {
      current = field;
      const rest = heading?.[2]?.trim() ?? "";
      soap[field] = rest;
      continue;
    }
    if (/^AI drafted/i.test(line.trim())) {
      soap.footer = line.trim();
      current = null;
      continue;
    }
    if (current && line.trim()) {
      soap[current] = soap[current] ? `${soap[current]} ${line.trim()}` : line.trim();
    } else if (line.trim()) {
      leftover.push(line.trim());
    }
  }

  if (!soap.subjective && !soap.objective && !soap.assessment && !soap.plan) {
    soap.subjective = leftover.join(" ");
  }
  return soap;
}

export function formatSoap(soap: Soap): string {
  const blocks = [
    soap.title.trim(),
    soap.subjective.trim() && `CC: ${soap.subjective.trim()}`,
    soap.objective.trim() && `Exam: ${soap.objective.trim()}`,
    soap.assessment.trim() && `Tx: ${soap.assessment.trim()}`,
    soap.plan.trim() && `Plan: ${soap.plan.trim()}`,
    soap.footer.trim(),
  ].filter(Boolean);
  return blocks.join("\n\n");
}

export function soapPreview(soap: Soap): string {
  return soap.subjective.trim() || soap.title.trim() || "Draft ready to sign.";
}

export const SOAP_LABELS = [
  { key: "subjective" as const, label: "S", hint: "Subjective" },
  { key: "objective" as const, label: "O", hint: "Objective" },
  { key: "assessment" as const, label: "A", hint: "Assessment" },
  { key: "plan" as const, label: "P", hint: "Plan" },
];
