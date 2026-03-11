import { NextResponse } from 'next/server';
import { commandExists, runShell } from '@/lib/shell';
import { getFeishuConfig, exchangeFeishuTenantToken, verifyFeishuBaseApi } from '@/lib/feishu';

export async function POST() {
  const latestFeishuConfig = getFeishuConfig();
  const configValid = Boolean(latestFeishuConfig);
  const hasOpenClaw = await commandExists('openclaw');

  let gatewayHealthy = false;
  try {
    const r = await runShell('openclaw gateway status');
    gatewayHealthy = r.exitCode === 0;
  } catch {
    gatewayHealthy = false;
  }

  let tokenExchangePassed = false;
  let baseApiPassed = false;
  let errorCode: string | null = null;
  let errorMessage: string | null = null;
  let suggestion: string | null = null;

  if (latestFeishuConfig) {
    try {
      const tokenResult = await exchangeFeishuTenantToken(latestFeishuConfig);
      tokenExchangePassed = tokenResult.ok;

      if (!tokenResult.ok) {
        errorCode = 'FEISHU_TOKEN_EXCHANGE_FAILED';
        errorMessage = tokenResult.msg ?? 'Failed to exchange tenant access token';
        suggestion = 'Check App ID and App Secret. Ensure the Feishu app is active.';
      }

      if (tokenResult.ok && tokenResult.token) {
        const baseResult = await verifyFeishuBaseApi(tokenResult.token);
        baseApiPassed = baseResult.ok;

        if (!baseResult.ok) {
          errorCode = 'FEISHU_BASE_API_FAILED';
          errorMessage = baseResult.msg ?? 'Failed to call Feishu base API';
          suggestion = 'Ensure the Feishu app has bot capability and correct permissions.';
        }
      }
    } catch (err: any) {
      errorCode = 'FEISHU_NETWORK_ERROR';
      errorMessage = err?.message ?? 'Network error when connecting to Feishu API';
      suggestion = 'Check your network connection and try again.';
    }
  } else {
    errorCode = 'FEISHU_CONFIG_MISSING';
    errorMessage = 'Feishu config has not been applied';
    suggestion = 'Go back to Step 2 and apply Feishu configuration.';
  }

  if (!hasOpenClaw) {
    errorCode = 'OPENCLAW_NOT_FOUND';
    errorMessage = 'OpenClaw is not installed';
    suggestion = 'Go back to Step 1 and install OpenClaw.';
  }

  if (!gatewayHealthy && hasOpenClaw) {
    errorCode = errorCode || 'GATEWAY_NOT_HEALTHY';
    errorMessage = errorMessage || 'Gateway is not running';
    suggestion = suggestion || 'Try restarting the gateway.';
  }

  const ok = configValid && hasOpenClaw && gatewayHealthy && tokenExchangePassed && baseApiPassed;

  return NextResponse.json({
    ok,
    checks: { configValid, hasOpenClaw, gatewayHealthy, tokenExchangePassed, baseApiPassed },
    errorCode,
    errorMessage,
    suggestion,
    message: ok ? 'verification_passed' : 'verification_failed',
  });
}
