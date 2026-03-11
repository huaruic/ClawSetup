'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SetupShell } from '@/components/setup-shell';

const API_BASE = '';

type FieldErrors = {
  appId?: string;
  appSecret?: string;
  verificationToken?: string;
};

function validateLocally(values: { appId: string; appSecret: string; verificationToken: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (values.appId.length < 4) errors.appId = 'App ID must be at least 4 characters';
  if (values.appSecret.length < 6) errors.appSecret = 'App Secret must be at least 6 characters';
  if (values.verificationToken.length < 4) errors.verificationToken = 'Verification Token must be at least 4 characters';
  return errors;
}

export default function FeishuPage() {
  const router = useRouter();
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [validated, setValidated] = useState(false);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Load saved config on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/config/preview`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.config) {
          if (data.config.appId) setAppId(data.config.appId);
          // Secret fields come masked, don't fill them
          setApplied(true);
          setValidated(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  }, []);

  const statusText = useMemo(() => {
    if (loadingConfig) return 'Loading saved config...';
    if (loading) return 'Validating...';
    if (applied) return 'Configuration applied';
    if (validated) return 'Validation passed';
    if (serverError) return 'Validation failed';
    return 'Waiting for Feishu credentials';
  }, [loading, applied, validated, serverError, loadingConfig]);

  async function handleValidateAndApply() {
    setServerError('');
    setFieldErrors({});
    setValidated(false);
    setApplied(false);

    const values = { appId, appSecret, verificationToken };
    const localErrors = validateLocally(values);
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setLoading(true);
    try {
      // Step 1: validate
      const valResp = await fetch(`${API_BASE}/api/config/feishu/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const valData = await valResp.json();
      if (!valData.ok) {
        if (valData.errors) {
          const mapped: FieldErrors = {};
          if (valData.errors.appId) mapped.appId = valData.errors.appId.join(', ');
          if (valData.errors.appSecret) mapped.appSecret = valData.errors.appSecret.join(', ');
          if (valData.errors.verificationToken) mapped.verificationToken = valData.errors.verificationToken.join(', ');
          setFieldErrors(mapped);
        } else {
          setServerError('Validation failed');
        }
        return;
      }
      setValidated(true);

      // Step 2: apply
      const applyResp = await fetch(`${API_BASE}/api/config/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const applyData = await applyResp.json();
      if (!applyData.ok) {
        setServerError('Failed to apply configuration');
        return;
      }
      setApplied(true);
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const fields: Array<{ label: string; key: keyof FieldErrors; value: string; setter: (v: string) => void; placeholder: string; type: string }> = [
    { label: 'App ID', key: 'appId', value: appId, setter: setAppId, placeholder: 'cli_xxx', type: 'text' },
    { label: 'App Secret', key: 'appSecret', value: appSecret, setter: setAppSecret, placeholder: 'Enter App Secret', type: 'password' },
    { label: 'Verification Token', key: 'verificationToken', value: verificationToken, setter: setVerificationToken, placeholder: 'Enter Verification Token', type: 'text' },
  ];

  return (
    <SetupShell currentStep={2} status={statusText}>
      <h1 className="text-2xl font-semibold tracking-tight">Feishu Configuration</h1>
      <p className="mt-2 text-sm text-slate-600">Enter the credentials from your Feishu bot application.</p>

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-sm text-blue-800">
          Not sure how to get these credentials? Follow the{' '}
          <a
            href="https://www.feishu.cn/content/article/7613711414611463386"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline hover:text-blue-900"
          >
            Feishu Bot Setup Guide
          </a>{' '}
          to create a Feishu app and obtain your App ID, App Secret, and Verification Token.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {fields.map((f) => (
          <label key={f.key} className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">{f.label}</span>
            <input
              type={f.type}
              value={f.value}
              onChange={(e) => {
                f.setter(e.target.value);
                setFieldErrors((prev) => ({ ...prev, [f.key]: undefined }));
                setValidated(false);
                setApplied(false);
              }}
              placeholder={f.placeholder}
              className={`h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${
                fieldErrors[f.key]
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
              }`}
            />
            {fieldErrors[f.key] && <p className="text-xs text-red-600">{fieldErrors[f.key]}</p>}
          </label>
        ))}
      </div>

      {serverError && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{serverError}</div>
      )}

      {applied && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Configuration applied successfully.
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Link href="/" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">Back</Link>
        <div className="flex gap-2">
          <button
            onClick={handleValidateAndApply}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Validating...' : applied ? 'Re-validate & Apply' : 'Validate & Apply'}
          </button>
          <button
            onClick={() => router.push('/verify')}
            disabled={!applied}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </SetupShell>
  );
}
