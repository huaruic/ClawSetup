import { NextResponse } from 'next/server';
import { runShell } from '@/lib/shell';
import { findFeishuPairingRequestByCode } from '@/lib/feishu-pairing';

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

const SUCCESS_MESSAGE = '🦞 配置成功，Have fun!\nErnest祝你玩得愉快~';

export async function POST(req: Request) {
  const body = await req.json();
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';

  if (!code) {
    return NextResponse.json({ ok: false, error: 'Pairing Code is required' }, { status: 400 });
  }

  const requestInfo = findFeishuPairingRequestByCode(code);
  if (!requestInfo) {
    return NextResponse.json({ ok: false, error: 'Pairing Code not found. Send another message in Feishu and try again.' }, { status: 404 });
  }

  try {
    const accountArg = requestInfo.meta?.accountId ? ` --account ${shellQuote(requestInfo.meta.accountId)}` : '';
    await runShell(`openclaw pairing approve --channel feishu${accountArg} ${shellQuote(code)}`);

    await runShell(
      `openclaw message send --channel feishu${accountArg} --target ${shellQuote(requestInfo.id)} --message ${shellQuote(SUCCESS_MESSAGE)}`,
    );

    return NextResponse.json({
      ok: true,
      message: '🦞 配置成功，Have fun! Ernest祝你玩得愉快~',
    });
  } catch (error: unknown) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to approve pairing request',
    }, { status: 500 });
  }
}
