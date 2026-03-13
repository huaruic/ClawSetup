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
      <h1 className="text-2xl font-bold tracking-tight">{t('welcome.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('welcome.description')}</p>

      <div className="mt-6 rounded-xl border-2 border-border bg-card px-4 py-4 brutal-shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider">{t('welcome.systemInfo')}</h2>
        {info ? (
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <span className="font-medium text-muted-foreground">{t('welcome.os')}</span>
            <span className="font-medium">{info.platform} {info.release} ({info.arch})</span>
            <span className="font-medium text-muted-foreground">Node.js</span>
            <span className={`flex items-center gap-1.5 font-bold ${
              nodeStatus === 'ok'
                ? 'text-emerald-700 dark:text-emerald-400'
                : nodeStatus === 'outdated'
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-muted-foreground'
            }`}>
              {nodeStatus === 'ok' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {nodeStatus === 'outdated' && <AlertTriangle className="h-3.5 w-3.5" />}
              {nodeStatus === 'not-found' && <Minus className="h-3.5 w-3.5" />}
              {nodeStatus === 'not-found' ? t('welcome.notInstalled') : info.nodeVersion}
            </span>
            <span className="font-medium text-muted-foreground">Shell</span>
            <span className="font-mono text-xs font-medium">{info.shell}</span>
            <span className="font-medium text-muted-foreground">OpenClaw CLI</span>
            <span className={`font-bold ${info.openclawInstalled
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-muted-foreground'
            }`}>
              {info.openclawInstalled ? t('welcome.installed') : t('welcome.notInstalled')}
            </span>
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">{t('welcome.loading')}</div>
        )}
      </div>

      {/* Node outdated: red */}
      {info && nodeStatus === 'outdated' && (
        <div className="mt-4 rounded-xl border-2 border-red-600 bg-red-50 px-4 py-4 dark:border-red-500 dark:bg-red-950/40">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-red-800 dark:text-red-300">
                {t('welcome.nodeOutdated', { version: info.nodeVersion })}
              </p>
              <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">
                {t('welcome.nodeOutdatedHint')}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href="https://nodejs.org/en/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border-2 border-red-700 bg-red-600 px-3 py-1.5 text-xs font-bold text-white brutal-shadow-sm transition-all hover:brutal-shadow active:brutal-shadow-active dark:border-red-500"
                >
                  {t('welcome.downloadNode')}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  onClick={fetchInfo}
                  disabled={checking}
                  className="inline-flex items-center gap-1.5 rounded-lg border-2 border-red-600 bg-card px-3 py-1.5 text-xs font-bold text-red-800 transition-all hover:bg-red-50 disabled:opacity-50 dark:border-red-500 dark:text-red-300"
                >
                  <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
                  {checking ? t('welcome.rechecking') : t('welcome.recheck')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Node not found: amber */}
      {info && nodeStatus === 'not-found' && (
        <div className="mt-4 rounded-xl border-2 border-amber-600 bg-amber-50 px-4 py-4 dark:border-amber-500 dark:bg-amber-950/40">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {t('welcome.nodeNotDetected')}
              </p>
              <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                {t('welcome.nodeNotDetectedHint')}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href="https://nodejs.org/en/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border-2 border-amber-700 bg-amber-500 px-3 py-1.5 text-xs font-bold text-white brutal-shadow-sm transition-all hover:brutal-shadow active:brutal-shadow-active dark:border-amber-500"
                >
                  {t('welcome.downloadNode')}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  onClick={fetchInfo}
                  disabled={checking}
                  className="inline-flex items-center gap-1.5 rounded-lg border-2 border-amber-600 bg-card px-3 py-1.5 text-xs font-bold text-amber-800 transition-all hover:bg-amber-50 disabled:opacity-50 dark:border-amber-500 dark:text-amber-300"
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
        <div className="mt-4 rounded-xl border-2 border-emerald-600 bg-emerald-50 px-4 py-3 dark:border-emerald-500 dark:bg-emerald-950/40">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              {t('welcome.nodeOk', { version: info.nodeVersion })}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border-2 border-border bg-card px-4 py-4 brutal-shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider">{t('welcome.stepsOverview')}</h2>
        <ol className="mt-3 space-y-2 text-sm">
          {[t('welcome.step1'), t('welcome.step2'), t('welcome.step3'), t('welcome.step4')].map((step, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-border bg-muted text-[10px] font-bold">{i + 1}</span>
              <span className="font-medium text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 flex items-center justify-end">
        <button
          onClick={() => router.push('/openclaw')}
          className="rounded-xl border-2 border-border bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground brutal-shadow transition-all hover:brutal-shadow-hover active:brutal-shadow-active"
        >
          {t('welcome.start')}
        </button>
      </div>
    </SetupShell>
  );
}
