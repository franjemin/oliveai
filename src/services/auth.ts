import { and, eq, gt } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { clinics, sessions, users } from "../db/schema.js";
import { unauthorized } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import { randomToken, sha256Hex } from "../lib/encryption.js";
import { verifyPassword } from "../lib/passwords.js";
import { resolveFlags } from "./flags.js";

export async function login(ctx: AppContext, email: string, password: string) {
  const [user] = await ctx.db.select().from(users).where(eq(users.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw unauthorized("Invalid credentials");
  }
  const [clinic] = await ctx.db.select().from(clinics).where(eq(clinics.id, user.clinicId));
  if (!clinic) throw unauthorized("Clinic missing");

  const token = randomToken();
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await ctx.db.insert(sessions).values({
    id: newId(),
    clinicId: user.clinicId,
    userId: user.id,
    tokenHash: sha256Hex(token),
    expiresAt,
    createdAt: new Date(),
  });

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    user: publicUser(user),
    clinic: publicClinic(clinic),
    flags: resolveFlags(ctx),
  };
}

export async function sessionFromToken(ctx: AppContext, token: string) {
  const [session] = await ctx.db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, sha256Hex(token)), gt(sessions.expiresAt, new Date())));
  if (!session) throw unauthorized();
  const [user] = await ctx.db.select().from(users).where(eq(users.id, session.userId));
  const [clinic] = await ctx.db.select().from(clinics).where(eq(clinics.id, session.clinicId));
  if (!user || !clinic) throw unauthorized();
  return { user, clinic, session };
}

export function publicUser(user: typeof users.$inferSelect) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, clinicId: user.clinicId };
}

export function publicClinic(clinic: typeof clinics.$inferSelect) {
  return {
    id: clinic.id,
    name: clinic.name,
    legalName: clinic.legalName,
    smsIdentity: clinic.smsIdentity,
    phone: clinic.phone,
    residencyRegion: clinic.residencyRegion,
    country: clinic.country,
    province: clinic.province,
    phipaAgreementVersion: clinic.phipaAgreementVersion,
    phipaAgreementAckedAt: clinic.phipaAgreementAckedAt,
    phipaAgreementAckedBy: clinic.phipaAgreementAckedBy,
  };
}
