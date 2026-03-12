'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SetupShell } from '@/components/setup-shell';
import { useT } from '@/i18n/context';

type SystemInfo = {
  platform: string;
  arch: string;
  release: string;
  nodeVersion: string;
  shell: string;
  openclawInstalled: boolean;
};

export default function WelcomePage() {
  const router = useRouter();
  const t = useT();
  const [info, setInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    fetch('/api/system/info')
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

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
            <span>{info.nodeVersion}</span>
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
