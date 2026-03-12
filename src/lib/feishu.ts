import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';

export const feishuSchema = z.object({
  appId: z.string().min(4),
  appSecret: z.string().min(6),
  verificationToken: z.string().min(4).optional().or(z.literal('')),
});

export type FeishuConfig = z.infer<typeof feishuSchema>;
export type FeishuCredentials = Pick<FeishuConfig, 'appId' | 'appSecret'>;

type FeishuApiResponse = {
  code?: number;
  msg?: string;
  tenant_access_token?: string;
};

const CONFIG_DIR = path.join(os.homedir(), '.clawsetup');
const CONFIG_FILE = path.join(CONFIG_DIR, 'feishu.json');

export function loadFeishuConfig(): FeishuConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      const parsed = feishuSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
    }
  } catch { /* ignore corrupt file */ }
  return null;
}

export function saveFeishuConfig(config: FeishuConfig) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// Always read from disk to avoid cross-module state issues in Next.js dev mode
export function getFeishuConfig(): FeishuConfig | null {
  return loadFeishuConfig();
}

export function setFeishuConfig(config: FeishuConfig) {
  saveFeishuConfig(config);
}

export async function exchangeFeishuTenantToken(config: FeishuCredentials) {
  const resp = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret }),
  });

  const data = (await resp.json()) as FeishuApiResponse;
  const ok = resp.ok && data?.code === 0 && typeof data?.tenant_access_token === 'string';

  return {
    ok,
    token: ok ? (data.tenant_access_token as string) : null,
    code: data?.code,
    msg: data?.msg,
  };
}

type FeishuBotInfoResponse = FeishuApiResponse & {
  bot?: {
    open_id?: string;
    bot_name?: string;
  };
};

export async function verifyFeishuBaseApi(tenantAccessToken: string) {
  const resp = await fetch('https://open.feishu.cn/open-apis/bot/v3/info', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tenantAccessToken}` },
  });

  const data = (await resp.json()) as FeishuBotInfoResponse;
  const ok = resp.ok && data?.code === 0;

  return {
    ok,
    code: data?.code,
    msg: data?.msg,
    openId: data?.bot?.open_id,
    botName: data?.bot?.bot_name,
  };
}
