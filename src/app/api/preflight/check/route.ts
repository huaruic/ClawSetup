import { NextResponse } from 'next/server';
import { commandExists } from '@/lib/shell';

export async function POST() {
  const checks: Array<{ key: string; pass: boolean; message: string; suggestion?: string }> = [];

  const hasNode = await commandExists('node');
  checks.push({
    key: 'node',
    pass: hasNode,
    message: hasNode ? 'Node detected' : 'Node not found',
    ...(!hasNode && { suggestion: 'Install Node.js from https://nodejs.org/' }),
  });

  const needsCurl = process.platform !== 'win32';
  if (needsCurl) {
    const hasCurl = await commandExists('curl');
    checks.push({
      key: 'curl',
      pass: hasCurl,
      message: hasCurl ? 'curl detected' : 'curl not found',
      ...(!hasCurl && { suggestion: 'Install curl: https://curl.se/download.html' }),
    });
  }

  return NextResponse.json({
    ok: checks.every((c) => c.pass),
    checks,
  });
}
