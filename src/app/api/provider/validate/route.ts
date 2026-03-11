import { NextResponse } from 'next/server';
import { providers } from '@/lib/providers';

function normalizeSecret(value: string) {
  return value.trim().replace(/^['"]+|['"]+$/g, '');
}

function getErrorMessage(body: unknown) {
  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const error = record.error;
    if (typeof error === 'string' && error.trim()) {
      return error;
    }
    if (error && typeof error === 'object') {
      const nested = error as Record<string, unknown>;
      if (typeof nested.message === 'string' && nested.message.trim()) {
        return nested.message;
      }
      if (typeof nested.code === 'string' && nested.code.trim()) {
        return nested.code;
      }
    }
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }
  }

  return '';
}

function joinUrl(baseUrl: string, pathname: string) {
  return `${baseUrl.replace(/\/+$/, '')}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

async function validateOpenAiCompatible(baseUrl: string, apiKey: string) {
  const response = await fetch(joinUrl(baseUrl, '/models'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: 'no-store',
  });

  const bodyText = await response.text();
  let parsed: unknown = bodyText;
  try {
    parsed = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    parsed = bodyText;
  }

  if (!response.ok) {
    return {
      ok: false,
      message: getErrorMessage(parsed) || `HTTP ${response.status}: Validation failed`,
    };
  }

  const data = parsed && typeof parsed === 'object' ? (parsed as { data?: unknown }) : {};
  const modelCount = Array.isArray(data.data) ? data.data.length : undefined;

  return {
    ok: true,
    message: typeof modelCount === 'number'
      ? `Validated successfully. ${modelCount} models available.`
      : 'Validated successfully.',
  };
}

export async function POST(req: Request) {
  const body = await req.json();
  const { providerId, apiKey, providerRegion, customBaseUrl } = body as {
    providerId?: string;
    apiKey?: string;
    providerRegion?: string;
    customBaseUrl?: string;
  };

  if (!providerId) {
    return NextResponse.json({ ok: false, error: 'Provider is required' }, { status: 400 });
  }

  const provider = providers.find((item) => item.id === providerId);
  if (!provider) {
    return NextResponse.json({ ok: false, error: 'Unknown provider' }, { status: 400 });
  }

  const normalizedApiKey = normalizeSecret(apiKey ?? '');
  if (!normalizedApiKey && provider.id !== 'custom') {
    return NextResponse.json({ ok: false, error: 'API key is required' }, { status: 400 });
  }

  const selectedRegion = provider.regions?.find((region) => region.id === providerRegion);
  const baseUrl = provider.id === 'custom' ? customBaseUrl?.trim() : selectedRegion?.baseUrl;

  if (!baseUrl) {
    return NextResponse.json({
      ok: false,
      error: provider.regions?.length ? 'Please choose a region before validating' : 'Validation is not configured for this provider',
    }, { status: 400 });
  }

  try {
    const result = await validateOpenAiCompatible(baseUrl, normalizedApiKey);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: result.message,
      baseUrl,
    });
  } catch (error: unknown) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Provider validation failed',
    }, { status: 500 });
  }
}
