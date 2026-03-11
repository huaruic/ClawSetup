import { NextResponse } from 'next/server';
import { getFeishuConfig } from '@/lib/feishu';

export async function GET() {
  const config = getFeishuConfig();
  if (!config) {
    return NextResponse.json({ ok: false, config: null, message: 'No configuration applied yet' });
  }
  return NextResponse.json({
    ok: true,
    config: {
      appId: config.appId,
      appSecret: config.appSecret.slice(0, 4) + '***',
      verificationToken: config.verificationToken.slice(0, 4) + '***',
    },
  });
}
