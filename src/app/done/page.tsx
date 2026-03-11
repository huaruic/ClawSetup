'use client';

import Link from 'next/link';
import { SetupShell } from '@/components/setup-shell';

const GATEWAY_URL = 'http://127.0.0.1:18789/';

export default function DonePage() {
  return (
    <SetupShell currentStep={3} status="Setup completed">
      <h1 className="text-2xl font-semibold tracking-tight">Setup Complete</h1>
      <p className="mt-2 text-sm text-slate-600">OpenClaw and the Feishu plugin are configured and ready to use.</p>

      <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5">
        <h2 className="text-base font-medium text-green-800">All set!</h2>
        <p className="mt-2 text-sm text-green-700">
          Your OpenClaw gateway is running and the Feishu bot is connected. You can now open the OpenClaw Dashboard to manage your setup.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link href="/verify" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">Back</Link>
        <a
          href={GATEWAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Open OpenClaw Dashboard
        </a>
      </div>
    </SetupShell>
  );
}
