
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { syncService } from "@/services/syncService";
import { logger } from "@/utils/logger";

export const useSyncOperations = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      logger.debug('SyncOperations: Starting sync');
      const result = await syncService.syncAll();
      logger.debug('SyncOperations: Sync completed, synced:', result.synced);
      
      if (result.success) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${result.synced} items.`,
        });
      } else {
        toast({
          title: "Sync Completed with Errors",
          description: `Synced ${result.synced} items. ${result.errors.length} errors occurred.`,
          variant: "destructive",
        });
        
        logger.error('SyncOperations: Sync had errors');
      }
    } catch (error) {
      logger.error('SyncOperations: Sync failed');
      toast({
        title: "Sync Failed",
        description: "Failed to sync data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSupabase = async () => {
    setIsSyncing(true);
    try {
      logger.debug('SyncOperations: Starting pull from server');
      const result = await syncService.pullFromSupabase();
      logger.debug('SyncOperations: Pull completed, synced:', result.synced);
      
      if (result.success) {
        toast({
          title: "Data Pulled Successfully",
          description: `Retrieved ${result.synced} items from server.`,
        });
      } else {
        toast({
          title: "Pull Completed with Errors",
          description: `Retrieved ${result.synced} items. ${result.errors.length} errors occurred.`,
          variant: "destructive",
        });
        
        logger.error('SyncOperations: Pull had errors');
      }
    } catch (error) {
      logger.error('SyncOperations: Pull failed');
      toast({
        title: "Pull Failed",
        description: "Failed to pull data from server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    handleSync,
    handlePullFromSupabase,
  };
};
