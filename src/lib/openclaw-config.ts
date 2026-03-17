'use client';

import type { FeishuConfig } from '@/lib/feishu';
import { readJsonFile, writeJsonFile, backupFile, fileExists } from './tauri-fs';

export type OpenClawSecretValue = string | { source?: string; id?: string; provider?: string };

export type OpenClawFeishuConfig = {
  enabled?: boolean;
  appId?: string;
  appSecret?: OpenClawSecretValue;
  verificationToken?: OpenClawSecretValue;
  domain?: string;
  connectionMode?: 'websocket' | 'webhook';
  webhookPath?: string;
  dmPolicy?: string;
  groupPolicy?: string;
  requireMention?: boolean;
};

export type OpenClawConfig = {
  auth?: {
    profiles?: Record<string, unknown>;
  };
  models?: {
    providers?: Record<string, unknown>;
  };
  channels?: Record<string, unknown> & {
    feishu?: OpenClawFeishuConfig;
  };
  gateway?: {
    port?: number;
    auth?: {
      mode?: string;
      token?: OpenClawSecretValue;
    };
  };
  [key: string]: unknown;
};

// Relative paths from $HOME
const OPENCLAW_CONFIG = '.openclaw/openclaw.json';
const OPENCLAW_CONFIG_BACKUP = '.openclaw/openclaw.json.bak.clawsetup';
const AUTH_PROFILES = '.openclaw/agents/main/agent/auth-profiles.json';
const AUTH_PROFILES_BACKUP = '.openclaw/agents/main/agent/auth-profiles.json.bak.clawsetup';
const AGENT_MODELS = '.openclaw/agents/main/agent/models.json';
const AGENT_MODELS_BACKUP = '.openclaw/agents/main/agent/models.json.bak.clawsetup';
const FEISHU_PAIRING = '.openclaw/credentials/feishu-pairing.json';
const FEISHU_ALLOWFROM = '.openclaw/credentials/feishu-default-allowFrom.json';
const DEVICES_PAIRED = '.openclaw/devices/paired.json';

type OpenClawAuthProfilesStore = {
  version?: number;
  profiles?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
};

type OpenClawAgentModelsStore = {
  providers?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function maskSecretValue(value: OpenClawSecretValue | undefined) {
  if (!value) return '';
  if (typeof value === 'string') {
    return value.length <= 4 ? '***' : `${value.slice(0, 4)}***`;
  }
  return 'configured';
}

export async function loadOpenClawConfig(): Promise<OpenClawConfig | null> {
  return readJsonFile<OpenClawConfig>(OPENCLAW_CONFIG);
}

export async function getOpenClawFeishuConfig(): Promise<OpenClawFeishuConfig | null> {
  const config = await loadOpenClawConfig();
  if (!config || !isObject(config.channels) || !isObject(config.channels.feishu)) {
    return null;
  }
  return config.channels.feishu as OpenClawFeishuConfig;
}

export function hasOpenClawFeishuCredentials(config: OpenClawFeishuConfig | null) {
  return Boolean(
    config?.enabled &&
      typeof config.appId === 'string' &&
      config.appId.trim() &&
      typeof config.appSecret === 'string' &&
      config.appSecret.trim(),
  );
}

export function getMaskedOpenClawFeishuPreview(config: OpenClawFeishuConfig | null) {
  if (!config) return null;
  return {
    appId: typeof config.appId === 'string' ? config.appId : '',
    appSecret: maskSecretValue(config.appSecret),
    verificationToken: maskSecretValue(config.verificationToken),
    connectionMode: config.connectionMode ?? 'websocket',
    domain: config.domain ?? 'feishu',
  };
}

export async function writeOpenClawFeishuConfig(feishuConfig: FeishuConfig) {
  const currentConfig = (await loadOpenClawConfig()) ?? {};
  const currentChannels = isObject(currentConfig.channels) ? currentConfig.channels : {};
  const currentFeishu = isObject(currentChannels.feishu)
    ? (currentChannels.feishu as OpenClawFeishuConfig)
    : null;

  const nextFeishuConfig: OpenClawFeishuConfig = {
    ...currentFeishu,
    enabled: true,
    appId: feishuConfig.appId,
    appSecret: feishuConfig.appSecret,
    ...(feishuConfig.verificationToken ? { verificationToken: feishuConfig.verificationToken } : {}),
    domain: currentFeishu?.domain ?? 'feishu',
    connectionMode: 'websocket',
    dmPolicy: currentFeishu?.dmPolicy ?? 'pairing',
    groupPolicy: currentFeishu?.groupPolicy ?? 'open',
    requireMention: currentFeishu?.requireMention ?? true,
  };
  if (!feishuConfig.verificationToken) {
    delete nextFeishuConfig.verificationToken;
  }
  delete nextFeishuConfig.webhookPath;

  const nextConfig: OpenClawConfig = {
    ...currentConfig,
    channels: {
      ...currentChannels,
      feishu: nextFeishuConfig,
    },
  };

  await backupFile(OPENCLAW_CONFIG, OPENCLAW_CONFIG_BACKUP);
  await writeJsonFile(OPENCLAW_CONFIG, nextConfig);

  return {
    config: nextConfig,
    feishu: nextFeishuConfig,
    backupExists: await fileExists(OPENCLAW_CONFIG_BACKUP),
  };
}

export async function applyOpenClawProviderSelection(params: {
  providerId: string;
  apiKey: string;
  baseUrl?: string;
}) {
  const config = (await loadOpenClawConfig()) ?? {};
  const authProfiles =
    (await readJsonFile<OpenClawAuthProfilesStore>(AUTH_PROFILES)) ?? { version: 1, profiles: {} };
  const agentModels =
    (await readJsonFile<OpenClawAgentModelsStore>(AGENT_MODELS)) ?? { providers: {} };

  const nextConfigProviders = isObject(config.models?.providers) ? config.models.providers : {};
  const nextAuthProfiles = isObject(authProfiles.profiles) ? authProfiles.profiles : {};
  const nextAgentProviders = isObject(agentModels.providers) ? agentModels.providers : {};
  const profileId = `${params.providerId}:default`;
  const currentConfigProvider: Record<string, unknown> = isObject(nextConfigProviders[params.providerId])
    ? (nextConfigProviders[params.providerId] as Record<string, unknown>)
    : {};
  const currentAuthProfile: Record<string, unknown> = isObject(nextAuthProfiles[profileId])
    ? (nextAuthProfiles[profileId] as Record<string, unknown>)
    : {};
  const currentAgentProvider: Record<string, unknown> = isObject(nextAgentProviders[params.providerId])
    ? (nextAgentProviders[params.providerId] as Record<string, unknown>)
    : {};

  const nextConfig: OpenClawConfig = {
    ...config,
    auth: {
      ...(isObject(config.auth) ? config.auth : {}),
      profiles: {
        ...(isObject(config.auth?.profiles) ? config.auth.profiles : {}),
        [profileId]: {
          ...(isObject(config.auth?.profiles?.[profileId]) ? config.auth?.profiles?.[profileId] : {}),
          provider: params.providerId,
          mode: 'api_key',
        },
      },
    },
    models: {
      ...(isObject(config.models) ? config.models : {}),
      providers: {
        ...nextConfigProviders,
        [params.providerId]: {
          ...currentConfigProvider,
          ...(params.baseUrl ? { baseUrl: params.baseUrl } : {}),
        },
      },
    },
  };

  const nextAuthProfileStore: OpenClawAuthProfilesStore = {
    ...authProfiles,
    profiles: {
      ...nextAuthProfiles,
      [profileId]: {
        ...currentAuthProfile,
        type: 'api_key',
        provider: params.providerId,
        key: params.apiKey,
      },
    },
  };

  const nextAgentModels: OpenClawAgentModelsStore = {
    ...agentModels,
    providers: {
      ...nextAgentProviders,
      [params.providerId]: {
        ...currentAgentProvider,
        ...(params.baseUrl ? { baseUrl: params.baseUrl } : {}),
        apiKey: params.apiKey,
      },
    },
  };

  await backupFile(OPENCLAW_CONFIG, OPENCLAW_CONFIG_BACKUP);
  await backupFile(AUTH_PROFILES, AUTH_PROFILES_BACKUP);
  await backupFile(AGENT_MODELS, AGENT_MODELS_BACKUP);

  await writeJsonFile(OPENCLAW_CONFIG, nextConfig);
  await writeJsonFile(AUTH_PROFILES, nextAuthProfileStore);
  await writeJsonFile(AGENT_MODELS, nextAgentModels);
}

export async function resetOpenClawChannels() {
  const config = await loadOpenClawConfig();
  if (!config) return { cleared: false };

  await backupFile(OPENCLAW_CONFIG, OPENCLAW_CONFIG_BACKUP);
  const nextConfig: OpenClawConfig = { ...config };
  delete nextConfig.channels;
  await writeJsonFile(OPENCLAW_CONFIG, nextConfig);

  if (await fileExists(FEISHU_PAIRING)) {
    await writeJsonFile(FEISHU_PAIRING, { version: 1, requests: [] });
  }
  if (await fileExists(FEISHU_ALLOWFROM)) {
    await writeJsonFile(FEISHU_ALLOWFROM, { version: 1, allowFrom: [] });
  }

  // Remove feishu-originated devices from paired devices
  const paired = await readJsonFile<Record<string, Record<string, unknown>>>(DEVICES_PAIRED);
  if (paired && isObject(paired)) {
    const nextPaired: Record<string, unknown> = {};
    for (const [id, device] of Object.entries(paired)) {
      if (!isObject(device)) continue;
      const clientId = typeof device.clientId === 'string' ? device.clientId : '';
      if (!clientId.startsWith('feishu')) {
        nextPaired[id] = device;
      }
    }
    await writeJsonFile(DEVICES_PAIRED, nextPaired);
  }

  return { cleared: true };
}

export async function getOpenClawDashboardUrl(pathname = '/') {
  const config = await loadOpenClawConfig();
  const port = typeof config?.gateway?.port === 'number' ? config.gateway.port : 18789;
  const authMode = config?.gateway?.auth?.mode;
  const authToken = config?.gateway?.auth?.token;
  const pathWithLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const baseUrl = `http://127.0.0.1:${port}${pathWithLeadingSlash}`;

  if (authMode === 'token' && typeof authToken === 'string' && authToken.trim()) {
    return `${baseUrl}#token=${encodeURIComponent(authToken)}`;
  }

  return baseUrl;
}
