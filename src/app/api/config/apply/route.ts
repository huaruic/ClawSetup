import { NextResponse } from 'next/server';
import { feishuSchema, setFeishuConfig } from '@/lib/feishu';

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = feishuSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  setFeishuConfig(parsed.data);

  return NextResponse.json({
    ok: true,
    preview: {
      appId: parsed.data.appId,
      appSecret: '***',
      verificationToken: '***',
    },
  });
}
