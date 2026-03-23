import { useAutoSync } from '@/hooks/useAutoSync';

/**
 * Component that activates auto-sync. Renders nothing.
 */
export const AutoSyncProvider = () => {
  useAutoSync();
  return null;
};
