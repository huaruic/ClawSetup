'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SetupShell } from '@/components/setup-shell';
import { useT } from '@/i18n/context';
import { loadOnboardingState, updateOnboardingState } from '@/lib/onboarding-state';

type StepStatus = 'pending' | 'running' | 'success' | 'failed';

type PipelineStep = {
  label: string;
  status: StepStatus;
  detail?: string;
};

type RuntimeStatusResponse = {
  ok?: boolean;
  installed?: boolean;
  ready?: boolean;
  summary?: string;
  status?: string;
  output?: string;
  error?: string;
};

function stepIcon(status: StepStatus) {
  if (status === 'success') return 'border-emerald-600 bg-emerald-200 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-800 dark:text-emerald-100';
  if (status === 'failed') return 'border-red-600 bg-red-200 text-red-900 dark:border-red-500 dark:bg-red-800 dark:text-red-100';
  if (status === 'running') return 'border-blue-600 bg-blue-200 text-blue-900 dark:border-blue-500 dark:bg-blue-800 dark:text-blue-100';
  return 'border-border bg-muted text-muted-foreground';
}

function appendRuntimeOutput(addLog: (line: string) => void, label: string, data: RuntimeStatusResponse) {
  addLog(label);
  if (data.summary) addLog(data.summary);

  const rawOutput = typeof data.output === 'string' && data.output.trim().length > 0
    ? data.output
    : typeof data.status === 'string'
      ? data.status
      : '';

  if (!rawOutput) return;

  for (const line of rawOutput.split('\n').map((value) => value.trim()).filter(Boolean)) {
    addLog(`  ${line}`);
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const t = useT();
  const [pipeline, setPipeline] = useState<PipelineStep[]>([
    {
      label: t('verify.steps.setupCli'),
      status: 'running',
      detail: t('verify.setupChecking'),
    },
  ]);
  const [running, setRunning] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorInfo, setErrorInfo] = useState<{ message: string; suggestion: string } | null>(null);
  const [allPassed, setAllPassed] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const hasAutoRun = useRef(false);

  const statusText = useMemo(() => {
    if (running) return t('verify.statusRunning');
    if (allPassed) return t('verify.statusCompleted');
    if (errorInfo) return t('verify.statusFailed', { message: errorInfo.message });
    return t('verify.statusInit');
  }, [running, allPassed, errorInfo, t]);

  const updateStep = useCallback((index: number, update: Partial<PipelineStep>) => {
    setPipeline((prev) => prev.map((step, currentIndex) => (currentIndex === index ? { ...step, ...update } : step)));
  }, []);

  const addLog = useCallback((line: string) => {
    setLogs((prev) => [...prev, line]);
  }, []);

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

  const runPipeline = useCallback(async () => {
    setRunning(true);
    setLogs([]);
    setErrorInfo(null);
    setAllPassed(false);
    setPipeline([
      {
        label: t('verify.steps.setupCli'),
        status: 'running',
        detail: t('verify.setupChecking'),
      },
    ]);

    const providerRaw = sessionStorage.getItem('clawsetup_provider');
    const storedProviderConfig = loadOnboardingState().provider.config;
    const providerConfig = providerRaw ? JSON.parse(providerRaw) : storedProviderConfig;

    if (!providerConfig) {
      updateStep(0, { status: 'failed', detail: t('verify.noProvider') });
      setErrorInfo({ message: t('verify.noProvider'), suggestion: t('verify.noProviderSuggestion') });
      setRunning(false);
      return;
    }

    updateOnboardingState((current) => ({
      ...current,
      onboarding: {
        status: 'running',
      },
      done: {
        status: 'pending',
      },
    }));

    try {
      addLog(t('verify.setupChecking'));
      const statusResponse = await fetch('/api/runtime/status');
      const statusData = await statusResponse.json() as RuntimeStatusResponse;
      appendRuntimeOutput(addLog, t('verify.initialStatusLog'), statusData);

      if (statusResponse.ok && statusData.ok && statusData.ready) {
        addLog(t('verify.resettingChannels'));
        await fetch('/api/config/reset-channels', { method: 'POST' });
        addLog(t('verify.channelsReset'));

        updateStep(0, { status: 'success', detail: t('verify.setupAlreadyReady') });
        setAllPassed(true);
        updateOnboardingState((current) => ({
          ...current,
          onboarding: {
            status: 'passed',
            message: t('verify.setupAlreadyReady'),
          },
        }));
        setRunning(false);
        return;
      }

      addLog(statusData.summary || t('verify.setupNeedsInstall'));
      updateStep(0, { status: 'running', detail: t('verify.setupRunning') });
      addLog(t('verify.setupRunning'));

      const onboardResp = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerConfig),
      });
      const onboardData = await onboardResp.json();

      if (!onboardData.taskId) {
        updateStep(0, { status: 'failed', detail: onboardData.error || t('verify.setupFailed') });
        setErrorInfo({ message: onboardData.error || t('verify.setupFailed'), suggestion: t('verify.setupFailedSuggestion') });
        updateOnboardingState((current) => ({
          ...current,
          onboarding: {
            status: 'failed',
            message: onboardData.error || t('verify.setupFailed'),
          },
        }));
        setRunning(false);
        return;
      }

      if (onboardData.status !== 'success') {
        const result = await waitForTask(onboardData.taskId);
        if (result === 'failed') {
          updateStep(0, { status: 'failed', detail: t('verify.setupFailed') });
          setErrorInfo({ message: t('verify.setupFailed'), suggestion: t('verify.setupFailedSuggestion') });
          updateOnboardingState((current) => ({
            ...current,
            onboarding: {
              status: 'failed',
              message: t('verify.setupFailed'),
            },
          }));
          setRunning(false);
          return;
        }
      }

      addLog(t('verify.gatewayChecking'));
      const finalStatusResponse = await fetch('/api/runtime/status');
      const finalStatusData = await finalStatusResponse.json() as RuntimeStatusResponse;
      appendRuntimeOutput(addLog, t('verify.finalStatusLog'), finalStatusData);

      if (!finalStatusResponse.ok || !finalStatusData.ok || !finalStatusData.ready) {
        updateStep(0, { status: 'failed', detail: finalStatusData.summary || finalStatusData.error || t('verify.gatewayCheckFailed') });
        setErrorInfo({
          message: finalStatusData.summary || finalStatusData.error || t('verify.gatewayCheckFailed'),
          suggestion: t('verify.setupRetrySuggestion'),
        });
        updateOnboardingState((current) => ({
          ...current,
          onboarding: {
            status: 'failed',
            message: finalStatusData.summary || finalStatusData.error || t('verify.gatewayCheckFailed'),
          },
        }));
        setRunning(false);
        return;
      }

      updateStep(0, { status: 'success', detail: t('verify.setupDetail') });
      setAllPassed(true);
      updateOnboardingState((current) => ({
        ...current,
        onboarding: {
          status: 'passed',
          message: t('verify.gatewayReady'),
        },
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('verify.setupFailed');
      updateStep(0, { status: 'failed', detail: message });
      setErrorInfo({ message, suggestion: t('verify.ensureServer') });
      updateOnboardingState((current) => ({
        ...current,
        onboarding: {
          status: 'failed',
          message,
        },
      }));
      setRunning(false);
      return;
    }

    setRunning(false);
  }, [addLog, updateStep, waitForTask, t]);

  useEffect(() => {
    if (!hasAutoRun.current) {
      hasAutoRun.current = true;
      void runPipeline();
    }
  }, [runPipeline, t]);

  function stepStatusLabel(status: StepStatus) {
    return t(`common.${status === 'success' ? 'passed' : status}`);
  }

  async function handleOpenOpenClaw() {
    setOpeningDashboard(true);
    try {
      const response = await fetch('/api/runtime/dashboard-url');
      const data = await response.json();
      if (!data.ok || !data.url) {
        setErrorInfo({
          message: data.error || t('verify.gatewayCheckFailed'),
          suggestion: t('verify.checkOpenClaw'),
        });
        return;
      }
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (error: unknown) {
      setErrorInfo({
        message: error instanceof Error ? error.message : t('verify.gatewayCheckFailed'),
        suggestion: t('verify.checkOpenClaw'),
      });
    } finally {
      setOpeningDashboard(false);
    }
  }

  return (
    <SetupShell currentStep={4} status={statusText}>
      <h1 className="text-2xl font-bold tracking-tight">{t('verify.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('verify.description')}</p>

      <div className="mt-6 space-y-3">
        {pipeline.map((step, index) => (
          <div key={index} className="flex items-center gap-3 rounded-xl border-2 border-border px-4 py-3 brutal-shadow-sm">
            <span className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 text-xs font-bold ${stepIcon(step.status)}`}>
              {step.status === 'success' ? '\u2713' : step.status === 'failed' ? '\u2717' : step.status === 'running' ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700 dark:border-blue-600 dark:border-t-blue-300" />
              ) : index + 1}
            </span>
            <div className="flex-1">
              <div className="text-sm">{step.label}</div>
              {step.detail && <div className="mt-0.5 text-xs text-muted-foreground">{step.detail}</div>}
            </div>
            <span className={`rounded-lg border-2 px-2 py-0.5 text-xs font-bold ${stepIcon(step.status)}`}>{stepStatusLabel(step.status)}</span>
          </div>
        ))}
      </div>

      {errorInfo && (
        <div className="mt-4 rounded-xl border-2 border-destructive bg-destructive/10 p-3">
          <div className="text-sm font-bold text-destructive">{errorInfo.message}</div>
          <div className="mt-1 text-xs text-destructive/80">{errorInfo.suggestion}</div>
        </div>
      )}

      {allPassed && (
        <div className="mt-4 rounded-xl border-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300">
          {t('verify.allCompleted')}
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-4 rounded-xl border-2 border-border bg-zinc-950 p-4 text-xs text-zinc-200 brutal-shadow-sm">
          <div className="mb-2 font-bold text-zinc-100">{t('verify.activity')}</div>
          <div className="max-h-48 overflow-auto space-y-1 font-mono">
            {logs.map((line, index) => (
              <div key={`${index}-${line.slice(0, 16)}`}>{line}</div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Link href="/provider" className="rounded-xl border-2 border-border bg-card px-4 py-2 text-sm font-bold text-foreground brutal-shadow-sm transition-all hover:brutal-shadow active:brutal-shadow-active">{t('common.back')}</Link>

        <div className="flex gap-2">
          {!allPassed && !running && (
            <button
              onClick={runPipeline}
              className="rounded-xl border-2 border-border bg-card px-4 py-2 text-sm font-bold text-foreground brutal-shadow-sm transition-all hover:brutal-shadow active:brutal-shadow-active"
            >
              {t('common.retry')}
            </button>
          )}
          <button
            onClick={handleOpenOpenClaw}
            disabled={!allPassed}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {openingDashboard ? t('verify.openingOpenClaw') : t('verify.openOpenClaw')}
          </button>
          <button
            onClick={() => router.push('/feishu')}
            disabled={!allPassed}
            className="rounded-xl border-2 border-border bg-primary px-4 py-2 text-sm font-bold text-primary-foreground brutal-shadow transition-all hover:brutal-shadow-hover active:brutal-shadow-active disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('common.next')}
          </button>
        </div>
      </div>
    </SetupShell>
  );
}
