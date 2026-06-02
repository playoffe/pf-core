'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Tab {
  label: string;
  href: string;
  /** If true, only shown when showSocialTab is enabled */
  socialOnly?: boolean;
}

const TABS: Tab[] = [
  { label: 'Profile',       href: '/settings/profile' },
  { label: 'Notifications', href: '/settings/notifications' },
  { label: 'Social media',  href: '/settings/social', socialOnly: true },
  { label: 'Account',       href: '/settings/account' },
];

interface Props {
  /** Controlled by the social_media feature flag — false hides the Social media tab */
  showSocialTab?: boolean;
}

export function SettingsTabNav({ showSocialTab = true }: Props) {
  const pathname = usePathname();
  const visibleTabs = TABS.filter((t) => !t.socialOnly || showSocialTab);

  return (
    <div className="mb-8 flex flex-wrap gap-2 text-sm">
      {visibleTabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
            pathname === tab.href
              ? 'bg-brand-600 text-white'
              : 'text-slate-400 hover:text-white border border-surface-border hover:border-slate-500'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
