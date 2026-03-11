import { NextResponse } from 'next/server';
import { commandExists } from '@/lib/shell';

export async function POST() {
  const checks: Array<{ key: string; pass: boolean; message: string; suggestion?: string; action?: string }> = [];

  const hasNode = await commandExists('node');
  checks.push({
    key: 'node',
    pass: hasNode,
    message: hasNode ? 'Node detected' : 'Node not found',
    ...(!hasNode && { suggestion: 'Install Node.js from https://nodejs.org/', action: 'install_node' }),
  });

  const hasOpenClaw = await commandExists('openclaw');
  checks.push({
    key: 'openclaw',
    pass: hasOpenClaw,
    message: hasOpenClaw ? 'OpenClaw detected' : 'OpenClaw not found',
    ...(!hasOpenClaw && { suggestion: 'Click "Install OpenClaw" to install automatically', action: 'install_openclaw' }),
  });

  const hasNpx = await commandExists('npx');
  checks.push({
    key: 'npx',
    pass: hasNpx,
    message: hasNpx ? 'npx detected' : 'npx not found',
    ...(!hasNpx && { suggestion: 'npx comes with Node.js. Please install Node.js first.', action: 'install_node' }),
  });

  return NextResponse.json({
    ok: checks.every((c) => c.pass),
    checks,
    nextAction: hasOpenClaw ? 'install_feishu_plugin' : 'install_openclaw',
  });
}
