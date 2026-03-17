'use client';

import { readJsonFile } from './tauri-fs';

export type FeishuPairingRequest = {
  id: string;
  code: string;
  createdAt: string;
  lastSeenAt: string;
  meta?: {
    accountId?: string;
  };
};

type FeishuPairingStore = {
  version?: number;
  requests?: FeishuPairingRequest[];
};

const PAIRING_PATH = '.openclaw/credentials/feishu-pairing.json';

export async function loadFeishuPairingRequests(): Promise<FeishuPairingRequest[]> {
  const raw = await readJsonFile<FeishuPairingStore>(PAIRING_PATH);
  return Array.isArray(raw?.requests) ? raw.requests : [];
}

export async function getLatestFeishuPairingRequest(): Promise<FeishuPairingRequest | null> {
  const requests = await loadFeishuPairingRequests();
  return (
    requests
      .slice()
      .sort((left, right) => Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt))[0] ?? null
  );
}

export async function findFeishuPairingRequestByCode(
  code: string,
): Promise<FeishuPairingRequest | null> {
  const requests = await loadFeishuPairingRequests();
  return requests.find((request) => request.code === code) ?? null;
}
