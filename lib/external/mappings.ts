import fs from "fs/promises";
import path from "path";

const MAPPINGS_DIR = path.join(process.cwd(), "cache", "mappings");
const FOTMOB_MAP_FILE = path.join(MAPPINGS_DIR, "fotmob.json");

async function ensureMappingsDir() {
  try {
    await fs.mkdir(MAPPINGS_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

export type FotmobMapping = Record<string, number>; // fplId -> fotmobId

export async function readFotmobMapping(): Promise<FotmobMapping> {
  await ensureMappingsDir();
  try {
    const raw = await fs.readFile(FOTMOB_MAP_FILE, "utf-8");
    const parsed = JSON.parse(raw) as FotmobMapping;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeFotmobMapping(map: FotmobMapping) {
  await ensureMappingsDir();
  await fs.writeFile(FOTMOB_MAP_FILE, JSON.stringify(map, null, 2), "utf-8");
}

export async function getFotmobIdForFplId(fplId: number): Promise<number | null> {
  const map = await readFotmobMapping();
  const v = map[String(fplId)];
  return Number.isFinite(v) ? v : null;
}

export async function upsertFotmobMapping(fplId: number, fotmobId: number) {
  const map = await readFotmobMapping();
  map[String(fplId)] = fotmobId;
  await writeFotmobMapping(map);
  return map;
}

