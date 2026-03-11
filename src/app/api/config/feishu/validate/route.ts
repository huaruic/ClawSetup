import { NextResponse } from 'next/server';
import { exchangeFeishuTenantToken, feishuSchema, verifyFeishuBaseApi } from '@/lib/feishu';

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = feishuSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const tokenResult = await exchangeFeishuTenantToken({
    appId: parsed.data.appId,
    appSecret: parsed.data.appSecret,
  });

  if (!tokenResult.ok || !tokenResult.token) {
    return NextResponse.json({
      ok: false,
      error: tokenResult.msg ?? 'Failed to exchange tenant access token',
    }, { status: 400 });
  }

  const baseApiResult = await verifyFeishuBaseApi(tokenResult.token);
  if (!baseApiResult.ok) {
    return NextResponse.json({
      ok: false,
      error: baseApiResult.msg ?? 'Failed to call Feishu bot info API',
    }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
