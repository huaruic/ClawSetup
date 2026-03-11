import { NextResponse } from 'next/server';
import { getMaskedOpenClawFeishuPreview, getOpenClawFeishuConfig } from '@/lib/openclaw-config';

export async function GET() {
  try {
    const config = getOpenClawFeishuConfig();
    if (!config) {
      return NextResponse.json({ ok: false, config: null, message: 'No OpenClaw Feishu configuration applied yet' });
    }

    return NextResponse.json({
      ok: true,
      config: getMaskedOpenClawFeishuPreview(config),
    });
  } catch (error: unknown) {
    return NextResponse.json({
      ok: false,
      config: null,
      message: error instanceof Error ? error.message : 'Failed to read OpenClaw config',
    }, { status: 500 });
  }
}
