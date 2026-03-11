import { NextResponse } from 'next/server';
import { runShell } from '@/lib/shell';

export async function GET() {
  try {
    const r = await runShell('openclaw gateway status');
    return NextResponse.json({ ok: true, status: r.stdout || 'running' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, status: 'unknown', error: err?.shortMessage || err?.message || 'status_failed' });
  }
}
