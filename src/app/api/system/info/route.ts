import { NextResponse } from 'next/server';
import os from 'node:os';
import { commandExists } from '@/lib/shell';

export async function GET() {
  const platform = os.platform();
  const arch = os.arch();
  const release = os.release();
  const nodeVersion = process.version;
  const shell = process.env.SHELL || (platform === 'win32' ? 'powershell' : '/bin/sh');
  const hasOpenClaw = await commandExists('openclaw');

  const platformLabel =
    platform === 'darwin' ? 'macOS'
    : platform === 'win32' ? 'Windows'
    : platform === 'linux' ? 'Linux'
    : platform;

  return NextResponse.json({
    platform: platformLabel,
    arch,
    release,
    nodeVersion,
    shell,
    openclawInstalled: hasOpenClaw,
  });
}
