import Link from 'next/link';
import { ReactNode } from 'react';

type Step = { id: number; title: string; href: string };

const steps: Step[] = [
  { id: 1, title: 'Environment Check', href: '/' },
  { id: 2, title: 'Feishu Configuration', href: '/feishu' },
  { id: 3, title: 'Initialize & Verify', href: '/verify' },
];

export function SetupShell({ currentStep, children, status = 'Not started' }: { currentStep: number; children: ReactNode; status?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="text-sm font-semibold tracking-tight">ClawSetup</div>
          <div className="text-xs text-slate-500">Local Setup Wizard</div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-12 gap-6 px-6 py-8">
        <section className="col-span-12 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8">
          <div className="mb-6 flex items-center gap-3">
            {steps.map((step, idx) => {
              const isAccessible = step.id <= currentStep;
              const isCurrent = step.id === currentStep;

              return (
                <div key={step.id} className="flex items-center gap-3">
                  {isAccessible ? (
                    <Link href={step.href} className="flex items-center gap-3">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          isCurrent
                            ? 'bg-blue-600 text-white'
                            : step.id < currentStep
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {step.id < currentStep ? '\u2713' : step.id}
                      </div>
                      <span className={`text-sm ${isCurrent ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
                        {step.title}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 cursor-not-allowed">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-400">
                        {step.id}
                      </div>
                      <span className="text-sm text-slate-400">{step.title}</span>
                    </div>
                  )}
                  {idx < steps.length - 1 && <div className="h-px w-6 bg-slate-200" />}
                </div>
              );
            })}
          </div>
          {children}
        </section>

        <aside className="col-span-12 space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Current Status</h2>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">{status}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Setup Progress</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {steps.map((step) => {
                const done = step.id < currentStep;
                const active = step.id === currentStep;
                return (
                  <li key={step.id} className="flex items-center gap-2">
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {done ? '\u2713' : step.id}
                    </span>
                    <span className={done ? 'text-slate-500 line-through' : active ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                      {step.title}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
