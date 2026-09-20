import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import type { AppContext } from "./context.js";
import { registerRoutes } from "./routes/index.js";

export async function buildApp(
  ctx: AppContext,
  serverOpts: { https?: { cert: Buffer; key: Buffer } } = {},
) {
  const app = Fastify({
    logger: ctx.config.nodeEnv !== "test",
    ...serverOpts,
  });
  await app.register(cors, { origin: true });

  app.addContentTypeParser(
    ["application/octet-stream", "audio/webm", "audio/wav", "audio/mpeg"],
    { parseAs: "buffer" },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(422).send({ error: "validation_error", message: err.message, details: err.flatten() });
    }
    const status = typeof (err as { statusCode?: number }).statusCode === "number"
      ? (err as { statusCode: number }).statusCode
      : 500;
    const message = err instanceof Error ? err.message : "request_error";
    return reply.status(status).send({ error: "request_error", message });
  });

  await registerRoutes(app, ctx);
  return app;
}
