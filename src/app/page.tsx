'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SetupShell } from '@/components/setup-shell';
import { useT } from '@/i18n/context';
import { CheckCircle2, AlertTriangle, Minus, RefreshCw, ExternalLink } from 'lucide-react';

type SystemInfo = {
  platform: string;
  arch: string;
  release: string;
  nodeVersion: string;
  shell: string;
  openclawInstalled: boolean;
};

const MIN_NODE_MAJOR = 22;

function parseNodeMajor(version: string): number {
  const match = version.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

type NodeStatus = 'ok' | 'outdated' | 'not-found';

function getNodeStatus(info: SystemInfo): NodeStatus {
  if (info.nodeVersion === 'not found') return 'not-found';
  const major = parseNodeMajor(info.nodeVersion);
  return major >= MIN_NODE_MAJOR ? 'ok' : 'outdated';
}

export default function WelcomePage() {
  const router = useRouter();
  const t = useT();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const fetchInfo = useCallback(() => {
    setChecking(true);
    fetch('/api/system/info')
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  const nodeStatus: NodeStatus | null = info ? getNodeStatus(info) : null;

  return (
    <SetupShell currentStep={1} status={t('welcome.status')}>
      <h1 className="text-2xl font-semibold tracking-tight">{t('welcome.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('welcome.description')}</p>

      <div className="mt-6 rounded-lg border border-border px-4 py-4">
        <h2 className="text-sm font-semibold">{t('welcome.systemInfo')}</h2>
        {info ? (
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <span className="text-muted-foreground">{t('welcome.os')}</span>
            <span>{info.platform} {info.release} ({info.arch})</span>
            <span className="text-muted-foreground">Node.js</span>
            <span className={`flex items-center gap-1.5 ${
              nodeStatus === 'ok'
                ? 'text-emerald-600 dark:text-emerald-400'
                : nodeStatus === 'outdated'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground'
            }`}>
              {nodeStatus === 'ok' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {nodeStatus === 'outdated' && <AlertTriangle className="h-3.5 w-3.5" />}
              {nodeStatus === 'not-found' && <Minus className="h-3.5 w-3.5" />}
              {nodeStatus === 'not-found' ? t('welcome.notInstalled') : info.nodeVersion}
            </span>
            <span className="text-muted-foreground">Shell</span>
            <span className="font-mono text-xs">{info.shell}</span>
            <span className="text-muted-foreground">OpenClaw CLI</span>
            <span className={info.openclawInstalled
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground'
            }>
              {info.openclawInstalled ? t('welcome.installed') : t('welcome.notInstalled')}
            </span>
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">{t('welcome.loading')}</div>
        )}
      </div>

      {/* Node outdated: red, blocking */}
      {info && nodeStatus === 'outdated' && (
        <div className="mt-4 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {t('welcome.nodeOutdated', { version: info.nodeVersion })}
              </p>
              <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                {t('welcome.nodeOutdatedHint')}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href="https://nodejs.org/en/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                >
                  {t('welcome.downloadNode')}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  onClick={fetchInfo}
                  disabled={checking}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-300 dark:border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
                  {checking ? t('welcome.rechecking') : t('welcome.recheck')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Node not found: amber, non-blocking */}
      {info && nodeStatus === 'not-found' && (
        <div className="mt-4 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {t('welcome.nodeNotDetected')}
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                {t('welcome.nodeNotDetectedHint')}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href="https://nodejs.org/en/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  {t('welcome.downloadNode')}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  onClick={fetchInfo}
                  disabled={checking}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 dark:border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
                  {checking ? t('welcome.rechecking') : t('welcome.recheck')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Node OK */}
      {info && nodeStatus === 'ok' && (
        <div className="mt-4 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              {t('welcome.nodeOk', { version: info.nodeVersion })}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-border px-4 py-4">
        <h2 className="text-sm font-semibold">{t('welcome.stepsOverview')}</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">1</span>
            {t('welcome.step1')}
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">2</span>
            {t('welcome.step2')}
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">3</span>
            {t('welcome.step3')}
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">4</span>
            {t('welcome.step4')}
          </li>
        </ol>
      </div>

      <div className="mt-6 flex items-center justify-end">
        <button
          onClick={() => router.push('/openclaw')}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t('welcome.start')}
        </button>
      </div>
    </SetupShell>
  );
}
