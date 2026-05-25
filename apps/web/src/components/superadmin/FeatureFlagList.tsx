'use client';

import { useOptimistic, useTransition } from 'react';
import { updateFeatureFlagAction } from '@/lib/actions/superadmin';
import { useConfirm } from '@/components/ui/ConfirmProvider';

interface Flag {
  id: string;
  feature_module: string;
  is_enabled: boolean;
  updated_at: string;
}

interface Props {
  flags: Flag[];
  descriptions: Record<string, string>;
}

function toLabel(module: string) {
  return module.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function FeatureFlagList({ flags, descriptions }: Props) {
  const [optimisticFlags, updateOptimistic] = useOptimistic(
    flags,
    (state, { id, isEnabled }: { id: string; isEnabled: boolean }) =>
      state.map((f) => f.id === id ? { ...f, is_enabled: isEnabled } : f),
  );
  const [isPending, startTransition] = useTransition();
  const { confirm } = useConfirm();

  async function handleToggle(flag: Flag) {
    const enabling = !flag.is_enabled;
    const ok = await confirm({
      title: `${enabling ? 'Enable' : 'Disable'} ${toLabel(flag.feature_module)}`,
      message: enabling
        ? `"${toLabel(flag.feature_module)}" will be turned on for all users platform-wide.`
        : `"${toLabel(flag.feature_module)}" will be disabled for all users platform-wide. Any dependent UI will be hidden immediately.`,
      confirmLabel: enabling ? 'Enable' : 'Disable',
      variant: enabling ? 'default' : 'danger',
    });
    if (!ok) return;

    startTransition(async () => {
      updateOptimistic({ id: flag.id, isEnabled: enabling });
      await updateFeatureFlagAction(flag.id, enabling);
    });
  }

  return (
    <div className="space-y-2">
      {optimisticFlags.map((flag) => (
        <div
          key={flag.id}
          className="flex items-center justify-between rounded-xl bg-surface-card px-5 py-4 ring-1 ring-surface-border"
        >
          <div className="min-w-0 pr-6">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">{toLabel(flag.feature_module)}</p>
              {!flag.is_enabled && (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400 uppercase tracking-wide">
                  Disabled
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {descriptions[flag.feature_module] ?? flag.feature_module}
            </p>
          </div>

          {/* Toggle switch */}
          <button
            onClick={() => handleToggle(flag)}
            disabled={isPending}
            aria-checked={flag.is_enabled}
            role="switch"
            className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 ${
              flag.is_enabled ? 'bg-accent-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                flag.is_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
