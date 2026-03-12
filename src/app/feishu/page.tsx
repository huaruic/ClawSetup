'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SetupShell } from '@/components/setup-shell';
import { useT } from '@/i18n/context';
import { loadOnboardingState, updateOnboardingState } from '@/lib/onboarding-state';

type FieldErrors = {
  appId?: string;
  appSecret?: string;
  pairingCode?: string;
};

type PairingRequest = {
  id: string;
  code: string;
  createdAt: string;
  lastSeenAt: string;
};

export default function FeishuPage() {
  const router = useRouter();
  const t = useT();
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [connecting, setConnecting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [connectionReady, setConnectionReady] = useState(false);
  const [pairingApproved, setPairingApproved] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [pairingRequest, setPairingRequest] = useState<PairingRequest | null>(null);
  const [autoFilledCode, setAutoFilledCode] = useState('');
  const [autoApproving, setAutoApproving] = useState(false);
  const [pairingMessage, setPairingMessage] = useState('');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [botOpenId, setBotOpenId] = useState('');

  const statusText = useMemo(() => {
    if (loadingConfig) return t('feishu.statusLoading');
    if (connecting) return t('feishu.statusConnecting');
    if (approving) return t('feishu.statusApproving');
    if (pairingApproved) return t('feishu.statusReady');
    if (connectionReady) return t('feishu.statusWaiting');
    return t('feishu.statusOptional');
  }, [loadingConfig, connecting, approving, pairingApproved, connectionReady, t]);

  async function loadPairingRequest() {
    try {
      const response = await fetch('/api/feishu/pairing', { cache: 'no-store' });
      const data = await response.json();
      if (!data.ok) return;

      const req = data.request ?? null;
      setPairingRequest(req);
      if (!req?.code) return;

      // Auto-fill if user hasn't manually typed a different code
      setPairingCode((prev) => {
        if (!prev || prev === autoFilledCode) {
          setAutoFilledCode(req.code);
          return req.code;
        }
        return prev;
      });

      // Auto-approve the detected code
      if (!autoApproving && !pairingApproved && !approving) {
        setAutoApproving(true);
        try {
          const approveResp = await fetch('/api/feishu/pairing/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: req.code }),
          });
          const approveData = await approveResp.json();
          if (approveResp.ok && approveData.ok) {
            setPairingCode(req.code);
            setPairingApproved(true);
            setPairingMessage(approveData.message || 'Pairing approved!');
            updateOnboardingState((current) => ({
              ...current,
              feishu: {
                status: 'passed',
                appId,
                connectionReady: true,
                pairingApproved: true,
                message: approveData.message || 'Pairing approved!',
              },
              done: {
                status: 'passed',
                variant: 'feishu_connected',
              },
            }));
          }
        } catch {
          // Auto-approve failed silently, user can still approve manually
        } finally {
          setAutoApproving(false);
        }
      }
    } catch {
      // Ignore polling failures
    }
  }

  useEffect(() => {
    const state = loadOnboardingState();
    if (state.feishu.appId) {
      setAppId(state.feishu.appId);
    }
    if (state.feishu.connectionReady) {
      setConnectionReady(true);
      setConnectionMessage(state.feishu.message ?? t('feishu.connectedMessage'));
    }
    if (state.feishu.status === 'passed') {
      setPairingApproved(true);
      setPairingMessage(state.feishu.message ?? '');
      setLoadingConfig(false);
      return;
    }

    fetch('/api/config/preview')
      .then((response) => response.json())
      .then(async (data) => {
        if (data.ok && data.config?.appId) {
          setAppId(data.config.appId);
          const verifyResponse = await fetch('/api/runtime/verify', { method: 'POST' });
          const verifyData = await verifyResponse.json();
          if (verifyData.ok) {
            setConnectionReady(true);
            setConnectionMessage(t('feishu.alreadyConnected'));
            void loadPairingRequest();
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!connectionReady || pairingApproved) return;
    void loadPairingRequest();
    const timer = window.setInterval(() => {
      void loadPairingRequest();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [connectionReady, pairingApproved]);

  function validateLocally(values: { appId: string; appSecret: string }): FieldErrors {
    const errors: FieldErrors = {};
    if (values.appId.trim().length < 4) errors.appId = t('feishu.appIdMinLength');
    if (values.appSecret.trim().length < 6) errors.appSecret = t('feishu.appSecretMinLength');
    return errors;
  }

  async function handleConnect() {
    setServerError('');
    setFieldErrors({});
    setConnectionMessage('');
    setPairingApproved(false);

    const values = { appId, appSecret };
    const localErrors = validateLocally(values);
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setConnecting(true);
    updateOnboardingState((current) => ({
      ...current,
      feishu: {
        status: 'running',
        appId,
        connectionReady: false,
        pairingApproved: false,
      },
      done: {
        status: 'pending',
      },
    }));
    try {
      const validationResponse = await fetch('/api/config/feishu/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const validationData = await validationResponse.json();
      if (!validationResponse.ok || !validationData.ok) {
        setServerError(validationData.error || 'Failed to validate Feishu credentials');
        return;
      }

      if (validationData.botOpenId) {
        setBotOpenId(validationData.botOpenId);
      }

      const applyResponse = await fetch('/api/config/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const applyData = await applyResponse.json();
      if (!applyResponse.ok || !applyData.ok) {
        setServerError(applyData.error || 'Failed to apply Feishu configuration');
        return;
      }

      const verifyResponse = await fetch('/api/runtime/verify', { method: 'POST' });
      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok || !verifyData.ok) {
        setServerError(verifyData.errorMessage || 'Feishu channel verification failed');
        updateOnboardingState((current) => ({
          ...current,
          feishu: {
            status: 'failed',
            appId,
            connectionReady: false,
            pairingApproved: false,
            message: verifyData.errorMessage || 'Feishu channel verification failed',
          },
        }));
        return;
      }

      setConnectionReady(true);
      setConnectionMessage(t('feishu.connectedMessage'));
      updateOnboardingState((current) => ({
        ...current,
        feishu: {
          status: 'running',
          appId,
          connectionReady: true,
          pairingApproved: false,
          message: t('feishu.connectedMessage'),
        },
      }));
      void loadPairingRequest();
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : 'Failed to connect Feishu');
      updateOnboardingState((current) => ({
        ...current,
        feishu: {
          status: 'failed',
          appId,
          connectionReady: false,
          pairingApproved: false,
          message: error instanceof Error ? error.message : 'Failed to connect Feishu',
        },
      }));
    } finally {
      setConnecting(false);
    }
  }

  async function handleApprovePairing() {
    setServerError('');
    setPairingMessage('');

    const code = pairingCode.trim().toUpperCase();
    if (code.length < 4) {
      setFieldErrors((prev) => ({ ...prev, pairingCode: t('feishu.pairingCodeMinLength') }));
      return;
    }

    setApproving(true);
    try {
      const response = await fetch('/api/feishu/pairing/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setServerError(data.error || 'Failed to approve Pairing Code');
        return;
      }

      setPairingApproved(true);
      setPairingMessage(data.message || 'Pairing approved!');
      updateOnboardingState((current) => ({
        ...current,
        feishu: {
          status: 'passed',
          appId,
          connectionReady: true,
          pairingApproved: true,
          message: data.message || 'Pairing approved!',
        },
        done: {
          status: 'passed',
          variant: 'feishu_connected',
        },
      }));
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : 'Failed to approve Pairing Code');
      updateOnboardingState((current) => ({
        ...current,
        feishu: {
          status: 'failed',
          appId,
          connectionReady,
          pairingApproved: false,
          message: error instanceof Error ? error.message : 'Failed to approve Pairing Code',
        },
      }));
    } finally {
      setApproving(false);
    }
  }

  function handleSkip() {
    updateOnboardingState((current) => ({
      ...current,
      feishu: {
        status: 'skipped',
        appId,
        connectionReady: false,
        pairingApproved: false,
      },
      done: {
        status: 'passed',
        variant: 'local_only',
      },
    }));
    router.push('/done');
  }

  const inputClass = (hasError: boolean) =>
    `h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 bg-background ${
      hasError
        ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
        : 'border-input focus:border-ring focus:ring-ring/20'
    }`;

  return (
    <SetupShell currentStep={5} status={statusText}>
      <h1 className="text-2xl font-semibold tracking-tight">{t('feishu.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('feishu.description')}</p>

      <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
        <div className="text-sm font-medium">{t('feishu.step1Title')}</div>
        <p className="mt-1 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('feishu.step1Desc') }} />

        <div className="mt-4 space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t('feishu.appId')}</span>
            <input
              type="text"
              value={appId}
              onChange={(event) => {
                setAppId(event.target.value);
                setFieldErrors((prev) => ({ ...prev, appId: undefined }));
                setConnectionReady(false);
                setPairingApproved(false);
              }}
              placeholder={t('feishu.appIdPlaceholder')}
              className={inputClass(!!fieldErrors.appId)}
            />
            {fieldErrors.appId && <p className="text-xs text-destructive">{fieldErrors.appId}</p>}
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">{t('feishu.appSecret')}</span>
            <input
              type="password"
              value={appSecret}
              onChange={(event) => {
                setAppSecret(event.target.value);
                setFieldErrors((prev) => ({ ...prev, appSecret: undefined }));
                setConnectionReady(false);
                setPairingApproved(false);
              }}
              placeholder={t('feishu.appSecretPlaceholder')}
              className={inputClass(!!fieldErrors.appSecret)}
            />
            {fieldErrors.appSecret && <p className="text-xs text-destructive">{fieldErrors.appSecret}</p>}
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {connecting ? t('feishu.connecting') : connectionReady ? t('feishu.reconnectFeishu') : t('feishu.connectFeishu')}
          </button>
          <button
            onClick={handleSkip}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
          >
            {t('common.skip')}
          </button>
        </div>

        {connectionMessage && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            {connectionMessage}
          </div>
        )}
      </div>

      <div className={`mt-6 rounded-lg border p-4 ${connectionReady ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' : 'border-border bg-muted/50 opacity-70'}`}>
        <div className="text-sm font-medium">{t('feishu.step2Title')}</div>
        <p className="mt-1 text-sm text-muted-foreground">{t('feishu.step2Desc')}</p>

        {connectionReady && botOpenId && !pairingApproved && (
          <a
            href={`https://applink.feishu.cn/client/chat/open?openId=${botOpenId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('feishu.openBotChat')}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        )}

        {connectionReady && !pairingApproved && !pairingRequest && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
            {t('feishu.waitingForMessage')}
          </div>
        )}

        {pairingRequest && !pairingApproved && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-400">
              {autoApproving && (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-amber-700 dark:border-amber-600 dark:border-t-amber-300" />
              )}
              {autoApproving
                ? t('feishu.autoApproving', { code: pairingRequest.code })
                : t('feishu.pendingCode', { code: pairingRequest.code })}
            </div>
            {!autoApproving && pairingCode !== pairingRequest.code && (
              <button
                onClick={() => {
                  setPairingCode(pairingRequest.code);
                  setAutoFilledCode(pairingRequest.code);
                  setFieldErrors((prev) => ({ ...prev, pairingCode: undefined }));
                }}
                className="ml-2 shrink-0 rounded px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-800/30"
              >
                {t('feishu.useThisCode')}
              </button>
            )}
          </div>
        )}

        <div className="mt-4 max-w-md space-y-1">
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t('feishu.pairingCode')}</span>
            <input
              type="text"
              value={pairingCode}
              onChange={(event) => {
                setPairingCode(event.target.value.toUpperCase());
                setFieldErrors((prev) => ({ ...prev, pairingCode: undefined }));
                setPairingMessage('');
              }}
              disabled={!connectionReady || pairingApproved}
              placeholder={t('feishu.pairingCodePlaceholder')}
              className={`${inputClass(!!fieldErrors.pairingCode)} disabled:cursor-not-allowed disabled:bg-muted`}
            />
            {fieldErrors.pairingCode && <p className="text-xs text-destructive">{fieldErrors.pairingCode}</p>}
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleApprovePairing}
            disabled={!connectionReady || approving || pairingApproved}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {approving ? t('feishu.approving') : pairingApproved ? t('feishu.paired') : t('feishu.approvePairing')}
          </button>
          <button
            onClick={() => void loadPairingRequest()}
            disabled={!connectionReady || approving}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('feishu.refresh')}
          </button>
        </div>

        {pairingMessage && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            {pairingMessage}
          </div>
        )}
      </div>

      {serverError && (
        <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Link href="/onboarding" className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">{t('common.back')}</Link>
        <button
          onClick={() => router.push('/done')}
          disabled={!pairingApproved}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('common.done')}
        </button>
      </div>
    </SetupShell>
  );
}
