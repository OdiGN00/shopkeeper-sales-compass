
import { SyncStatus, SyncResult } from "./sync/types";
import { connectivityService } from "./sync/connectivityService";
import { SyncStatusManager } from "./sync/syncStatusManager";
import { SyncOrchestrator } from "./sync/syncOrchestrator";
import { DataPullManager } from "./sync/dataPullManager";
import { logger } from "@/utils/logger";

class SyncService {
  private syncInProgress = false;
  private statusManager = new SyncStatusManager();
  private syncOrchestrator = new SyncOrchestrator();
  private dataPullManager = new DataPullManager();

  // Subscribe to sync status changes
  onSyncStatusChange(callback: (status: SyncStatus) => void) {
    return this.statusManager.onSyncStatusChange(callback);
  }

  // Check if we're online and can sync
  async checkConnectivity(): Promise<boolean> {
    try {
      return await connectivityService.checkConnectivity();
    } catch (error) {
      logger.error('Connectivity check failed');
      return false;
    }
  }

  // Get current sync status
  async getSyncStatus(): Promise<SyncStatus> {
    return this.statusManager.getSyncStatus();
  }

  // Enhanced sync with data consistency checks
  async syncAll(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { success: false, errors: ['Sync already in progress'], synced: 0 };
    }

    this.syncInProgress = true;

    try {
      const result = await this.syncOrchestrator.syncAll();
      
      // Notify status change
      const status = await this.getSyncStatus();
      this.statusManager.notifySyncStatusChange(status);

      logger.debug('SyncService: Full sync completed', result.synced);
      return result;

    } finally {
      this.syncInProgress = false;
    }
  }

  // Force sync from Supabase to localStorage (for data recovery)
  async pullFromSupabase(): Promise<SyncResult> {
    const result = await this.dataPullManager.pullFromSupabase();

    // Notify status change
    const status = await this.getSyncStatus();
    this.statusManager.notifySyncStatusChange(status);

    return result;
  }
}

export const syncService = new SyncService();
export type { SyncStatus, SyncResult };
