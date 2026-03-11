import { NextResponse } from 'next/server';
import { getOpenClawGatewayReadiness } from '@/lib/openclaw-runtime';

export async function GET() {
  try {
    const readiness = await getOpenClawGatewayReadiness();
    return NextResponse.json({
      ok: readiness.ready,
      installed: readiness.installed,
      ready: readiness.ready,
      summary: readiness.summary,
      status: readiness.output || readiness.summary,
      output: readiness.output,
    });
  } catch (err: unknown) {
    const error = err as { shortMessage?: string; message?: string };
    return NextResponse.json({
      ok: false,
      installed: false,
      ready: false,
      status: 'unknown',
      output: '',
      error: error.shortMessage || error.message || 'status_failed',
    });
  }
}
