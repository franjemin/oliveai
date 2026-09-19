import { config as loadEnv } from "dotenv";

loadEnv();

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function num(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export type FeatureFlags = {
  aftercare: boolean;
  claimsGuard: boolean;
  /** Off by default. Contract-only is not enough — express patient consent required to flip. */
  phiTrainingAllowed: boolean;
  odWriteback: boolean;
  /** Quebec Law 25 is out of v1 — flag stays false; no QC-specific flows. */
  quebecLaw25: boolean;
};

export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  databaseUrl: string;
  residencyRegion: string;
  objectStoreRegion: string;
  encryptionKey: string;
  s3: {
    endpoint?: string;
    region: string;
    bucket: string;
    accessKey?: string;
    secretKey?: string;
    forcePathStyle: boolean;
  };
  audioRetentionHours: number;
  noteTranscriptRetentionYears: number;
  flags: FeatureFlags;
  databaseSsl: boolean;
  tls: { certPath?: string; keyPath?: string };
  demo: { email: string; password: string };
};

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const flags: FeatureFlags = {
    aftercare: bool(process.env.FLAG_AFTERCARE, false),
    claimsGuard: bool(process.env.FLAG_CLAIMS_GUARD, false),
    phiTrainingAllowed: bool(process.env.FLAG_PHI_TRAINING_ALLOWED, false),
    odWriteback: bool(process.env.FLAG_OD_WRITEBACK, false),
    quebecLaw25: false,
  };

  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    host: process.env.HOST ?? "0.0.0.0",
    port: num(process.env.PORT, 3000),
    databaseUrl: process.env.DATABASE_URL ?? "postgres://olive:olive@localhost:5432/olive",
    residencyRegion: process.env.DATA_RESIDENCY_REGION ?? "ca-central-1",
    objectStoreRegion: process.env.OBJECT_STORE_REGION ?? "ca-central-1",
    encryptionKey:
      process.env.ENCRYPTION_KEY ??
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "ca-central-1",
      bucket: process.env.S3_BUCKET ?? "olive-audio",
      accessKey: process.env.S3_ACCESS_KEY,
      secretKey: process.env.S3_SECRET_KEY,
      forcePathStyle: bool(process.env.S3_FORCE_PATH_STYLE, true),
    },
    databaseSsl: bool(process.env.DATABASE_SSL, false),
    tls: {
      certPath: process.env.TLS_CERT_PATH,
      keyPath: process.env.TLS_KEY_PATH,
    },
    audioRetentionHours: num(process.env.AUDIO_RETENTION_HOURS, 24),
    noteTranscriptRetentionYears: num(process.env.NOTE_TRANSCRIPT_RETENTION_YEARS, 10),
    flags,
    demo: {
      email: process.env.DEMO_EMAIL ?? "od@demo.olive.local",
      password: process.env.DEMO_PASSWORD ?? "demo",
    },
    ...overrides,
  };
}
