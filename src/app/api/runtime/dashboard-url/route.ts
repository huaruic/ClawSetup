import { NextResponse } from 'next/server';
import { getOpenClawDashboardUrl } from '@/lib/openclaw-config';

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      url: getOpenClawDashboardUrl('/chat?session=main'),
    });
  } catch (error: unknown) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to resolve dashboard URL',
    }, { status: 500 });
  }
}
