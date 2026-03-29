import { useEffect, useRef, useCallback, useState } from 'react';
import { syncService } from '@/services/syncService';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

/**
 * Seamless auto-sync hook. Syncs automatically:
 * - When local data changes (debounced 3s)
 * - When coming back online after being offline
 * - Periodically every 60s while online
 * - On app visibility change (tab focus)
 * 
 * The user should never need to manually trigger sync.
 */
export const useAutoSync = () => {
  const { user } = useAuth();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const periodicTimer = useRef<NodeJS.Timeout | null>(null);
  const isSyncing = useRef(false);
  const wasOffline = useRef(false);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'offline' | 'error'>('idle');

  const triggerSync = useCallback(async (reason?: string) => {
    if (!user || isSyncing.current) return;

    isSyncing.current = true;
    setSyncState('syncing');
    try {
      logger.debug(`useAutoSync: Auto-syncing (${reason || 'unknown'})...`);
      const result = await syncService.syncAll();
      setSyncState(result.success ? 'idle' : 'error');
      if (!result.success) {
        logger.warn('useAutoSync: Sync completed with errors');
      }
    } catch (error) {
      logger.error('useAutoSync: Auto-sync failed');
      setSyncState('error');
    } finally {
      isSyncing.current = false;
    }
  }, [user]);

  const debouncedSync = useCallback((reason?: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => triggerSync(reason), 3000);
  }, [triggerSync]);

  useEffect(() => {
    if (!user) return;

    // --- Data change listeners ---
    const handleDataChange = () => debouncedSync('data-change');
    window.addEventListener('storage', handleDataChange);
    window.addEventListener('localDataChanged', handleDataChange);

    // --- Online/offline listeners ---
    const handleOnline = () => {
      logger.debug('useAutoSync: Back online');
      setSyncState('idle');
      if (wasOffline.current) {
        wasOffline.current = false;
        // Immediate sync on reconnection
        triggerSync('reconnection');
      }
    };

    const handleOffline = () => {
      logger.debug('useAutoSync: Gone offline');
      wasOffline.current = true;
      setSyncState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial offline state
    if (!navigator.onLine) {
      wasOffline.current = true;
      setSyncState('offline');
    }

    // --- Visibility change (sync when tab regains focus) ---
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        debouncedSync('tab-focus');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // --- Periodic sync every 60s ---
    periodicTimer.current = setInterval(() => {
      if (navigator.onLine && !isSyncing.current) {
        triggerSync('periodic');
      }
    }, 60000);

    // --- Initial sync on mount ---
    if (navigator.onLine) {
      triggerSync('initial');
    }

    return () => {
      window.removeEventListener('storage', handleDataChange);
      window.removeEventListener('localDataChanged', handleDataChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (periodicTimer.current) clearInterval(periodicTimer.current);
    };
  }, [user, debouncedSync, triggerSync]);

  return { syncState };
};
