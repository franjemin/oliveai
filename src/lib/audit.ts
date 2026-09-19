import { auditEvents } from "../db/schema.js";
import { newId } from "./ids.js";
import type { Db } from "../db/client.js";

export async function audit(
  db: Db,
  input: {
    clinicId: string;
    actorId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(auditEvents).values({
    id: newId(),
    clinicId: input.clinicId,
    actorId: input.actorId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata ?? {},
    createdAt: new Date(),
  });
}
