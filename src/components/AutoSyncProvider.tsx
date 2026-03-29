import { useAutoSync } from '@/hooks/useAutoSync';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';

/**
 * Component that activates seamless auto-sync and shows a minimal status indicator.
 * Renders a small floating badge in the corner — no user action needed.
 */
export const AutoSyncProvider = () => {
  const { syncState } = useAutoSync();

  // Only show indicator when something noteworthy is happening
  if (syncState === 'idle') return null;

  const config = {
    syncing: { icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Syncing...', bg: 'bg-primary/10 text-primary' },
    offline: { icon: <CloudOff className="h-3 w-3" />, label: 'Offline', bg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    error: { icon: <Cloud className="h-3 w-3" />, label: 'Sync issue', bg: 'bg-destructive/10 text-destructive' },
  }[syncState];

  if (!config) return null;

  return (
    <div className={`fixed top-2 right-2 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} shadow-sm transition-all animate-in fade-in slide-in-from-top-2 duration-300`}>
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
};
