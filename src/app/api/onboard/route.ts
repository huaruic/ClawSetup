import { NextResponse } from 'next/server';
import { createTask, logTask } from '@/lib/tasks';
import { runShell } from '@/lib/shell';
import { providers } from '@/lib/providers';
import { applyOpenClawProviderSelection } from '@/lib/openclaw-config';

function normalizeSecret(value: string) {
  return value.trim().replace(/^['"]+|['"]+$/g, '');
}

export async function POST(req: Request) {
  const body = await req.json();
  const { providerId, apiKey, providerRegion, customBaseUrl, customModelId } = body as {
    providerId: string;
    apiKey: string;
    providerRegion?: string;
    customBaseUrl?: string;
    customModelId?: string;
  };
  const normalizedApiKey = normalizeSecret(apiKey);

  const provider = providers.find((p) => p.id === providerId);
  if (!provider) {
    return NextResponse.json({ ok: false, error: 'Unknown provider' }, { status: 400 });
  }
  if (!normalizedApiKey && provider.id !== 'custom') {
    return NextResponse.json({ ok: false, error: 'API key is required' }, { status: 400 });
  }

  const selectedRegion = provider.regions?.find((region) => region.id === providerRegion);
  const providerBaseUrl = provider.id === 'custom' ? customBaseUrl : selectedRegion?.baseUrl;

  // Build openclaw onboard command
  const args = [
    'openclaw onboard',
    '--non-interactive',
    '--accept-risk',
    '--flow quickstart',
    `--auth-choice ${provider.authChoice}`,
    `${provider.apiKeyFlag} '${normalizedApiKey}'`,
    '--install-daemon',
    '--skip-channels',
    '--skip-skills',
    '--skip-search',
    '--skip-ui',
    '--json',
  ];

  if (provider.id === 'custom') {
    if (customBaseUrl) args.push(`--custom-base-url '${customBaseUrl}'`);
    if (customModelId) args.push(`--custom-model-id '${customModelId}'`);
    args.push('--custom-compatibility openai');
  }

  const command = args.join(' ');

  const task = createTask('openclaw_onboard');
  task.status = 'running';
  logTask(task, 'Starting OpenClaw onboarding...');

  void (async () => {
    try {
      logTask(task, `Running: ${command}`);
      const onboardResult = await runShell(command);
      if (onboardResult.stdout) logTask(task, onboardResult.stdout);
      if (onboardResult.stderr) logTask(task, onboardResult.stderr);

      if (provider.id !== 'custom' && normalizedApiKey) {
        const result = applyOpenClawProviderSelection({
          providerId,
          apiKey: normalizedApiKey,
          ...(providerBaseUrl ? { baseUrl: providerBaseUrl } : {}),
        });
        logTask(task, `Synced provider config to ${result.configPath}`);
        if (providerBaseUrl) {
          logTask(task, `Applied provider base URL: ${providerBaseUrl}`);
        }
      }

      logTask(task, 'Running: openclaw gateway status');
      const statusResult = await runShell('openclaw gateway status');
      if (statusResult.stdout) logTask(task, statusResult.stdout);
      if (statusResult.stderr) logTask(task, statusResult.stderr);

      task.status = 'success';
      logTask(task, 'OpenClaw onboarding completed successfully.');
    } catch (err: unknown) {
      task.status = 'failed';
      if (typeof err === 'object' && err !== null) {
        const execError = err as { shortMessage?: string; message?: string; stdout?: string; stderr?: string };
        task.error = execError.shortMessage || execError.message || 'OpenClaw onboarding failed';
        if (execError.stdout) logTask(task, execError.stdout);
        if (execError.stderr) logTask(task, execError.stderr);
      } else {
        task.error = 'OpenClaw onboarding failed';
      }
      logTask(task, `Error: ${task.error}`);
    }
    task.updatedAt = new Date().toISOString();
  })();

  return NextResponse.json({ taskId: task.id, status: task.status });
}
