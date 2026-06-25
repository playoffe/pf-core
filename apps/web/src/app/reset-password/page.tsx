import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = { title: 'Set a new password' };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-white">
            PLAY<span className="text-brand-600">OFFE</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">Set a new password</p>
        </div>
        <div className="rounded-xl bg-surface-card px-8 py-10 ring-1 ring-surface-border">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
