
import { syncMetricsService } from "./syncMetricsService";
import { getUserStorageKey } from "@/hooks/useUserStorage";

export class SyncMetadataManager {
  private static instance: SyncMetadataManager;
  
  static getInstance(): SyncMetadataManager {
    if (!SyncMetadataManager.instance) {
      SyncMetadataManager.instance = new SyncMetadataManager();
    }
    return SyncMetadataManager.instance;
  }

  updateSyncMetadata(errors: string[], duration: number, userId?: string): void {
    const lastSyncKey = getUserStorageKey('lastSync', userId);
    const durationKey = getUserStorageKey('lastSyncDuration', userId);
    const errorsKey = getUserStorageKey('syncErrors', userId);
    const metricsKey = getUserStorageKey('syncMetrics', userId);

    localStorage.setItem(lastSyncKey, new Date().toISOString());
    localStorage.setItem(durationKey, duration.toString());
    localStorage.setItem(errorsKey, JSON.stringify([...new Set(errors)]));
    
    const metrics = syncMetricsService.getMetrics();
    localStorage.setItem(metricsKey, JSON.stringify(metrics));
  }

  recordSyncOperation(operationName: string, duration: number, success: boolean, error?: string): void {
    syncMetricsService.recordOperation(operationName, duration, success, error);
  }

  storeSyncErrors(errors: string[], userId?: string): void {
    const errorsKey = getUserStorageKey('syncErrors', userId);
    localStorage.setItem(errorsKey, JSON.stringify([...new Set(errors)]));
  }
}

export const syncMetadataManager = SyncMetadataManager.getInstance();
