'use client';

export type OnboardingStepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export type DoneVariant = 'local_only' | 'feishu_connected';

export type ProviderConfigState = {
  providerId: string;
  apiKey: string;
  providerRegion?: string;
  customBaseUrl?: string;
  customModelId?: string;
};

export type ProviderStepState = {
  status: OnboardingStepStatus;
  config?: ProviderConfigState;
  message?: string;
};

export type OpenClawStepState = {
  status: OnboardingStepStatus;
  message?: string;
};

export type FeishuStepState = {
  status: OnboardingStepStatus;
  appId?: string;
  connectionReady?: boolean;
  pairingApproved?: boolean;
  message?: string;
};

export type DoneStepState = {
  status: OnboardingStepStatus;
  variant?: DoneVariant;
};

export type OnboardingState = {
  openclawInstall: OpenClawStepState;
  provider: ProviderStepState;
  onboarding: OpenClawStepState;
  feishu: FeishuStepState;
  done: DoneStepState;
};

const STORAGE_KEY = 'clawsetup_onboarding_state';

export const defaultOnboardingState: OnboardingState = {
  openclawInstall: { status: 'pending' },
  provider: { status: 'pending' },
  onboarding: { status: 'pending' },
  feishu: { status: 'pending' },
  done: { status: 'pending' },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStatus(value: unknown): OnboardingStepStatus {
  return value === 'running' || value === 'passed' || value === 'failed' || value === 'skipped' ? value : 'pending';
}

function normalizeProviderState(value: unknown): ProviderStepState {
  if (!isObject(value)) {
    return { status: 'pending' };
  }

  const config = isObject(value.config)
    ? {
        providerId: typeof value.config.providerId === 'string' ? value.config.providerId : '',
        apiKey: typeof value.config.apiKey === 'string' ? value.config.apiKey : '',
        ...(typeof value.config.providerRegion === 'string' ? { providerRegion: value.config.providerRegion } : {}),
        ...(typeof value.config.customBaseUrl === 'string' ? { customBaseUrl: value.config.customBaseUrl } : {}),
        ...(typeof value.config.customModelId === 'string' ? { customModelId: value.config.customModelId } : {}),
      }
    : undefined;

  return {
    status: normalizeStatus(value.status),
    ...(config?.providerId ? { config } : {}),
    ...(typeof value.message === 'string' ? { message: value.message } : {}),
  };
}

function normalizeOpenClawState(value: unknown): OpenClawStepState {
  if (!isObject(value)) {
    return { status: 'pending' };
  }

  return {
    status: normalizeStatus(value.status),
    ...(typeof value.message === 'string' ? { message: value.message } : {}),
  };
}

function normalizeFeishuState(value: unknown): FeishuStepState {
  if (!isObject(value)) {
    return { status: 'pending' };
  }

  return {
    status: normalizeStatus(value.status),
    ...(typeof value.appId === 'string' ? { appId: value.appId } : {}),
    ...(typeof value.connectionReady === 'boolean' ? { connectionReady: value.connectionReady } : {}),
    ...(typeof value.pairingApproved === 'boolean' ? { pairingApproved: value.pairingApproved } : {}),
    ...(typeof value.message === 'string' ? { message: value.message } : {}),
  };
}

function normalizeDoneState(value: unknown): DoneStepState {
  if (!isObject(value)) {
    return { status: 'pending' };
  }

  return {
    status: normalizeStatus(value.status),
    ...(value.variant === 'local_only' || value.variant === 'feishu_connected' ? { variant: value.variant } : {}),
  };
}

function normalizeState(value: unknown): OnboardingState {
  if (!isObject(value)) {
    return defaultOnboardingState;
  }

  return {
    openclawInstall: normalizeOpenClawState(value.openclawInstall),
    provider: normalizeProviderState(value.provider),
    onboarding: normalizeOpenClawState(value.onboarding),
    feishu: normalizeFeishuState(value.feishu),
    done: normalizeDoneState(value.done),
  };
}

export function loadOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') {
    return defaultOnboardingState;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultOnboardingState;
    }

    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultOnboardingState;
  }
}

export function saveOnboardingState(state: OnboardingState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function updateOnboardingState(updater: (current: OnboardingState) => OnboardingState) {
  const nextState = updater(loadOnboardingState());
  saveOnboardingState(nextState);
  return nextState;
}
