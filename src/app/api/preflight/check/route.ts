import { NextResponse } from 'next/server';
import { commandExists, getNodeVersion } from '@/lib/shell';

const MIN_NODE_MAJOR = 22;

export async function POST() {
  const checks: Array<{ key: string; pass: boolean; message: string; suggestion?: string }> = [];

  const hasNode = await commandExists('node');
  const nodeVersion = hasNode ? await getNodeVersion() : null;
  const nodeMajor = nodeVersion ? parseInt(nodeVersion.split('.')[0], 10) : 0;
  const nodeVersionOk = hasNode && nodeMajor >= MIN_NODE_MAJOR;

  checks.push({
    key: 'node',
    pass: nodeVersionOk,
    message: nodeVersionOk
      ? `Node v${nodeVersion} detected`
      : hasNode
        ? `Node v${nodeVersion} detected, but >= ${MIN_NODE_MAJOR}.0.0 is required`
        : 'Node not found',
    ...(!nodeVersionOk && {
      suggestion: hasNode
        ? `Upgrade Node.js to v${MIN_NODE_MAJOR}+ from https://nodejs.org/en/download`
        : 'Install Node.js from https://nodejs.org/',
    }),
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
