import fs from "fs/promises";
import path from "path";

type JsonValue = any;

const CACHE_ROOT = path.join(process.cwd(), "cache", "external");

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore
  }
}

function safeKey(key: string) {
  // Avoid directory traversal and illegal filename characters
  return key.replace(/[^\w.-]+/g, "_").slice(0, 180);
}

export async function readCachedJson<T>(
  source: string,
  key: string
): Promise<{ hit: true; value: T } | { hit: false; value: null }> {
  const dir = path.join(CACHE_ROOT, source);
  const file = path.join(dir, `${safeKey(key)}.json`);

  try {
    const raw = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as { meta?: { expiresAt?: number }; value?: T };
    const expiresAt = parsed?.meta?.expiresAt;

    if (typeof expiresAt === "number" && Date.now() > expiresAt) {
      return { hit: false, value: null };
    }

    if ("value" in (parsed as any)) {
      return { hit: true, value: (parsed as any).value as T };
    }

    // Back-compat for raw JSON caches
    return { hit: true, value: parsed as unknown as T };
  } catch {
    return { hit: false, value: null };
  }
}

export async function writeCachedJson<T>(
  source: string,
  key: string,
  value: T,
  ttlMs: number
) {
  const dir = path.join(CACHE_ROOT, source);
  await ensureDir(dir);

  const file = path.join(dir, `${safeKey(key)}.json`);
  const now = Date.now();
  const payload = {
    meta: {
      source,
      key,
      fetchedAt: now,
      ttlMs,
      expiresAt: now + ttlMs,
    },
    value,
  };

  await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf-8");
}

