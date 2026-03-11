import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

const FEISHU_PAIRING_FILE = path.join(os.homedir(), '.openclaw', 'credentials', 'feishu-pairing.json');

export function getFeishuPairingFilePath() {
  return FEISHU_PAIRING_FILE;
}

export function loadFeishuPairingRequests() {
  if (!fs.existsSync(FEISHU_PAIRING_FILE)) {
    return [];
  }

  const raw = JSON.parse(fs.readFileSync(FEISHU_PAIRING_FILE, 'utf-8')) as FeishuPairingStore;
  return Array.isArray(raw.requests) ? raw.requests : [];
}

export function getLatestFeishuPairingRequest() {
  const requests = loadFeishuPairingRequests();
  return requests
    .slice()
    .sort((left, right) => Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt))[0] ?? null;
}

export function findFeishuPairingRequestByCode(code: string) {
  return loadFeishuPairingRequests().find((request) => request.code === code) ?? null;
}
