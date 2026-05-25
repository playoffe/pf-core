import Image from 'next/image';
import Link from 'next/link';

interface Props {
  /** Height of the shield icon in px. Width scales proportionally (logo is square). */
  iconSize?: number;
  /** Show the "PLAYOFFE" wordmark next to the icon. Default true. */
  showWordmark?: boolean;
  /** Extra classes applied to the wordmark span (e.g. 'hidden sm:inline' for responsive). */
  wordmarkClassName?: string;
  /** Wrap the logo in a <Link>. Pass null to render without a link. */
  href?: string | null;
  className?: string;
}

/**
 * Shared brand mark used across AppNav, auth pages, and display screen.
 * Drop `apps/web/public/logo.png` and it renders everywhere automatically.
 */
export function AppLogo({
  iconSize = 32,
  showWordmark = true,
  wordmarkClassName = '',
  href = '/',
  className = '',
}: Props) {
  const inner = (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/logo.png"
        alt="PLAYOFFE logo"
        width={iconSize}
        height={iconSize}
        className="shrink-0 drop-shadow-sm"
        priority
      />
      {showWordmark && (
        <span className={`text-lg font-black tracking-tight text-white leading-none ${wordmarkClassName}`}>
          PLAY<span className="text-brand-500">OFFE</span>
        </span>
      )}
    </span>
  );

  if (href === null) return inner;

  return (
    <Link href={href} className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md">
      {inner}
    </Link>
  );
}
