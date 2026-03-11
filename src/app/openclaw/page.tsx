'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SetupShell } from '@/components/setup-shell';
import { useT } from '@/i18n/context';
import { updateOnboardingState } from '@/lib/onboarding-state';

type Status = 'checking' | 'installed' | 'installing' | 'success' | 'failed';

export default function OpenClawInstallPage() {
  const router = useRouter();
  const t = useT();
  const [status, setStatus] = useState<Status>('checking');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const hasAutoRun = useRef(false);

  const addLog = useCallback((line: string) => {
    setLogs((prev) => [...prev, line]);
  }, []);

  const statusText = useMemo(() => {
    if (status === 'checking') return t('openclaw.statusChecking');
    if (status === 'installed' || status === 'success') return t('openclaw.statusInstalled');
    if (status === 'installing') return t('openclaw.statusInstalling');
    if (status === 'failed') return t('openclaw.statusFailed');
    return '';
  }, [status, t]);

  const canContinue = status === 'installed' || status === 'success';

  const waitForTask = useCallback((taskId: string): Promise<'success' | 'failed'> => {
    return new Promise((resolve) => {
      const es = new EventSource(`/api/tasks/${taskId}/stream`);
      let resolved = false;

      es.addEventListener('log', (event) => {
        const data = JSON.parse(event.data);
        if (data.line) addLog(data.line);
      });

      es.addEventListener('status', (event) => {
        const data = JSON.parse(event.data);
        if (data.status === 'success' || data.status === 'failed') {
          resolved = true;
          es.close();
          resolve(data.status);
        }
      });

      es.onerror = () => {
        es.close();
        if (!resolved) resolve('failed');
      };
    });
  }, [addLog]);

  const runInstall = useCallback(async () => {
    setStatus('checking');
    setLogs([]);
    setError('');

    try {
      addLog(t('openclaw.checkingCli'));
      const statusResp = await fetch('/api/runtime/status');
      const statusData = await statusResp.json();

      if (statusData.installed) {
        addLog(t('openclaw.alreadyInstalled'));
        setStatus('installed');
        updateOnboardingState((current) => ({
          ...current,
          openclawInstall: { status: 'passed', message: t('openclaw.alreadyInstalled') },
        }));
        return;
      }

      addLog(t('openclaw.startingInstall'));
      setStatus('installing');

      const installResp = await fetch('/api/install/openclaw', { method: 'POST' });
      const installData = await installResp.json();

      if (!installData.taskId) {
        setStatus('failed');
        setError(installData.error || t('openclaw.installFailed'));
        return;
      }

      const result = await waitForTask(installData.taskId);

      if (result === 'failed') {
        setStatus('failed');
        setError(t('openclaw.installFailed'));
        updateOnboardingState((current) => ({
          ...current,
          openclawInstall: { status: 'failed', message: t('openclaw.installFailed') },
        }));
        return;
      }

      // Verify installation
      addLog(t('openclaw.verifyingInstall'));
      const verifyResp = await fetch('/api/runtime/status');
      const verifyData = await verifyResp.json();

      if (verifyData.installed) {
        addLog(t('openclaw.installSuccess'));
        setStatus('success');
        updateOnboardingState((current) => ({
          ...current,
          openclawInstall: { status: 'passed', message: t('openclaw.installSuccess') },
        }));
      } else {
        setStatus('failed');
        setError(t('openclaw.installVerifyFailed'));
        updateOnboardingState((current) => ({
          ...current,
          openclawInstall: { status: 'failed', message: t('openclaw.installVerifyFailed') },
        }));
      }
    } catch (e: unknown) {
      setStatus('failed');
      setError(e instanceof Error ? e.message : t('openclaw.installFailed'));
    }
  }, [addLog, waitForTask, t]);

  useEffect(() => {
    if (!hasAutoRun.current) {
      hasAutoRun.current = true;
      void runInstall();
    }
  }, [runInstall]);

  return (
    <SetupShell currentStep={2} status={statusText}>
      <h1 className="text-2xl font-semibold tracking-tight">{t('openclaw.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('openclaw.description')}</p>

      <div className="mt-6 rounded-lg border border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(status === 'checking' || status === 'installing') && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
            )}
            <span className="text-sm">{t('openclaw.cliLabel')}</span>
          </div>
          <span className={`rounded-md px-2 py-1 text-xs ${
            canContinue
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : status === 'failed'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                : 'bg-muted text-muted-foreground'
          }`}>
            {canContinue
              ? t('common.passed')
              : status === 'failed'
                ? t('common.failed')
                : status === 'installing'
                  ? t('common.running')
                  : t('common.pending')}
          </span>
        </div>
        {canContinue && (
          <div className="mt-1 text-xs text-muted-foreground">{t('openclaw.installSuccess')}</div>
        )}
        {status === 'failed' && error && (
          <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">{error}</div>
        )}
      </div>

      {logs.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-slate-950 p-4 text-xs text-slate-200">
          <div className="mb-2 font-medium text-slate-100">{t('openclaw.activity')}</div>
          <div className="max-h-48 overflow-auto space-y-1 font-mono">
            {logs.map((line, index) => (
              <div key={`${index}-${line.slice(0, 16)}`}>{line}</div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Link href="/" className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">{t('common.back')}</Link>
        <div className="flex gap-2">
          {status === 'failed' && (
            <button
              onClick={runInstall}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
            >
              {t('common.retry')}
            </button>
          )}
          <button
            onClick={() => router.push('/provider')}
            disabled={!canContinue}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('common.next')}
          </button>
        </div>
      </div>
    </SetupShell>
  );
}
