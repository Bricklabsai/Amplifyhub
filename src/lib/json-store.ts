import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export async function readJsonStore<T>(filename: string, fallback: T): Promise<T> {
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, filename);
  try {
    const content = await readFile(file, "utf8");
    return JSON.parse(content) as T;
  } catch {
    await mkdir(dir, { recursive: true });
    await writeFile(file, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

export async function writeJsonStore<T>(filename: string, value: T): Promise<void> {
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, filename);
  await mkdir(dir, { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2), "utf8");
}
