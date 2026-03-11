'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SetupShell } from '@/components/setup-shell';
import { useT } from '@/i18n/context';

type CheckStatus = 'pending' | 'pass' | 'fail';

type CheckItem = {
  nameKey: string;
  key: 'openclaw' | 'node' | 'network' | 'gateway';
  status: CheckStatus;
  detail?: string;
  suggestion?: string;
  action?: string;
};

const API_BASE = '';

const initialChecks: CheckItem[] = [
  { nameKey: 'env.openclawCli', key: 'openclaw', status: 'pending' },
  { nameKey: 'env.nodeRuntime', key: 'node', status: 'pending' },
  { nameKey: 'env.networkAccess', key: 'network', status: 'pending' },
  { nameKey: 'env.gatewayStatus', key: 'gateway', status: 'pending' },
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
  const [installing, setInstalling] = useState<string | null>(null);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [installResult, setInstallResult] = useState<'success' | 'failed' | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const allPassed = checks.every((c) => c.status === 'pass');

  const statusText = useMemo(() => {
    if (installing) return t('env.statusInstalling', { name: installing });
    if (loading) return t('env.statusChecking');
    if (error) return t('env.statusCheckFailed', { error });
    if (!hasRun) return t('env.statusChecking');
    if (allPassed) return t('env.statusAllPassed');
    return t('env.statusIssues');
  }, [error, loading, installing, allPassed, hasRun, t]);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError('');
    setInstallResult(null);
    setInstallLogs([]);

    try {
      const [systemResp, preflightResp, runtimeStatusResp] = await Promise.all([
        fetch(`${API_BASE}/api/system/info`),
        fetch(`${API_BASE}/api/preflight/check`, { method: 'POST' }),
        fetch(`${API_BASE}/api/runtime/status`),
      ]);

      const system = await systemResp.json();
      const preflight = await preflightResp.json();
      const runtimeStatus = await runtimeStatusResp.json();

      const openclawCheck = preflight?.checks?.find((c: { key: string }) => c.key === 'openclaw');
      const nodeCheck = preflight?.checks?.find((c: { key: string }) => c.key === 'node');

      setChecks([
        {
          nameKey: 'env.openclawCli',
          key: 'openclaw',
          status: openclawCheck?.pass ? 'pass' : 'fail',
          detail: openclawCheck?.message,
          suggestion: openclawCheck?.suggestion,
          action: openclawCheck?.action,
        },
        {
          nameKey: 'env.nodeRuntime',
          key: 'node',
          status: system?.hasNode ? 'pass' : 'fail',
          detail: system?.hasNode ? t('env.detected', { version: system.nodeVersion || 'node' }) : t('env.nodeNotDetected'),
          suggestion: nodeCheck?.suggestion,
        },
        {
          nameKey: 'env.networkAccess',
          key: 'network',
          status: systemResp.ok ? 'pass' : 'fail',
          detail: systemResp.ok ? t('env.backendReachable') : t('env.backendUnreachable'),
        },
        {
          nameKey: 'env.gatewayStatus',
          key: 'gateway',
          status: runtimeStatus?.ok ? 'pass' : 'fail',
          detail: runtimeStatus?.summary || (runtimeStatus?.ok ? t('env.gatewayReachable') : runtimeStatus?.error || t('env.gatewayCheckFailed')),
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

  const streamTask = useCallback((taskId: string, label: string) => {
    setInstalling(label);
    setInstallLogs([]);
    setInstallResult(null);

    const es = new EventSource(`${API_BASE}/api/tasks/${taskId}/stream`);

    es.addEventListener('log', (e) => {
      const data = JSON.parse(e.data);
      if (data.line) setInstallLogs((prev) => [...prev, data.line]);
    });

    es.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      if (data.status === 'success' || data.status === 'failed') {
        setInstallResult(data.status);
        setInstalling(null);
        es.close();
      }
    });

    es.onerror = () => {
      setInstallResult('failed');
      setInstalling(null);
      es.close();
    };
  }, []);

  async function handleInstall(type: 'openclaw' | 'feishu-plugin') {
    const endpoint = type === 'openclaw' ? '/api/install/openclaw' : '/api/install/feishu-plugin';
    const label = type === 'openclaw' ? 'OpenClaw' : 'Feishu Plugin';
    try {
      const resp = await fetch(`${API_BASE}${endpoint}`, { method: 'POST' });
      const data = await resp.json();
      if (data.taskId) {
        streamTask(data.taskId, label);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `Failed to start ${label} installation`);
    }
  }

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
            {item.status === 'fail' && item.action === 'install_openclaw' && (
              <button
                onClick={() => handleInstall('openclaw')}
                disabled={!!installing}
                className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {t('env.installOpenClaw')}
              </button>
            )}
          </div>
        ))}
      </div>

      {(installLogs.length > 0 || installing) && (
        <div className="mt-4 rounded-lg border border-border bg-slate-900 dark:bg-slate-950 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300">
              {installing ? t('env.installingLabel', { name: installing }) : installResult === 'success' ? t('env.installComplete') : t('env.installFailed')}
            </span>
            {installing && <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" />}
          </div>
          <pre className="max-h-48 overflow-auto text-xs text-slate-300">
            {installLogs.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </pre>
        </div>
      )}

      {installResult === 'success' && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          {t('env.installSuccess')}
        </div>
      )}
      {installResult === 'failed' && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
          {t('env.installFailedMsg')}
        </div>
      )}

      {error && <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">{error}</div>}

      <div className="mt-6 flex items-center justify-end">
        <div className="flex gap-2">
          {!allPassed && hasRun && !loading && (
            <button
              onClick={runCheck}
              disabled={loading || !!installing}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('common.retry')}
            </button>
          )}
          <button
            onClick={() => router.push('/provider')}
            disabled={!allPassed}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('common.next')}
          </button>
        </div>
      </div>
    </SetupShell>
  );
}
