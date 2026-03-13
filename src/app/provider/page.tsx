'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SetupShell } from '@/components/setup-shell';
import { Select, SelectTrigger, SelectValue, SelectIcon, SelectPopup, SelectItem } from '@/components/ui/select';
import { providers } from '@/lib/providers';
import { useT } from '@/i18n/context';
import { loadOnboardingState, updateOnboardingState } from '@/lib/onboarding-state';

export default function ProviderPage() {
  const router = useRouter();
  const t = useT();
  const [selectedId, setSelectedId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [providerRegion, setProviderRegion] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customModelId, setCustomModelId] = useState('');
  const [saved, setSaved] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [validationMessage, setValidationMessage] = useState('');

  const selected = providers.find((p) => p.id === selectedId);
  const isCustom = selectedId === 'custom';
  const requiresRegion = Boolean(selected?.regions?.length);
  const supportsProviderValidation = Boolean(selected?.regions?.length || isCustom);

  const canSave = useMemo(() => {
    if (!selectedId) return false;
    if (requiresRegion && !providerRegion) return false;
    if (isCustom) return !!customBaseUrl && !!customModelId;
    return apiKey.length >= 4;
  }, [selectedId, apiKey, isCustom, customBaseUrl, customModelId, requiresRegion, providerRegion]);

  const statusText = useMemo(() => {
    if (saved) return t('provider.statusConfigured');
    if (selectedId) return t('provider.statusSelected', { name: selected?.name ?? '' });
    return t('provider.statusSelect');
  }, [saved, selectedId, selected, t]);

  function normalizeSecret(value: string) {
    return value.trim().replace(/^['"]+|['"]+$/g, '');
  }

  useEffect(() => {
    const state = loadOnboardingState();
    const config = state.provider.config;
    if (!config?.providerId) {
      return;
    }

    setSelectedId(config.providerId);
    setApiKey(config.apiKey);
    setProviderRegion(config.providerRegion ?? '');
    setCustomBaseUrl(config.customBaseUrl ?? '');
    setCustomModelId(config.customModelId ?? '');
    setSaved(state.provider.status === 'passed');
    setValidationMessage(state.provider.message ?? '');
  }, []);

  async function handleSave() {
    setError('');
    setValidationMessage('');
    if (!canSave) return;

    const config = {
      providerId: selectedId,
      apiKey: normalizeSecret(apiKey),
      providerRegion,
      customBaseUrl: customBaseUrl.trim(),
      customModelId: customModelId.trim(),
    };

    if (!supportsProviderValidation) {
      sessionStorage.setItem('clawsetup_provider', JSON.stringify(config));
      updateOnboardingState((current) => ({
        ...current,
        provider: {
          status: 'passed',
          config,
          message: t('provider.configuredMessage'),
        },
      }));
      setApiKey(config.apiKey);
      setCustomBaseUrl(config.customBaseUrl);
      setCustomModelId(config.customModelId);
      setValidationMessage(t('provider.configuredMessage'));
      setSaved(true);
      return;
    }

    setValidating(true);
    try {
      const response = await fetch('/api/provider/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error || 'Provider validation failed');
        setSaved(false);
        return;
      }

      sessionStorage.setItem('clawsetup_provider', JSON.stringify(config));
      updateOnboardingState((current) => ({
        ...current,
        provider: {
          status: 'passed',
          config,
          message: data.message || t('provider.validatedMessage'),
        },
      }));
      setApiKey(config.apiKey);
      setCustomBaseUrl(config.customBaseUrl);
      setCustomModelId(config.customModelId);
      setValidationMessage(data.message || t('provider.validatedMessage'));
      setSaved(true);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Provider validation failed');
      setSaved(false);
    } finally {
      setValidating(false);
    }
  }

  function handleProviderChange(id: string) {
    const nextProvider = providers.find((provider) => provider.id === id);
    setSelectedId(id);
    setApiKey('');
    setProviderRegion(nextProvider?.regions?.[0]?.id ?? '');
    setCustomBaseUrl('');
    setCustomModelId('');
    setSaved(false);
    setValidationMessage('');
    setError('');
  }

  return (
    <SetupShell currentStep={3} status={statusText}>
      <h1 className="text-2xl font-semibold tracking-tight">{t('provider.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('provider.description')}</p>

      <div className="mt-6 space-y-4">
        <div className="space-y-1">
          <span className="text-sm font-medium">{t('provider.selectProvider')}</span>
          <Select
            value={selectedId}
            onValueChange={(val: string | null) => val != null && handleProviderChange(val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('provider.selectPlaceholder')} />
              <SelectIcon />
            </SelectTrigger>
            <SelectPopup>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>

        {selected && (
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t('provider.apiKey')}</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setSaved(false);
                setValidationMessage('');
              }}
              placeholder={selected.placeholder}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </label>
        )}

        {selected?.regions && (
          <div className="space-y-1">
            <span className="text-sm font-medium">{t('provider.region')}</span>
            <Select
              value={providerRegion}
              onValueChange={(val: string | null) => {
                if (!val) return;
                setProviderRegion(val);
                setSaved(false);
                setValidationMessage('');
              }}
            >
              <SelectTrigger>
                <SelectValue />
                <SelectIcon />
              </SelectTrigger>
              <SelectPopup>
                {selected.regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>{region.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selected.regions.find((region) => region.id === providerRegion)?.helpText}
            </p>
          </div>
        )}

        {isCustom && (
          <>
            {selected?.extra?.map((field) => (
              <label key={field.label} className="block space-y-1">
                <span className="text-sm font-medium">{field.label}</span>
                <input
                  type="text"
                  value={field.label === 'Base URL' ? customBaseUrl : customModelId}
                  onChange={(e) => {
                    if (field.label === 'Base URL') setCustomBaseUrl(e.target.value);
                    else setCustomModelId(e.target.value);
                    setSaved(false);
                    setValidationMessage('');
                  }}
                  placeholder={field.placeholder}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </label>
            ))}
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      {saved && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          {validationMessage || (supportsProviderValidation ? t('provider.validatedMessage') : t('provider.configuredMessage'))}
          {' '}{t('provider.applyNote')}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Link href="/openclaw" className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">{t('common.back')}</Link>
        <div className="flex gap-2">
          {!saved && (
            <button
              onClick={handleSave}
              disabled={!canSave || validating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {validating ? t('provider.validating') : supportsProviderValidation ? t('provider.validateAndSave') : t('common.save')}
            </button>
          )}
          <button
            onClick={() => router.push('/onboarding')}
            disabled={!saved}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('common.next')}
          </button>
        </div>
      </div>
    </SetupShell>
  );
}
