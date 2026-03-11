import { NextResponse } from 'next/server';
import os from 'node:os';
import { commandExists, runShell } from '@/lib/shell';

export async function GET() {
  const [hasNode, hasOpenClaw] = await Promise.all([commandExists('node'), commandExists('openclaw')]);

  let openclawVersion: string | null = null;
  if (hasOpenClaw) {
    try {
      const r = await runShell('openclaw --version');
      openclawVersion = r.stdout.trim();
    } catch {
      openclawVersion = null;
    }
  }

  return NextResponse.json({
    platform: os.platform(),
    arch: os.arch(),
    hasNode,
    nodeVersion: process.version,
    hasOpenClaw,
    openclawVersion,
  });
}
