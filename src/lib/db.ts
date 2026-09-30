import { promises as fs } from "fs";
import path from "path";

// Dosya tabanlı basit depo — parsel-takip'teki desenin birebir kopyası.
// Her koleksiyon data/<isim>.json içinde bir dizi olarak tutulur.

const DATA_DIR = path.join(process.cwd(), "data");
const SEED_DIR = path.join(process.cwd(), "seed");

async function ensureDataFile(name: string) {
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const seedFile = path.join(SEED_DIR, `${name}.json`);
    try {
      const seed = await fs.readFile(seedFile, "utf-8");
      await fs.writeFile(file, seed, "utf-8");
    } catch {
      await fs.writeFile(file, "[]", "utf-8");
    }
  }
  return file;
}

export async function readCollection<T>(name: string): Promise<T[]> {
  const file = await ensureDataFile(name);
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw) as T[];
}

export async function writeCollection<T>(name: string, items: T[]): Promise<void> {
  const file = await ensureDataFile(name);
  await fs.writeFile(file, JSON.stringify(items, null, 2), "utf-8");
}

export async function insertOne<T extends { id: string }>(name: string, item: T): Promise<T> {
  const items = await readCollection<T>(name);
  items.push(item);
  await writeCollection(name, items);
  return item;
}

export async function updateOne<T extends { id: string }>(
  name: string,
  id: string,
  patch: Partial<T>,
): Promise<T | null> {
  const items = await readCollection<T>(name);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch };
  await writeCollection(name, items);
  return items[idx];
}

export async function deleteOne(name: string, id: string): Promise<boolean> {
  const items = await readCollection<{ id: string }>(name);
  const next = items.filter((i) => i.id !== id);
  if (next.length === items.length) return false;
  await writeCollection(name, next);
  return true;
}

export function newId(): string {
  return crypto.randomUUID();
}
