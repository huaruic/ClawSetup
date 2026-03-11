import { NextResponse } from 'next/server';
import { feishuSchema } from '@/lib/feishu';
import { getMaskedOpenClawFeishuPreview, writeOpenClawFeishuConfig } from '@/lib/openclaw-config';
import { runShell } from '@/lib/shell';

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = feishuSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const result = writeOpenClawFeishuConfig(parsed.data);
    await runShell('openclaw gateway restart');

    return NextResponse.json({
      ok: true,
      preview: getMaskedOpenClawFeishuPreview(result.feishu),
      configPath: result.configPath,
      backupPath: result.backupPath,
    });
  } catch (error: unknown) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to write OpenClaw config',
    }, { status: 500 });
  }
}
