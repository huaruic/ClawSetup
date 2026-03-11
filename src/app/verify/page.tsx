'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SetupShell } from '@/components/setup-shell';

const API_BASE = '';

type StepStatus = 'pending' | 'running' | 'success' | 'failed';

type PipelineStep = {
  label: string;
  status: StepStatus;
  detail?: string;
};

const initialPipeline: PipelineStep[] = [
  { label: 'Apply configuration', status: 'pending' },
  { label: 'Restart Gateway', status: 'pending' },
  { label: 'Verify connectivity', status: 'pending' },
];

function stepIcon(status: StepStatus) {
  if (status === 'success') return 'bg-emerald-100 text-emerald-700';
  if (status === 'failed') return 'bg-rose-100 text-rose-700';
  if (status === 'running') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-500';
}

function stepLabel(status: StepStatus) {
  if (status === 'success') return 'passed';
  if (status === 'failed') return 'failed';
  if (status === 'running') return 'running';
  return 'pending';
}

export default function VerifyPage() {
  const router = useRouter();
  const [pipeline, setPipeline] = useState<PipelineStep[]>(initialPipeline);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorInfo, setErrorInfo] = useState<{ code: string; message: string; suggestion: string } | null>(null);
  const [allPassed, setAllPassed] = useState(false);
  const hasAutoRun = useRef(false);

  const statusText = useMemo(() => {
    if (running) return 'Running verification pipeline...';
    if (allPassed) return 'All verifications passed';
    if (errorInfo) return `Failed: ${errorInfo.message}`;
    return 'Initializing...';
  }, [running, allPassed, errorInfo]);

  const updateStep = useCallback((index: number, update: Partial<PipelineStep>) => {
    setPipeline((prev) => prev.map((s, i) => (i === index ? { ...s, ...update } : s)));
  }, []);

  const addLog = useCallback((line: string) => {
    setLogs((prev) => [...prev, line]);
  }, []);

  // Wait for a task to complete via SSE, returning final status
  function waitForTask(taskId: string): Promise<'success' | 'failed'> {
    return new Promise((resolve) => {
      const es = new EventSource(`${API_BASE}/api/tasks/${taskId}/stream`);

      es.addEventListener('log', (e) => {
        const data = JSON.parse(e.data);
        if (data.line) addLog(data.line);
      });

      es.addEventListener('status', (e) => {
        const data = JSON.parse(e.data);
        if (data.status === 'success' || data.status === 'failed') {
          es.close();
          resolve(data.status);
        }
      });

      es.onerror = () => {
        es.close();
        resolve('failed');
      };
    });
  }

  const runPipeline = useCallback(async () => {
    setRunning(true);
    setLogs([]);
    setErrorInfo(null);
    setAllPassed(false);
    setPipeline(initialPipeline);

    // Step 0: Apply config
    updateStep(0, { status: 'running' });
    addLog('Checking configuration...');
    try {
      const previewResp = await fetch(`${API_BASE}/api/config/preview`);
      const preview = await previewResp.json();
      if (!preview.ok) {
        updateStep(0, { status: 'failed', detail: 'No configuration found. Go back to Step 2.' });
        setErrorInfo({ code: 'CONFIG_MISSING', message: 'Configuration not applied', suggestion: 'Go back to Step 2 and apply Feishu credentials.' });
        setRunning(false);
        return;
      }
      updateStep(0, { status: 'success', detail: 'Configuration loaded' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to check config';
      updateStep(0, { status: 'failed', detail: msg });
      setErrorInfo({ code: 'NETWORK_ERROR', message: 'Cannot reach backend', suggestion: 'Ensure the backend server is running.' });
      setRunning(false);
      return;
    }

    // Step 1: Restart Gateway
    updateStep(1, { status: 'running' });
    addLog('Starting Gateway...');
    try {
      const restartResp = await fetch(`${API_BASE}/api/runtime/restart`, { method: 'POST' });
      const restartData = await restartResp.json();
      if (restartData.taskId) {
        if (restartData.status === 'success') {
          addLog('Gateway is already running.');
        } else {
          const result = await waitForTask(restartData.taskId);
          if (result === 'failed') {
            updateStep(1, { status: 'failed', detail: 'Gateway start failed' });
            setErrorInfo({ code: 'GATEWAY_RESTART_FAILED', message: 'Gateway start failed', suggestion: 'Check if OpenClaw is installed. Try running: openclaw gateway install' });
            setRunning(false);
            return;
          }
        }
      }
      updateStep(1, { status: 'success', detail: 'Gateway running' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Start failed';
      updateStep(1, { status: 'failed', detail: msg });
      setErrorInfo({ code: 'GATEWAY_RESTART_ERROR', message: msg, suggestion: 'Check if OpenClaw is installed.' });
      setRunning(false);
      return;
    }

    // Step 2: Verify
    updateStep(2, { status: 'running' });
    addLog('Running verification checks...');
    try {
      const verifyResp = await fetch(`${API_BASE}/api/runtime/verify`, { method: 'POST' });
      const verifyData = await verifyResp.json();

      if (verifyData.ok) {
        updateStep(2, { status: 'success', detail: 'All checks passed' });
        setAllPassed(true);
      } else {
        const checkDetails = verifyData.checks || {};
        const failedItems = Object.entries(checkDetails)
          .filter(([, v]) => !v)
          .map(([k]) => k)
          .join(', ');
        updateStep(2, { status: 'failed', detail: `Failed: ${failedItems}` });
        setErrorInfo({
          code: verifyData.errorCode || 'VERIFY_FAILED',
          message: verifyData.errorMessage || 'Verification failed',
          suggestion: verifyData.suggestion || 'Check the failed items and retry.',
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Verification error';
      updateStep(2, { status: 'failed', detail: msg });
      setErrorInfo({ code: 'NETWORK_ERROR', message: msg, suggestion: 'Ensure backend is running.' });
    }

    setRunning(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-run pipeline on mount
  useEffect(() => {
    if (!hasAutoRun.current) {
      hasAutoRun.current = true;
      runPipeline();
    }
  }, [runPipeline]);

  return (
    <SetupShell currentStep={3} status={statusText}>
      <h1 className="text-2xl font-semibold tracking-tight">Initialize & Verify</h1>
      <p className="mt-2 text-sm text-slate-600">Applying config, starting gateway, and verifying Feishu connectivity.</p>

      <div className="mt-6 space-y-3">
        {pipeline.map((step, idx) => (
          <div key={idx} className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${stepIcon(step.status)}`}>
              {step.status === 'success' ? '\u2713' : step.status === 'failed' ? '\u2717' : step.status === 'running' ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
              ) : idx + 1}
            </span>
            <div className="flex-1">
              <div className="text-sm text-slate-700">{step.label}</div>
              {step.detail && <div className="mt-0.5 text-xs text-slate-500">{step.detail}</div>}
            </div>
            <span className={`rounded-md px-2 py-0.5 text-xs ${stepIcon(step.status)}`}>{stepLabel(step.status)}</span>
          </div>
        ))}
      </div>

      {/* Error info */}
      {errorInfo && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3">
          <div className="text-sm font-medium text-rose-700">{errorInfo.message}</div>
          <div className="mt-1 text-xs text-rose-600">{errorInfo.suggestion}</div>
        </div>
      )}

      {allPassed && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          All verifications passed. You can proceed to finish setup.
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Link href="/feishu" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">Back</Link>
        <div className="flex gap-2">
          {!allPassed && !running && (
            <button
              onClick={runPipeline}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => router.push('/done')}
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
