import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';

export const feishuSchema = z.object({
  appId: z.string().min(4),
  appSecret: z.string().min(6),
  verificationToken: z.string().min(4),
});

export type FeishuConfig = z.infer<typeof feishuSchema>;

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

// Module-level state for in-memory config
let latestConfig: FeishuConfig | null = loadFeishuConfig();

export function getFeishuConfig(): FeishuConfig | null {
  return latestConfig;
}

export function setFeishuConfig(config: FeishuConfig) {
  latestConfig = config;
  saveFeishuConfig(config);
}

export async function exchangeFeishuTenantToken(config: FeishuConfig) {
  const resp = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret }),
  });

  const data = (await resp.json()) as any;
  const ok = resp.ok && data?.code === 0 && typeof data?.tenant_access_token === 'string';

  return {
    ok,
    token: ok ? (data.tenant_access_token as string) : null,
    code: data?.code,
    msg: data?.msg,
  };
}

export async function verifyFeishuBaseApi(tenantAccessToken: string) {
  const resp = await fetch('https://open.feishu.cn/open-apis/bot/v3/info', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tenantAccessToken}` },
  });

  const data = (await resp.json()) as any;
  const ok = resp.ok && data?.code === 0;

  return {
    ok,
    code: data?.code,
    msg: data?.msg,
  };
}
