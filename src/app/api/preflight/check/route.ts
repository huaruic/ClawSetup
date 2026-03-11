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

  const hasNpm = await commandExists('npm');
  checks.push({
    key: 'npm',
    pass: hasNpm,
    message: hasNpm ? 'npm detected' : 'npm not found',
    ...(!hasNpm && { suggestion: 'npm comes with Node.js. Please install Node.js first.' }),
  });

  return NextResponse.json({
    ok: checks.every((c) => c.pass),
    checks,
  });
}
