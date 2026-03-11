'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SetupShell } from '@/components/setup-shell';
import { useT } from '@/i18n/context';

type CheckStatus = 'pending' | 'pass' | 'fail';

type CheckItem = {
  nameKey: string;
  key: 'node' | 'npm';
  status: CheckStatus;
  detail?: string;
  suggestion?: string;
};

const API_BASE = '';

const initialChecks: CheckItem[] = [
  { nameKey: 'env.nodeRuntime', key: 'node', status: 'pending' },
  { nameKey: 'env.npmCli', key: 'npm', status: 'pending' },
];

function statusBadge(status: CheckStatus) {
  if (status === 'pass') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (status === 'fail') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
  return 'bg-muted text-muted-foreground';
}

export default function Home() {
  const router = useRouter();
  const t = useT();
  const [checks, setChecks] = useState<CheckItem[]>(initialChecks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);

  const canContinue = checks.every((item) => item.status === 'pass');

  const statusText = useMemo(() => {
    if (loading) return t('env.statusChecking');
    if (error) return t('env.statusCheckFailed', { error });
    if (!hasRun) return t('env.statusChecking');
    if (canContinue) return t('env.statusAllPassed');
    return t('env.statusIssues');
  }, [error, loading, canContinue, hasRun, t]);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const preflightResp = await fetch(`${API_BASE}/api/preflight/check`, { method: 'POST' });
      const preflight = await preflightResp.json();

      const nodeCheck = preflight?.checks?.find((c: { key: string }) => c.key === 'node');
      const npmCheck = preflight?.checks?.find((c: { key: string }) => c.key === 'npm');

      setChecks([
        {
          nameKey: 'env.nodeRuntime',
          key: 'node',
          status: nodeCheck?.pass ? 'pass' : 'fail',
          detail: nodeCheck?.message,
          suggestion: nodeCheck?.suggestion,
        },
        {
          nameKey: 'env.npmCli',
          key: 'npm',
          status: npmCheck?.pass ? 'pass' : 'fail',
          detail: npmCheck?.message,
          suggestion: npmCheck?.suggestion,
        },
      ]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'unknown error');
      setChecks((prev) => prev.map((c) => ({ ...c, status: 'fail' as CheckStatus })));
    } finally {
      setLoading(false);
      setHasRun(true);
    }
  }, [t]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  return (
    <SetupShell currentStep={1} status={statusText}>
      <h1 className="text-2xl font-semibold tracking-tight">{t('env.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('env.description')}</p>

      <div className="mt-6 space-y-3">
        {checks.map((item) => (
          <div key={item.key} className="rounded-lg border border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {loading && item.status === 'pending' && (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
                )}
                <span className="text-sm">{t(item.nameKey)}</span>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs ${statusBadge(item.status)}`}>
                {t(`common.${item.status === 'pass' ? 'passed' : item.status === 'fail' ? 'failed' : 'pending'}`)}
              </span>
            </div>
            {item.detail && <div className="mt-1 text-xs text-muted-foreground">{item.detail}</div>}
            {item.status === 'fail' && item.suggestion && (
              <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">{item.suggestion}</div>
            )}
          </div>
        ))}
      </div>

      {error && <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">{error}</div>}

      <div className="mt-6 flex items-center justify-end">
        <div className="flex gap-2">
          {!canContinue && hasRun && !loading && (
            <button
              onClick={runCheck}
              disabled={loading}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('common.retry')}
            </button>
          )}
          <button
            onClick={() => router.push('/openclaw')}
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
