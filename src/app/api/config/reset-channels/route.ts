import { NextResponse } from 'next/server';
import { resetOpenClawChannels } from '@/lib/openclaw-config';
import { runShell } from '@/lib/shell';

export async function POST() {
  try {
    const result = resetOpenClawChannels();

    if (result.cleared) {
      try {
        await runShell('openclaw gateway restart');
      } catch {
        // Gateway restart is best-effort; it may not be running
      }
    }

    return NextResponse.json({
      ok: true,
      cleared: result.cleared,
      configPath: result.configPath,
    });
  } catch (error: unknown) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to reset channels config',
    }, { status: 500 });
  }
}
