import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FeishuConfig } from '@/lib/feishu';

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

const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw');
const OPENCLAW_CONFIG_FILE = path.join(OPENCLAW_DIR, 'openclaw.json');
const OPENCLAW_CONFIG_BACKUP_FILE = path.join(OPENCLAW_DIR, 'openclaw.json.bak.clawsetup');
const OPENCLAW_MAIN_AGENT_DIR = path.join(OPENCLAW_DIR, 'agents', 'main', 'agent');
const OPENCLAW_AUTH_PROFILES_FILE = path.join(OPENCLAW_MAIN_AGENT_DIR, 'auth-profiles.json');
const OPENCLAW_AUTH_PROFILES_BACKUP_FILE = path.join(OPENCLAW_MAIN_AGENT_DIR, 'auth-profiles.json.bak.clawsetup');
const OPENCLAW_AGENT_MODELS_FILE = path.join(OPENCLAW_MAIN_AGENT_DIR, 'models.json');
const OPENCLAW_AGENT_MODELS_BACKUP_FILE = path.join(OPENCLAW_MAIN_AGENT_DIR, 'models.json.bak.clawsetup');
const OPENCLAW_CREDENTIALS_DIR = path.join(OPENCLAW_DIR, 'credentials');
const OPENCLAW_FEISHU_PAIRING_FILE = path.join(OPENCLAW_CREDENTIALS_DIR, 'feishu-pairing.json');
const OPENCLAW_FEISHU_ALLOWFROM_FILE = path.join(OPENCLAW_CREDENTIALS_DIR, 'feishu-default-allowFrom.json');
const OPENCLAW_DEVICES_PAIRED_FILE = path.join(OPENCLAW_DIR, 'devices', 'paired.json');

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

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    throw new Error(`Failed to parse OpenClaw config at ${filePath}`);
  }
}

function writeJsonFile(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

function backupFileIfExists(filePath: string, backupPath: string) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
  }
}

function maskSecretValue(value: OpenClawSecretValue | undefined) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.length <= 4 ? '***' : `${value.slice(0, 4)}***`;
  }

  return 'configured';
}

export function getOpenClawConfigPath() {
  return OPENCLAW_CONFIG_FILE;
}

export function loadOpenClawConfig(): OpenClawConfig | null {
  return readJsonFile<OpenClawConfig>(OPENCLAW_CONFIG_FILE);
}

export function getOpenClawFeishuConfig(): OpenClawFeishuConfig | null {
  const config = loadOpenClawConfig();
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
  if (!config) {
    return null;
  }

  return {
    appId: typeof config.appId === 'string' ? config.appId : '',
    appSecret: maskSecretValue(config.appSecret),
    verificationToken: maskSecretValue(config.verificationToken),
    connectionMode: config.connectionMode ?? 'websocket',
    domain: config.domain ?? 'feishu',
    configPath: OPENCLAW_CONFIG_FILE,
  };
}

export function writeOpenClawFeishuConfig(feishuConfig: FeishuConfig) {
  const currentConfig = loadOpenClawConfig() ?? {};
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

  backupFileIfExists(OPENCLAW_CONFIG_FILE, OPENCLAW_CONFIG_BACKUP_FILE);

  writeJsonFile(OPENCLAW_CONFIG_FILE, nextConfig);

  return {
    config: nextConfig,
    feishu: nextFeishuConfig,
    configPath: OPENCLAW_CONFIG_FILE,
    backupPath: fs.existsSync(OPENCLAW_CONFIG_BACKUP_FILE) ? OPENCLAW_CONFIG_BACKUP_FILE : null,
  };
}

export function applyOpenClawProviderSelection(params: {
  providerId: string;
  apiKey: string;
  baseUrl?: string;
}) {
  const config = loadOpenClawConfig() ?? {};
  const authProfiles = readJsonFile<OpenClawAuthProfilesStore>(OPENCLAW_AUTH_PROFILES_FILE) ?? { version: 1, profiles: {} };
  const agentModels = readJsonFile<OpenClawAgentModelsStore>(OPENCLAW_AGENT_MODELS_FILE) ?? { providers: {} };

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

  backupFileIfExists(OPENCLAW_CONFIG_FILE, OPENCLAW_CONFIG_BACKUP_FILE);
  backupFileIfExists(OPENCLAW_AUTH_PROFILES_FILE, OPENCLAW_AUTH_PROFILES_BACKUP_FILE);
  backupFileIfExists(OPENCLAW_AGENT_MODELS_FILE, OPENCLAW_AGENT_MODELS_BACKUP_FILE);

  writeJsonFile(OPENCLAW_CONFIG_FILE, nextConfig);
  writeJsonFile(OPENCLAW_AUTH_PROFILES_FILE, nextAuthProfileStore);
  writeJsonFile(OPENCLAW_AGENT_MODELS_FILE, nextAgentModels);

  return {
    configPath: OPENCLAW_CONFIG_FILE,
    authProfilesPath: OPENCLAW_AUTH_PROFILES_FILE,
    agentModelsPath: OPENCLAW_AGENT_MODELS_FILE,
  };
}

export function resetOpenClawChannels() {
  const config = loadOpenClawConfig();
  if (!config) {
    return { configPath: OPENCLAW_CONFIG_FILE, cleared: false };
  }

  // 1. Backup and remove channels from main config
  backupFileIfExists(OPENCLAW_CONFIG_FILE, OPENCLAW_CONFIG_BACKUP_FILE);
  const nextConfig: OpenClawConfig = { ...config };
  delete nextConfig.channels;
  writeJsonFile(OPENCLAW_CONFIG_FILE, nextConfig);

  // 2. Reset feishu pairing requests
  if (fs.existsSync(OPENCLAW_FEISHU_PAIRING_FILE)) {
    writeJsonFile(OPENCLAW_FEISHU_PAIRING_FILE, { version: 1, requests: [] });
  }

  // 3. Reset feishu allowFrom whitelist
  if (fs.existsSync(OPENCLAW_FEISHU_ALLOWFROM_FILE)) {
    writeJsonFile(OPENCLAW_FEISHU_ALLOWFROM_FILE, { version: 1, allowFrom: [] });
  }

  // 4. Remove feishu-originated devices from paired devices
  resetPairedFeishuDevices();

  return { configPath: OPENCLAW_CONFIG_FILE, cleared: true };
}

function resetPairedFeishuDevices() {
  const paired = readJsonFile<Record<string, Record<string, unknown>>>(OPENCLAW_DEVICES_PAIRED_FILE);
  if (!paired || !isObject(paired)) return;

  const nextPaired: Record<string, unknown> = {};
  for (const [id, device] of Object.entries(paired)) {
    if (!isObject(device)) continue;
    // Keep non-feishu devices (e.g. cli, web)
    const clientId = typeof device.clientId === 'string' ? device.clientId : '';
    if (!clientId.startsWith('feishu')) {
      nextPaired[id] = device;
    }
  }

  writeJsonFile(OPENCLAW_DEVICES_PAIRED_FILE, nextPaired);
}

export function getOpenClawDashboardUrl(pathname = '/') {
  const config = loadOpenClawConfig();
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
