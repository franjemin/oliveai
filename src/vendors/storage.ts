import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { encryptBytes, sha256Hex } from "../lib/encryption.js";

export type ObjectStore = {
  put(key: string, bytes: Buffer, contentType?: string): Promise<void>;
  delete(key: string): Promise<void>;
};

/** Local filesystem store. MinIO is used when compose is up; this keeps scaffold/tests offline. */
export function createLocalObjectStore(rootDir: string, encryptionKey: string): ObjectStore {
  return {
    async put(key, bytes) {
      const full = path.join(rootDir, key);
      await mkdir(path.dirname(full), { recursive: true });
      const sealed = encryptBytes(encryptionKey, bytes);
      await writeFile(full, sealed);
    },
    async delete(key) {
      const full = path.join(rootDir, key);
      try {
        await unlink(full);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") throw err;
      }
    },
  };
}

export function audioObjectKey(clinicId: string, visitId: string, assetId: string): string {
  return `${clinicId}/${visitId}/${assetId}.enc`;
}

export function checksumOf(bytes: Buffer): string {
  return sha256Hex(bytes);
}
