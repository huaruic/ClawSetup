'use client';

import {
  readTextFile,
  writeTextFile,
  exists,
  mkdir,
  copyFile,
  BaseDirectory,
} from '@tauri-apps/plugin-fs';

const baseDir = BaseDirectory.Home;

export async function readJsonFile<T>(relativePath: string): Promise<T | null> {
  try {
    const fileExists = await exists(relativePath, { baseDir });
    if (!fileExists) return null;
    const text = await readTextFile(relativePath, { baseDir });
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function writeJsonFile(relativePath: string, value: unknown): Promise<void> {
  const dir = relativePath.substring(0, relativePath.lastIndexOf('/'));
  if (dir) {
    await mkdir(dir, { baseDir, recursive: true });
  }
  await writeTextFile(relativePath, JSON.stringify(value, null, 2), { baseDir });
}

export async function fileExists(relativePath: string): Promise<boolean> {
  return exists(relativePath, { baseDir });
}

export async function backupFile(srcPath: string, destPath: string): Promise<void> {
  try {
    const srcExists = await exists(srcPath, { baseDir });
    if (!srcExists) return;
    // Ensure destination directory exists
    const destDir = destPath.substring(0, destPath.lastIndexOf('/'));
    if (destDir) {
      await mkdir(destDir, { baseDir, recursive: true });
    }
    await copyFile(srcPath, destPath, { fromPathBaseDir: baseDir, toPathBaseDir: baseDir });
  } catch {
    // Backup is best-effort, don't block the main operation
  }
}
