'use client';

import { z } from 'zod';
import { fetch } from '@tauri-apps/plugin-http';
import { readJsonFile, writeJsonFile } from './tauri-fs';

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

const CONFIG_PATH = '.clawsetup/feishu.json';

export async function loadFeishuConfig(): Promise<FeishuConfig | null> {
  try {
    const raw = await readJsonFile<Record<string, unknown>>(CONFIG_PATH);
    if (!raw) return null;
    const parsed = feishuSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveFeishuConfig(config: FeishuConfig): Promise<void> {
  await writeJsonFile(CONFIG_PATH, config);
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
