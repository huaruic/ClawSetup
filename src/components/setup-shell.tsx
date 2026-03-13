'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useT } from '@/i18n/context';
import { ThemeToggle, LanguageToggle } from '@/components/toolbar';

type Step = { id: number; titleKey: string; href: string };

const steps: Step[] = [
  { id: 1, titleKey: 'shell.steps.welcome', href: '/' },
  { id: 2, titleKey: 'shell.steps.openclaw', href: '/openclaw' },
  { id: 3, titleKey: 'shell.steps.provider', href: '/provider' },
  { id: 4, titleKey: 'shell.steps.verify', href: '/onboarding' },
  { id: 5, titleKey: 'shell.steps.channels', href: '/feishu' },
  { id: 6, titleKey: 'shell.steps.done', href: '/done' },
];

export function SetupShell({ currentStep, children, status = 'Not started' }: { currentStep: number; children: ReactNode; status?: string }) {
  const t = useT();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b-2 border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">{t('shell.title')}</span>
            <span className="rounded-lg border-2 border-border bg-accent/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
              {t('shell.subtitle')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-12 gap-6 px-6 py-8">
        <section className="col-span-12 rounded-2xl border-2 border-border bg-card p-6 brutal-shadow lg:col-span-8">
          <div className="mb-6 flex items-center gap-2 overflow-x-auto">
            {steps.map((step, idx) => {
              const isAccessible = step.id <= currentStep;
              const isCurrent = step.id === currentStep;

              return (
                <div key={step.id} className="flex items-center gap-2 shrink-0">
                  {isAccessible ? (
                    <Link href={step.href} className="flex items-center gap-2 group">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 border-border text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground brutal-shadow-sm'
                            : step.id < currentStep
                              ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {step.id < currentStep ? '\u2713' : step.id}
                      </div>
                      <span className={`text-sm whitespace-nowrap ${isCurrent ? 'font-bold text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                        {t(step.titleKey)}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 cursor-not-allowed">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-border/40 bg-muted text-xs font-bold text-muted-foreground/40">
                        {step.id}
                      </div>
                      <span className="text-sm whitespace-nowrap text-muted-foreground/40">{t(step.titleKey)}</span>
                    </div>
                  )}
                  {idx < steps.length - 1 && <div className="h-0.5 w-4 bg-border shrink-0 rounded-full" />}
                </div>
              );
            })}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </section>

        <aside className="col-span-12 space-y-4 lg:col-span-4">
          <div className="rounded-2xl border-2 border-border bg-card p-5 brutal-shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider">{t('shell.currentStatus')}</h2>
            <div className="mt-3 rounded-xl border-2 border-border bg-muted p-3 text-sm font-medium text-muted-foreground">{status}</div>
          </div>
          <div className="rounded-2xl border-2 border-border bg-card p-5 brutal-shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider">{t('shell.setupProgress')}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {steps.map((step) => {
                const done = step.id < currentStep;
                const active = step.id === currentStep;
                return (
                  <li key={step.id} className="flex items-center gap-2">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md border-2 text-[10px] font-bold ${
                      done
                        ? 'border-emerald-600 bg-emerald-200 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-800 dark:text-emerald-100'
                        : active
                          ? 'border-border bg-accent text-accent-foreground'
                          : 'border-border/40 bg-muted text-muted-foreground/40'
                    }`}>
                      {done ? '\u2713' : step.id}
                    </span>
                    <span className={`font-medium ${
                      done
                        ? 'text-muted-foreground line-through'
                        : active
                          ? 'text-foreground'
                          : 'text-muted-foreground/40'
                    }`}>
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
