
import { SyncResult } from "./types";
import { connectivityService } from "./connectivityService";
import { networkRetryService } from "./networkRetryService";
import { syncValidationService } from "./syncValidationService";
import { syncStepExecutor } from "./syncStepExecutor";
import { syncMetadataManager } from "./syncMetadataManager";
import { supabase } from "@/integrations/supabase/client";

export class SyncOrchestrator {
  async syncAll(): Promise<SyncResult> {
    const syncStartTime = Date.now();
    const errors: string[] = [];
    let totalSynced = 0;

    try {
      console.log('SyncOrchestrator: Starting enhanced full sync...');
      
      // Get current user for user-specific operations
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const connectivityResult = await networkRetryService.executeWithRetry(
        () => connectivityService.checkConnectivity(),
        { maxRetries: 2, timeoutMs: 10000 }
      );

      if (!connectivityResult) {
        return { success: false, errors: ['No internet connection'], synced: 0 };
      }

      await syncValidationService.validateDatabaseStateBeforeSync(errors);
      await syncValidationService.performLocalDataCleanup(errors, userId);
      await syncValidationService.validateLocalDataConsistency(errors, userId);

      totalSynced += await syncStepExecutor.syncWithTransactionWrapper('products', () => syncStepExecutor.syncProducts(errors));
      totalSynced += await syncStepExecutor.syncWithTransactionWrapper('customers', () => syncStepExecutor.syncCustomers(errors));
      totalSynced += await syncStepExecutor.syncWithTransactionWrapper('sales', () => syncStepExecutor.syncSales(errors));
      totalSynced += await syncStepExecutor.syncWithTransactionWrapper('credit-transactions', () => syncStepExecutor.syncCreditTransactions(errors));

      await syncValidationService.performPostSyncValidation(errors);

      const syncDuration = Date.now() - syncStartTime;
      syncMetadataManager.updateSyncMetadata(errors, syncDuration, userId);

      const uniqueErrors = [...new Set(errors)];
      syncMetadataManager.recordSyncOperation('full-sync', syncDuration, uniqueErrors.length === 0, uniqueErrors.join('; '));

      console.log(`SyncOrchestrator: Sync completed in ${syncDuration}ms. Synced: ${totalSynced}, Errors: ${uniqueErrors.length}`);
      return { success: uniqueErrors.length === 0, errors: uniqueErrors, synced: totalSynced };

    } catch (error) {
      const syncDuration = Date.now() - syncStartTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown sync error';
      console.error('SyncOrchestrator: Sync failed:', errorMsg);
      errors.push(errorMsg);
      
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      syncMetadataManager.storeSyncErrors([...new Set(errors)], user?.id);
      syncMetadataManager.recordSyncOperation('full-sync', syncDuration, false, errorMsg);
      
      return { success: false, errors: [...new Set(errors)], synced: totalSynced };
    }
  }
}
