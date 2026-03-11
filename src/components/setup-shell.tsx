'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { useT } from '@/i18n/context';
import { ThemeToggle, LanguageToggle } from '@/components/toolbar';

type Step = { id: number; titleKey: string; href: string };

const steps: Step[] = [
  { id: 1, titleKey: 'shell.steps.env', href: '/' },
  { id: 2, titleKey: 'shell.steps.provider', href: '/provider' },
  { id: 3, titleKey: 'shell.steps.verify', href: '/onboarding' },
  { id: 4, titleKey: 'shell.steps.channels', href: '/feishu' },
  { id: 5, titleKey: 'shell.steps.done', href: '/done' },
];

export function SetupShell({ currentStep, children, status = 'Not started' }: { currentStep: number; children: ReactNode; status?: string }) {
  const t = useT();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="text-sm font-semibold tracking-tight">{t('shell.title')}</div>
          <div className="flex items-center gap-1">
            <span className="mr-2 text-xs text-muted-foreground">{t('shell.subtitle')}</span>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-12 gap-6 px-6 py-8">
        <section className="col-span-12 rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-8">
          <div className="mb-6 flex items-center gap-2 overflow-x-auto">
            {steps.map((step, idx) => {
              const isAccessible = step.id <= currentStep;
              const isCurrent = step.id === currentStep;

              return (
                <div key={step.id} className="flex items-center gap-2 shrink-0">
                  {isAccessible ? (
                    <Link href={step.href} className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : step.id < currentStep
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {step.id < currentStep ? '\u2713' : step.id}
                      </div>
                      <span className={`text-sm whitespace-nowrap ${isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {t(step.titleKey)}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 cursor-not-allowed">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground/50">
                        {step.id}
                      </div>
                      <span className="text-sm whitespace-nowrap text-muted-foreground/50">{t(step.titleKey)}</span>
                    </div>
                  )}
                  {idx < steps.length - 1 && <div className="h-px w-4 bg-border shrink-0" />}
                </div>
              );
            })}
          </div>
          {children}
        </section>

        <aside className="col-span-12 space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">{t('shell.currentStatus')}</h2>
            <div className="mt-3 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">{status}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">{t('shell.setupProgress')}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {steps.map((step) => {
                const done = step.id < currentStep;
                const active = step.id === currentStep;
                return (
                  <li key={step.id} className="flex items-center gap-2">
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      done
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : active
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-muted text-muted-foreground/50'
                    }`}>
                      {done ? '\u2713' : step.id}
                    </span>
                    <span className={
                      done
                        ? 'text-muted-foreground line-through'
                        : active
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground/50'
                    }>
                      {t(step.titleKey)}
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
