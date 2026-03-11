'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { useI18n, type Locale } from '@/i18n/context';
import { Sun, Moon, Monitor, Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const themeOptions = [
  { value: 'light', icon: Sun, labelEn: 'Light', labelZh: '浅色' },
  { value: 'dark', icon: Moon, labelEn: 'Dark', labelZh: '深色' },
  { value: 'system', icon: Monitor, labelEn: 'System', labelZh: '跟随系统' },
] as const;

const localeOptions: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
];

function subscribe() {
  return () => {};
}

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const { locale } = useI18n();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const current = mounted ? themeOptions.find((o) => o.value === theme) ?? themeOptions[2] : themeOptions[2];
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
        <Icon className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {themeOptions.map((opt) => (
          <DropdownMenuItem key={opt.value} onClick={() => setTheme(opt.value)}>
            <opt.icon className="mr-2 h-4 w-4" />
            {locale === 'zh' ? opt.labelZh : opt.labelEn}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
        <Languages className="h-4 w-4" />
        <span className="sr-only">Switch language</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {localeOptions.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setLocale(opt.value)}
            className={locale === opt.value ? 'font-semibold' : ''}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
