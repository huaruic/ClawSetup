'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SetupShell } from '@/components/setup-shell';
import { useT } from '@/i18n/context';
import { CheckCircle2, Minus, RefreshCw } from 'lucide-react';
import { getSystemInfo, type SystemInfo } from '@/lib/api';

export default function WelcomePage() {
  const router = useRouter();
  const t = useT();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const fetchInfo = useCallback(() => {
    setChecking(true);
    getSystemInfo()
      .then(setInfo)
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

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
            <span className="text-muted-foreground">Shell</span>
            <span className="font-mono text-xs">{info.shell}</span>
            <span className="text-muted-foreground">OpenClaw CLI</span>
            <span className={`flex items-center gap-1.5 ${
              info.openclawInstalled
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground'
            }`}>
              {info.openclawInstalled
                ? <><CheckCircle2 className="h-3.5 w-3.5" />{t('welcome.installed')}</>
                : <><Minus className="h-3.5 w-3.5" />{t('welcome.bundledReady')}</>
              }
            </span>
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">{t('welcome.loading')}</div>
        )}
      </div>

      {info && !info.openclawInstalled && (
        <div className="mt-4 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              {t('welcome.bundledInfo')}
            </p>
          </div>
        </div>
      )}

      {info && (
        <div className="mt-4 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              {t('welcome.envReady')}
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

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          onClick={fetchInfo}
          disabled={checking}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`inline h-3.5 w-3.5 mr-1.5 ${checking ? 'animate-spin' : ''}`} />
          {checking ? t('welcome.rechecking') : t('welcome.recheck')}
        </button>
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
