import type { FastifyReply, FastifyRequest } from "fastify";
import type { AppConfig } from "./config.js";
import type { Db } from "./db/client.js";
import type { MessagingVendor } from "./vendors/messaging.js";
import type { ObjectStore } from "./vendors/storage.js";
import type { PmsAdapter } from "./vendors/pms.js";
import type { TranscriptionVendor } from "./vendors/transcription.js";

export type Actor = {
  userId: string;
  clinicId: string;
  email: string;
  name: string;
  role: "dentist" | "staff" | "admin";
};

export type AppContext = {
  db: Db;
  config: AppConfig;
  storage: ObjectStore;
  transcription: TranscriptionVendor;
  messaging: MessagingVendor;
  pms: PmsAdapter;
};

export type AuthedRequest = FastifyRequest & { actor: Actor };

export function actorOf(request: FastifyRequest): Actor {
  const actor = (request as AuthedRequest).actor;
  if (!actor) {
    throw new Error("missing actor");
  }
  return actor;
}

export async function sendError(reply: FastifyReply, err: unknown): Promise<FastifyReply> {
  const status = typeof (err as { statusCode?: number }).statusCode === "number"
    ? (err as { statusCode: number }).statusCode
    : 500;
  const code = typeof (err as { code?: string }).code === "string"
    ? (err as { code: string }).code
    : "internal_error";
  const message = err instanceof Error ? err.message : "Unexpected error";
  const details = (err as { details?: unknown }).details;
  return reply.status(status).send({ error: code, message, details });
}
