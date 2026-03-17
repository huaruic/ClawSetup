'use client';

/**
 * Service layer replacing Next.js API routes.
 * All functions are called directly from page components.
 */

import { fetch } from '@tauri-apps/plugin-http';
import { runShell, runOpenClaw, spawnOpenClaw, openclawSidecarAvailable } from './shell';

/** Extract error message from any thrown value (Tauri plugins throw strings, not Error instances) */
function extractError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
    if (typeof record.error === 'string') return record.error;
    try { return JSON.stringify(error); } catch { /* ignore */ }
  }
  return fallback;
}
import { feishuSchema, exchangeFeishuTenantToken, verifyFeishuBaseApi } from './feishu';
import type { FeishuConfig } from './feishu';
import {
  getOpenClawFeishuConfig,
  hasOpenClawFeishuCredentials,
  getMaskedOpenClawFeishuPreview,
  writeOpenClawFeishuConfig,
  applyOpenClawProviderSelection,
  resetOpenClawChannels,
  getOpenClawDashboardUrl,
} from './openclaw-config';
import { getOpenClawGatewayReadiness } from './openclaw-runtime';
import { getLatestFeishuPairingRequest, findFeishuPairingRequestByCode } from './feishu-pairing';
import { providers } from './providers';

// ─── System ──────────────────────────────────────────────

export type SystemInfo = {
  platform: string;
  arch: string;
  release: string;
  shell: string;
  openclawInstalled: boolean;
};

export async function getSystemInfo(): Promise<SystemInfo> {
  let shell = '/bin/zsh';
  try {
    const r = await runShell('echo $SHELL');
    if (r.exitCode === 0 && r.stdout.trim()) {
      shell = r.stdout.trim();
    }
  } catch { /* ignore */ }

  let platform = 'macOS';
  let arch = 'unknown';
  let release = '';
  try {
    const r = await runShell('uname -srm');
    if (r.exitCode === 0) {
      const parts = r.stdout.trim().split(' ');
      platform = parts[0] === 'Darwin' ? 'macOS' : parts[0];
      release = parts[1] ?? '';
      arch = parts[2] ?? '';
    }
  } catch { /* ignore */ }

  const openclawInstalled = await openclawSidecarAvailable();

  return { platform, arch, release, shell, openclawInstalled };
}

// ─── Runtime ─────────────────────────────────────────────

export type RuntimeStatus = {
  ok: boolean;
  installed: boolean;
  ready: boolean;
  summary: string;
  output: string;
};

export async function getRuntimeStatus(): Promise<RuntimeStatus> {
  const readiness = await getOpenClawGatewayReadiness();
  return {
    ok: readiness.installed && readiness.ready,
    installed: readiness.installed,
    ready: readiness.ready,
    summary: readiness.summary,
    output: readiness.output,
  };
}

export async function getDashboardUrl(): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const url = await getOpenClawDashboardUrl('/chat?session=main');
    return { ok: true, url };
  } catch (error: unknown) {
    return { ok: false, error: extractError(error, 'Failed to get dashboard URL') };
  }
}

// ─── Install OpenClaw ────────────────────────────────────

export async function installOpenClaw(
  onLog: (line: string) => void,
): Promise<'success' | 'failed'> {
  // OpenClaw is bundled as a Tauri sidecar — no network install needed.
  onLog('OpenClaw is bundled with the app. Verifying sidecar binary...');
  try {
    const versionResult = await runOpenClaw(['--version']);
    if (versionResult.exitCode === 0) {
      onLog('OpenClaw sidecar binary is ready.');
      if (versionResult.stdout.trim()) onLog(versionResult.stdout.trim());
      return 'success';
    }
    if (versionResult.stdout.trim()) onLog(versionResult.stdout.trim());
    if (versionResult.stderr.trim()) onLog(versionResult.stderr.trim());
    onLog(`Error: OpenClaw sidecar binary returned exit code ${versionResult.exitCode}.`);
    return 'failed';
  } catch (error: unknown) {
    onLog(`Error: ${extractError(error, 'Unknown error')}`);
    return 'failed';
  }
}

// ─── Onboarding ──────────────────────────────────────────

export async function runOnboarding(
  config: {
    providerId: string;
    apiKey: string;
    providerRegion?: string;
    customBaseUrl?: string;
    customModelId?: string;
  },
  onLog: (line: string) => void,
): Promise<'success' | 'failed'> {
  const resolvedProvider = resolveProviderSelection(config);
  if (!resolvedProvider.ok) {
    onLog(`Error: ${resolvedProvider.error}`);
    return 'failed';
  }

  const { provider, normalizedApiKey } = resolvedProvider;

  const args: string[] = [
    'onboard',
    '--non-interactive',
    '--accept-risk',
    '--flow', 'quickstart',
    '--auth-choice', provider.authChoice,
    provider.apiKeyFlag, normalizedApiKey,
    '--install-daemon',
    '--skip-channels',
    '--skip-skills',
    '--skip-search',
    '--skip-ui',
    '--json',
  ];

  if (provider.id === 'custom') {
    if (config.customBaseUrl) args.push('--custom-base-url', config.customBaseUrl);
    if (config.customModelId) args.push('--custom-model-id', config.customModelId);
    args.push('--custom-compatibility', 'openai');
  }

  onLog('Starting OpenClaw onboarding...');
  onLog(`Running: openclaw ${args.join(' ')}`);

  try {
    const exitCode = await spawnOpenClaw(args, onLog);
    if (exitCode !== 0) {
      onLog('Error: OpenClaw onboarding command failed');
      return 'failed';
    }

    const syncResult = await syncProviderConfig(config);
    if (!syncResult.ok) {
      onLog(`Error: ${syncResult.error ?? 'Failed to sync provider config'}`);
      return 'failed';
    }
    onLog('Synced provider config');

    // Check gateway status via sidecar
    onLog('Checking gateway status...');
    const statusResult = await runOpenClaw(['gateway', 'status']);
    if (statusResult.stdout) onLog(statusResult.stdout);
    if (statusResult.stderr) onLog(statusResult.stderr);

    onLog('OpenClaw onboarding completed successfully.');
    return 'success';
  } catch (error: unknown) {
    const msg = extractError(error, 'OpenClaw onboarding failed');
    onLog(`Error: ${msg}`);
    return 'failed';
  }
}

function resolveProviderSelection(config: {
  providerId: string;
  apiKey: string;
  providerRegion?: string;
  customBaseUrl?: string;
}) {
  const provider = providers.find((item) => item.id === config.providerId);
  if (!provider) {
    return { ok: false as const, error: 'Unknown provider' };
  }

  const normalizedApiKey = config.apiKey.trim().replace(/^['"]+|['"]+$/g, '');
  const selectedRegion = provider.regions?.find((region) => region.id === config.providerRegion);
  const providerBaseUrl = provider.id === 'custom' ? config.customBaseUrl?.trim() : selectedRegion?.baseUrl;

  if (provider.regions?.length && !providerBaseUrl) {
    return { ok: false as const, error: 'Please choose a region before continuing' };
  }

  if (!normalizedApiKey && provider.id !== 'custom') {
    return { ok: false as const, error: 'API key is required' };
  }

  return {
    ok: true as const,
    provider,
    normalizedApiKey,
    providerBaseUrl,
  };
}

export async function syncProviderConfig(config: {
  providerId: string;
  apiKey: string;
  providerRegion?: string;
  customBaseUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resolvedProvider = resolveProviderSelection(config);
  if (!resolvedProvider.ok) {
    return { ok: false, error: resolvedProvider.error };
  }

  const { provider, normalizedApiKey, providerBaseUrl } = resolvedProvider;

  try {
    await applyOpenClawProviderSelection({
      providerId: provider.id,
      apiKey: normalizedApiKey,
      ...(providerBaseUrl ? { baseUrl: providerBaseUrl } : {}),
    });
    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      error: extractError(error, 'Failed to sync provider config'),
    };
  }
}

// ─── Provider Validation ─────────────────────────────────

function joinUrl(baseUrl: string, pathname: string) {
  return `${baseUrl.replace(/\/+$/, '')}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function getErrorMessage(body: unknown): string {
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const error = record.error;
    if (typeof error === 'string' && error.trim()) return error;
    if (error && typeof error === 'object') {
      const nested = error as Record<string, unknown>;
      if (typeof nested.message === 'string' && nested.message.trim()) return nested.message;
      if (typeof nested.code === 'string' && nested.code.trim()) return nested.code;
    }
    if (typeof record.message === 'string' && record.message.trim()) return record.message;
  }
  return '';
}

export async function validateProvider(config: {
  providerId: string;
  apiKey: string;
  providerRegion?: string;
  customBaseUrl?: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  const resolvedProvider = resolveProviderSelection(config);
  if (!resolvedProvider.ok) {
    return {
      ok: false,
      error: resolvedProvider.error,
    };
  }

  const { normalizedApiKey, providerBaseUrl: baseUrl } = resolvedProvider;

  if (!baseUrl) {
    return { ok: false, error: 'Validation is not configured for this provider' };
  }

  try {
    const response = await fetch(joinUrl(baseUrl, '/models'), {
      method: 'GET',
      headers: { Authorization: `Bearer ${normalizedApiKey}` },
    });

    const bodyText = await response.text();
    let parsed: unknown = bodyText;
    try {
      parsed = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      parsed = bodyText;
    }

    if (!response.ok) {
      return { ok: false, error: getErrorMessage(parsed) || `HTTP ${response.status}: Validation failed` };
    }

    const data = parsed && typeof parsed === 'object' ? (parsed as { data?: unknown }) : {};
    const modelCount = Array.isArray(data.data) ? data.data.length : undefined;

    return {
      ok: true,
      message:
        typeof modelCount === 'number'
          ? `Validated successfully. ${modelCount} models available.`
          : 'Validated successfully.',
    };
  } catch (error: unknown) {
    return { ok: false, error: extractError(error, 'Provider validation failed') };
  }
}

// ─── Config ──────────────────────────────────────────────

export async function previewConfig() {
  const config = await getOpenClawFeishuConfig();
  if (!config) return { ok: false, config: null };
  return { ok: true, config: getMaskedOpenClawFeishuPreview(config) };
}

export async function validateFeishuCredentials(creds: { appId: string; appSecret: string }) {
  const parsed = feishuSchema.safeParse(creds);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid Feishu credentials' };
  }

  const tokenResult = await exchangeFeishuTenantToken(creds);
  if (!tokenResult.ok || !tokenResult.token) {
    return { ok: false, error: tokenResult.msg ?? 'Failed to exchange tenant access token' };
  }

  const baseResult = await verifyFeishuBaseApi(tokenResult.token);
  if (!baseResult.ok) {
    return { ok: false, error: baseResult.msg ?? 'Failed to verify Feishu bot API' };
  }

  return { ok: true, botOpenId: baseResult.openId, botName: baseResult.botName };
}

export async function applyFeishuConfig(config: FeishuConfig) {
  const parsed = feishuSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid Feishu configuration' };
  }

  // Write feishu config into OpenClaw's openclaw.json
  let result;
  try {
    result = await writeOpenClawFeishuConfig(parsed.data);
  } catch (error: unknown) {
    return { ok: false, error: `Failed to write OpenClaw config: ${extractError(error, 'unknown')}` };
  }

  // Step 3: Restart gateway (best-effort, give it a moment)
  try {
    await runOpenClaw(['gateway', 'restart']);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch { /* best-effort */ }

  return {
    ok: true,
    preview: getMaskedOpenClawFeishuPreview(result.feishu),
  };
}

export async function resetChannels() {
  try {
    const result = await resetOpenClawChannels();
    // Best-effort restart
    try {
      await runOpenClaw(['gateway', 'restart']);
    } catch { /* ignore */ }
    return { ok: true, cleared: result.cleared };
  } catch (error: unknown) {
    return { ok: false, error: extractError(error, 'Failed to reset channels') };
  }
}

// ─── Runtime Verify ──────────────────────────────────────

export async function verifyRuntime() {
  const latestFeishuConfig = await getOpenClawFeishuConfig();
  const configValid = hasOpenClawFeishuCredentials(latestFeishuConfig);
  const hasOpenClaw = await openclawSidecarAvailable();

  // Check gateway status with retry (gateway may still be restarting)
  let gatewayHealthy = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await runOpenClaw(['gateway', 'status']);
      if (r.exitCode === 0) {
        gatewayHealthy = true;
        break;
      }
    } catch { /* ignore */ }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  let tokenExchangePassed = false;
  let baseApiPassed = false;
  let errorMessage: string | null = null;

  if (configValid && latestFeishuConfig && typeof latestFeishuConfig.appSecret === 'string') {
    try {
      const tokenResult = await exchangeFeishuTenantToken({
        appId: latestFeishuConfig.appId as string,
        appSecret: latestFeishuConfig.appSecret,
      });
      tokenExchangePassed = tokenResult.ok;

      if (!tokenResult.ok) {
        errorMessage = tokenResult.msg ?? 'Failed to exchange tenant access token';
      }

      if (tokenResult.ok && tokenResult.token) {
        const baseResult = await verifyFeishuBaseApi(tokenResult.token);
        baseApiPassed = baseResult.ok;
        if (!baseResult.ok) {
          errorMessage = baseResult.msg ?? 'Failed to call Feishu base API';
        }
      }
    } catch (err: unknown) {
      errorMessage = extractError(err, 'Network error');
    }
  } else if (!hasOpenClaw) {
    errorMessage = 'OpenClaw is not installed';
  } else if (!configValid) {
    errorMessage = 'Feishu config has not been written into OpenClaw';
  }

  if (!gatewayHealthy && hasOpenClaw && !errorMessage) {
    errorMessage = 'Gateway is not running';
  }

  const ok = configValid && hasOpenClaw && gatewayHealthy && tokenExchangePassed && baseApiPassed;
  return { ok, errorMessage };
}

// ─── Feishu Pairing ──────────────────────────────────────

export async function getLatestPairing() {
  const request = await getLatestFeishuPairingRequest();
  return { ok: true, request };
}

export async function approvePairing(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return { ok: false, error: 'Pairing Code is required' };
  }

  const requestInfo = await findFeishuPairingRequestByCode(normalizedCode);
  if (!requestInfo) {
    return { ok: false, error: 'Pairing Code not found. Send another message in Feishu and try again.' };
  }

  try {
    const approveArgs = ['pairing', 'approve', '--channel', 'feishu'];
    if (requestInfo.meta?.accountId) {
      approveArgs.push('--account', requestInfo.meta.accountId);
    }
    approveArgs.push(normalizedCode);
    await runOpenClaw(approveArgs);

    const successMessage = '🦞 配置成功，Have fun!\nErnest祝你玩得愉快~';
    const sendArgs = ['message', 'send', '--channel', 'feishu'];
    if (requestInfo.meta?.accountId) {
      sendArgs.push('--account', requestInfo.meta.accountId);
    }
    sendArgs.push('--target', requestInfo.id, '--message', successMessage);
    await runOpenClaw(sendArgs);

    return { ok: true, message: '🦞 配置成功，Have fun! Ernest祝你玩得愉快~' };
  } catch (error: unknown) {
    return { ok: false, error: extractError(error, 'Failed to approve pairing request') };
  }
}
