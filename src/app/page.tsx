'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SetupShell } from '@/components/setup-shell';

type CheckStatus = 'pending' | 'pass' | 'fail';

type CheckItem = {
  name: string;
  key: 'openclaw' | 'node' | 'network' | 'gateway';
  status: CheckStatus;
  detail?: string;
  suggestion?: string;
  action?: string;
};

const API_BASE = '';

const initialChecks: CheckItem[] = [
  { name: 'OpenClaw CLI', key: 'openclaw', status: 'pending' },
  { name: 'Node Runtime', key: 'node', status: 'pending' },
  { name: 'Network Access', key: 'network', status: 'pending' },
  { name: 'Gateway Status', key: 'gateway', status: 'pending' },
];

function statusBadge(status: CheckStatus) {
  if (status === 'pass') return 'bg-emerald-100 text-emerald-700';
  if (status === 'fail') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-600';
}

export default function Home() {
  const router = useRouter();
  const [checks, setChecks] = useState<CheckItem[]>(initialChecks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [installResult, setInstallResult] = useState<'success' | 'failed' | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const allPassed = checks.every((c) => c.status === 'pass');

  const statusText = useMemo(() => {
    if (installing) return `Installing ${installing}...`;
    if (loading) return 'Running checks...';
    if (error) return `Check failed: ${error}`;
    if (!hasRun) return 'Running checks...';
    if (allPassed) return 'All checks passed';
    return 'Checks completed with issues';
  }, [checks, error, loading, installing, allPassed, hasRun]);

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
          name: 'OpenClaw CLI',
          key: 'openclaw',
          status: openclawCheck?.pass ? 'pass' : 'fail',
          detail: openclawCheck?.message,
          suggestion: openclawCheck?.suggestion,
          action: openclawCheck?.action,
        },
        {
          name: 'Node Runtime',
          key: 'node',
          status: system?.hasNode ? 'pass' : 'fail',
          detail: system?.hasNode ? `Detected ${system.nodeVersion || 'node'}` : 'Node runtime not detected',
          suggestion: nodeCheck?.suggestion,
        },
        {
          name: 'Network Access',
          key: 'network',
          status: systemResp.ok ? 'pass' : 'fail',
          detail: systemResp.ok ? 'Backend reachable' : 'Cannot reach backend',
        },
        {
          name: 'Gateway Status',
          key: 'gateway',
          status: runtimeStatus?.ok ? 'pass' : 'fail',
          detail: runtimeStatus?.ok ? 'Gateway reachable' : runtimeStatus?.error || 'Gateway status check failed',
        },
      ]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'unknown error');
      setChecks((prev) => prev.map((c) => ({ ...c, status: 'fail' as CheckStatus })));
    } finally {
      setLoading(false);
      setHasRun(true);
    }
  }, []);

  // Auto-run checks on mount
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
      <h1 className="text-2xl font-semibold tracking-tight">Environment Check</h1>
      <p className="mt-2 text-sm text-slate-600">Validating local dependencies for OpenClaw and the Feishu plugin.</p>

      <div className="mt-6 space-y-3">
        {checks.map((item) => (
          <div key={item.key} className="rounded-lg border border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {loading && item.status === 'pending' && (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                )}
                <span className="text-sm">{item.name}</span>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs ${statusBadge(item.status)}`}>{item.status}</span>
            </div>
            {item.detail && <div className="mt-1 text-xs text-slate-500">{item.detail}</div>}
            {item.status === 'fail' && item.suggestion && (
              <div className="mt-1 text-xs text-amber-700">{item.suggestion}</div>
            )}
            {item.status === 'fail' && item.action === 'install_openclaw' && (
              <button
                onClick={() => handleInstall('openclaw')}
                disabled={!!installing}
                className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Install OpenClaw
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Install log panel */}
      {(installLogs.length > 0 || installing) && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-900 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300">
              {installing ? `Installing ${installing}...` : installResult === 'success' ? 'Installation complete' : 'Installation failed'}
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
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Installation completed. Re-running checks...
        </div>
      )}
      {installResult === 'failed' && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Installation failed. Check the logs above for details.
        </div>
      )}

      {error && <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="mt-6 flex items-center justify-end">
        <div className="flex gap-2">
          {!allPassed && hasRun && !loading && (
            <button
              onClick={runCheck}
              disabled={loading || !!installing}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => router.push('/feishu')}
            disabled={!allPassed}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </SetupShell>
  );
}
