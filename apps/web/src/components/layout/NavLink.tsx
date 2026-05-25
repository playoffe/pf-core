'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  href: string;
  children: React.ReactNode;
  /** Match exactly this href, or any path that starts with it (default: startsWith) */
  exact?: boolean;
}

export function NavLink({ href, children, exact = false }: Props) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`text-sm transition-colors ${
        isActive
          ? 'text-white font-medium'
          : 'text-slate-400 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
}
