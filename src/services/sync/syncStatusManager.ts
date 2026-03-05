
import { supabase } from "@/integrations/supabase/client";
import { SyncStatus } from "./types";
import { connectivityService } from "./connectivityService";
import { syncMetricsService } from "./syncMetricsService";
import { networkRetryService } from "./networkRetryService";
import { getUserStorageKey } from "@/hooks/useUserStorage";

export class SyncStatusManager {
  private subscribers: Array<(status: SyncStatus) => void> = [];
  private statusCheckInterval: number | null = null;
  private readonly STATUS_CHECK_INTERVAL = 30000;

  constructor() {
    this.startStatusMonitoring();
  }

  onSyncStatusChange(callback: (status: SyncStatus) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  notifySyncStatusChange(status: SyncStatus) {
    this.subscribers.forEach(callback => {
      try { callback(status); } catch (error) {
        console.error('SyncStatusManager: Error notifying subscriber:', error);
      }
    });
  }

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const connectivityResult = await networkRetryService.testConnectivity();
      const isOnline = connectivityResult.online;

      const userId = await this.getCurrentUserId();
      const lastSyncKey = getUserStorageKey('lastSync', userId);
      const lastSyncStr = localStorage.getItem(lastSyncKey);
      const lastSync = lastSyncStr ? new Date(lastSyncStr) : null;

      const pendingSyncs = this.countPendingSyncs(userId);
      const syncErrors = this.getSyncErrors(userId);
      const metrics = syncMetricsService.getMetrics();

      const status: SyncStatus = {
        isOnline,
        lastSync,
        pendingSyncs,
        errors: syncErrors,
        connectivity: {
          online: isOnline,
          latency: connectivityResult.latency,
          error: connectivityResult.error
        },
        metrics: {
          successRate: metrics.totalOperations > 0 ? (metrics.successfulOperations / metrics.totalOperations) * 100 : 100,
          averageLatency: metrics.averageLatency,
          totalRetries: metrics.retryCount,
          lastSyncDuration: metrics.lastSyncDuration
        }
      };

      return status;
    } catch (error) {
      console.error('SyncStatusManager: Error getting sync status:', error);
      return {
        isOnline: false, lastSync: null, pendingSyncs: 0,
        errors: ['Failed to get sync status'],
        connectivity: { online: false, error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async getCurrentUserId(): Promise<string | undefined> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    } catch { return undefined; }
  }

  private countPendingSyncs(userId?: string): number {
    try {
      let pending = 0;
      const keys = ['sales', 'products', 'customers', 'creditTransactions', 'inventoryAdjustments'];
      for (const key of keys) {
        const storageKey = getUserStorageKey(key, userId);
        const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
        pending += data.filter((item: any) => !item.synced).length;
      }
      return pending;
    } catch (error) {
      console.error('SyncStatusManager: Error counting pending syncs:', error);
      return 0;
    }
  }

  private getSyncErrors(userId?: string): string[] {
    try {
      const errorsKey = getUserStorageKey('syncErrors', userId);
      const storedErrors = localStorage.getItem(errorsKey);
      const basicErrors = storedErrors ? JSON.parse(storedErrors) : [];
      const recentErrors = syncMetricsService.getRecentErrors(5);
      const metricsErrors = recentErrors.map(err => `${err.operation}: ${err.error}`);
      const allErrors = [...basicErrors, ...metricsErrors];
      return [...new Set(allErrors)].slice(-10);
    } catch (error) {
      return ['Error retrieving sync status'];
    }
  }

  private startStatusMonitoring() {
    if (this.statusCheckInterval) clearInterval(this.statusCheckInterval);
    this.statusCheckInterval = window.setInterval(async () => {
      try {
        const status = await this.getSyncStatus();
        this.notifySyncStatusChange(status);
      } catch (error) {
        console.error('SyncStatusManager: Periodic status check failed:', error);
      }
    }, this.STATUS_CHECK_INTERVAL);
  }

  stopStatusMonitoring() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  async refreshStatus() {
    const status = await this.getSyncStatus();
    this.notifySyncStatusChange(status);
    return status;
  }

  async clearOldErrors() {
    try {
      const userId = await this.getCurrentUserId();
      const errorsKey = getUserStorageKey('syncErrors', userId);
      localStorage.removeItem(errorsKey);
      syncMetricsService.clearMetrics();
    } catch (error) {
      console.error('SyncStatusManager: Error clearing old errors:', error);
    }
  }
}
