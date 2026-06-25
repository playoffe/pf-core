import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-white">
            PLAY<span className="text-brand-600">OFFE</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">Reset your password</p>
        </div>
        <div className="rounded-xl bg-surface-card px-8 py-10 ring-1 ring-surface-border">
          <ForgotPasswordForm />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          Remembered your password?{' '}
          <Link href="/login" className="font-semibold text-brand-400 hover:text-brand-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
