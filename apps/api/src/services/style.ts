import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { clinicianStyleProfiles } from "../db/schema.js";
import { newId } from "../lib/ids.js";

/** Per clinician + clinic only. Never a global PHI model. phiTrainingAllowed stays false. */

export type StyleProfile = {
  preferShorter: boolean;
  greeting: string | null;
  editCount: number;
};

function extractGreeting(text: string): string | null {
  const first = text.trim().split(/[.!\n]/)[0]?.trim() ?? "";
  if (first.length > 4 && first.length < 80 && /^(hi|hello|hey|thanks|thank you)\b/i.test(first)) {
    return first;
  }
  return null;
}

export async function recordStyleFromEdit(
  db: Db,
  input: { clinicId: string; clinicianId: string; before: string; after: string },
): Promise<StyleProfile> {
  const existing = await getStyleProfile(db, input.clinicId, input.clinicianId);
  const preferShorter = existing.preferShorter || input.after.trim().length < input.before.trim().length;
  const greeting = extractGreeting(input.after) ?? existing.greeting;
  const editCount = existing.editCount + 1;
  const now = new Date();

  const [row] = await db
    .select()
    .from(clinicianStyleProfiles)
    .where(
      and(
        eq(clinicianStyleProfiles.clinicId, input.clinicId),
        eq(clinicianStyleProfiles.clinicianId, input.clinicianId),
      ),
    );

  if (row) {
    await db
      .update(clinicianStyleProfiles)
      .set({ preferShorter, greeting, editCount, updatedAt: now })
      .where(eq(clinicianStyleProfiles.id, row.id));
  } else {
    await db.insert(clinicianStyleProfiles).values({
      id: newId(),
      clinicId: input.clinicId,
      clinicianId: input.clinicianId,
      preferShorter,
      greeting,
      editCount,
      createdAt: now,
      updatedAt: now,
    });
  }
  return { preferShorter, greeting, editCount };
}

export async function getStyleProfile(db: Db, clinicId: string, clinicianId: string): Promise<StyleProfile> {
  const [row] = await db
    .select()
    .from(clinicianStyleProfiles)
    .where(
      and(eq(clinicianStyleProfiles.clinicId, clinicId), eq(clinicianStyleProfiles.clinicianId, clinicianId)),
    );
  return {
    preferShorter: row?.preferShorter ?? false,
    greeting: row?.greeting ?? null,
    editCount: row?.editCount ?? 0,
  };
}

/** Demo simplicity cuts: same-day heuristic only — not model training. */
export function applyStyle(body: string, profile: StyleProfile): string {
  let out = body.trim();
  if (profile.greeting && !out.toLowerCase().startsWith(profile.greeting.toLowerCase().slice(0, 6))) {
    out = `${profile.greeting} ${out}`.trim();
  }
  if (profile.preferShorter && out.length > 280) {
    const cut = out.slice(0, 280);
    const last = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
    out = (last > 40 ? cut.slice(0, last + 1) : cut).trim();
  }
  return out;
}
