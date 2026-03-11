'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SetupShell } from '@/components/setup-shell';
import { useT } from '@/i18n/context';
import { loadOnboardingState } from '@/lib/onboarding-state';

export default function DonePage() {
  const t = useT();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const [variant, setVariant] = useState<'local_only' | 'feishu_connected'>('local_only');

  useEffect(() => {
    const state = loadOnboardingState();
    if (state.done.variant === 'feishu_connected') {
      setVariant('feishu_connected');
    }
  }, []);

  const copy = useMemo(() => {
    if (variant === 'feishu_connected') {
      return {
        description: t('done.feishuDescription'),
        cardTitle: t('done.feishuTitle'),
        cardDescription: t('done.feishuDesc'),
      };
    }

    return {
      description: t('done.description'),
      cardTitle: t('done.localOnlyTitle'),
      cardDescription: t('done.localOnlyDescription'),
    };
  }, [t, variant]);

  async function handleOpenDashboard() {
    setOpening(true);
    setError('');

    try {
      const resp = await fetch('/api/runtime/dashboard-url');
      const data = await resp.json();

      if (!data.ok || !data.url) {
        setError(data.error || 'Failed to open OpenClaw Dashboard');
        return;
      }

      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open OpenClaw Dashboard');
    } finally {
      setOpening(false);
    }
  }

  return (
    <SetupShell currentStep={6} status={t('done.statusComplete')}>
      <h1 className="text-2xl font-semibold tracking-tight">{t('done.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>

      <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
        <h2 className="text-base font-medium text-green-800 dark:text-green-400">{copy.cardTitle}</h2>
        <p className="mt-2 text-sm text-green-700 dark:text-green-400/80">
          {copy.cardDescription}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Link href="/feishu" className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">{t('common.back')}</Link>
        <button
          onClick={handleOpenDashboard}
          disabled={opening}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {opening ? t('done.opening') : t('done.openDashboard')}
        </button>
      </div>
    </SetupShell>
  );
}
