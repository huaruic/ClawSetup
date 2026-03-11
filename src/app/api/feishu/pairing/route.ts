import { NextResponse } from 'next/server';
import { getLatestFeishuPairingRequest } from '@/lib/feishu-pairing';

export async function GET() {
  const request = getLatestFeishuPairingRequest();

  return NextResponse.json({
    ok: true,
    request,
  });
}
