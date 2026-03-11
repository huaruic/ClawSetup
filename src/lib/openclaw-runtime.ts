import { commandExists, runShell } from '@/lib/shell';

export type OpenClawGatewayReadiness = {
  installed: boolean;
  ready: boolean;
  summary: string;
  output: string;
};

function normalizeOutput(stdout?: string, stderr?: string) {
  return [stdout, stderr].filter((value): value is string => typeof value === 'string' && value.trim().length > 0).join('\n').trim();
}

function isGatewayReady(output: string) {
  const text = output.toLowerCase();

  if (!text) return false;
  if (text.includes('service is loaded but not running')) return false;
  if (text.includes('rpc probe: failed')) return false;
  if (text.includes('runtime: stopped')) return false;
  if (text.includes('gateway closed')) return false;
  if (text.includes('runtime: running')) return true;
  if (text.includes('rpc probe: ok')) return true;

  return false;
}

export async function getOpenClawGatewayReadiness(): Promise<OpenClawGatewayReadiness> {
  const installed = await commandExists('openclaw');
  if (!installed) {
    return {
      installed: false,
      ready: false,
      summary: 'OpenClaw CLI is not installed',
      output: '',
    };
  }

  try {
    const result = await runShell('openclaw gateway status');
    const output = normalizeOutput(result.stdout, result.stderr);
    const ready = isGatewayReady(output);

    return {
      installed: true,
      ready,
      summary: ready ? 'OpenClaw gateway is running' : 'OpenClaw gateway is not ready',
      output,
    };
  } catch (error: unknown) {
    const commandError = error as {
      shortMessage?: string;
      message?: string;
      stdout?: string;
      stderr?: string;
    };
    const output = normalizeOutput(commandError.stdout, commandError.stderr);
    const ready = isGatewayReady(output);

    return {
      installed: true,
      ready,
      summary: ready
        ? 'OpenClaw gateway is running'
        : commandError.shortMessage || commandError.message || 'Failed to check OpenClaw gateway status',
      output,
    };
  }
}
