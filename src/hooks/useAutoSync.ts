import { useEffect, useRef, useCallback } from 'react';
import { syncService } from '@/services/syncService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Auto-syncs data to the server when localStorage changes.
 * Debounces sync calls to avoid overwhelming the server.
 */
export const useAutoSync = () => {
  const { user } = useAuth();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isSyncing = useRef(false);

  const triggerSync = useCallback(async () => {
    if (!user || isSyncing.current) return;

    isSyncing.current = true;
    try {
      console.log('useAutoSync: Auto-syncing data to server...');
      await syncService.syncAll();
      console.log('useAutoSync: Auto-sync completed');
    } catch (error) {
      console.error('useAutoSync: Auto-sync failed:', error);
    } finally {
      isSyncing.current = false;
    }
  }, [user]);

  const debouncedSync = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(triggerSync, 3000);
  }, [triggerSync]);

  useEffect(() => {
    if (!user) return;

    const handleStorageChange = () => {
      debouncedSync();
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events dispatched within the same tab
    window.addEventListener('localDataChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localDataChanged', handleStorageChange);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [user, debouncedSync]);
};
