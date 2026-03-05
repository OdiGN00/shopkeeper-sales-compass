
import { transactionWrapper } from "./transactionWrapper";
import { dataConsistencyService } from "./dataConsistencyService";
import { duplicatePreventionService } from "./duplicatePreventionService";

export class SyncValidationService {
  private static instance: SyncValidationService;
  
  static getInstance(): SyncValidationService {
    if (!SyncValidationService.instance) {
      SyncValidationService.instance = new SyncValidationService();
    }
    return SyncValidationService.instance;
  }

  async validateDatabaseStateBeforeSync(errors: string[]): Promise<void> {
    console.log('SyncValidationService: Validating database state...');
    const dbValidation = await transactionWrapper.validateDatabaseState();
    if (!dbValidation.valid) {
      console.warn('SyncValidationService: Database issues detected:', dbValidation.issues);
      errors.push(...dbValidation.issues.map(issue => `DB validation: ${issue}`));
    }
  }

  async performLocalDataCleanup(errors: string[], userId?: string): Promise<number> {
    console.log('SyncValidationService: Cleaning up local duplicates...');
    const dedupeResult = await duplicatePreventionService.deduplicateLocalStorage(userId);
    if (dedupeResult.fixed > 0) {
      console.log(`SyncValidationService: Fixed ${dedupeResult.fixed} duplicate entries`);
    }
    if (dedupeResult.errors.length > 0) {
      errors.push(...dedupeResult.errors);
    }
    return dedupeResult.fixed;
  }

  async validateLocalDataConsistency(errors: string[], userId?: string): Promise<void> {
    console.log('SyncValidationService: Validating local data consistency...');
    const localValidation = await dataConsistencyService.validateLocalStorageData(userId);
    if (localValidation.errors.length > 0) {
      console.warn('SyncValidationService: Local data issues found:', localValidation.errors);
      errors.push(...localValidation.errors.map(err => `Local data: ${err}`));
    }
    if (localValidation.fixes.length > 0) {
      console.log('SyncValidationService: Applied local data fixes:', localValidation.fixes);
    }
  }

  async performPostSyncValidation(errors: string[]): Promise<void> {
    console.log('SyncValidationService: Running post-sync validation...');
    try {
      const postSyncValidation = await transactionWrapper.validateDatabaseState();
      if (!postSyncValidation.valid) {
        console.warn('SyncValidationService: Post-sync database issues:', postSyncValidation.issues);
        errors.push(...postSyncValidation.issues.map(issue => `Post-sync: ${issue}`));
      }

      const consistencyResult = await dataConsistencyService.checkAndFixConsistency();
      if (consistencyResult.issues.length > 0) {
        console.warn('SyncValidationService: Database consistency issues found:', consistencyResult.issues);
        errors.push(...consistencyResult.issues.map(issue => `DB consistency: ${issue}`));
      }
      if (consistencyResult.fixes.length > 0) {
        console.log('SyncValidationService: Applied database consistency fixes:', consistencyResult.fixes);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Post-sync validation failed: ${errorMsg}`);
      console.error('SyncValidationService: Post-sync validation error:', error);
    }
  }
}

export const syncValidationService = SyncValidationService.getInstance();
