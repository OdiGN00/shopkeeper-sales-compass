
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  timeoutMs?: number;
}

export class NetworkRetryService {
  private static instance: NetworkRetryService;
  
  static getInstance(): NetworkRetryService {
    if (!NetworkRetryService.instance) {
      NetworkRetryService.instance = new NetworkRetryService();
    }
    return NetworkRetryService.instance;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      timeoutMs = 30000
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`NetworkRetryService: Attempt ${attempt + 1}/${maxRetries + 1}`);

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
        });

        // Execute operation with timeout
        const result = await Promise.race([
          operation(),
          timeoutPromise
        ]);

        console.log(`NetworkRetryService: Operation succeeded on attempt ${attempt + 1}`);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`NetworkRetryService: Attempt ${attempt + 1} failed:`, lastError.message);

        // Don't retry on certain types of errors
        if (this.isNonRetryableError(lastError)) {
          console.log('NetworkRetryService: Non-retryable error, aborting');
          throw lastError;
        }

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          console.error('NetworkRetryService: All retry attempts exhausted');
          throw lastError;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt),
          maxDelay
        );
        const jitteredDelay = delay + Math.random() * 1000; // Add up to 1s jitter

        console.log(`NetworkRetryService: Waiting ${Math.round(jitteredDelay)}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, jitteredDelay));
      }
    }

    throw lastError || new Error('Operation failed after all retries');
  }

  private isNonRetryableError(error: Error): boolean {
    const nonRetryableMessages = [
      'invalid input syntax',
      'duplicate key value',
      'foreign key constraint',
      'check constraint',
      'not null constraint',
      'permission denied',
      'unauthorized',
      'forbidden'
    ];

    const errorMessage = error.message.toLowerCase();
    return nonRetryableMessages.some(msg => errorMessage.includes(msg));
  }

  async testConnectivity(): Promise<{ online: boolean; latency?: number; error?: string }> {
    try {
      const startTime = Date.now();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabasePublishableKey) {
        throw new Error('Missing Supabase environment configuration');
      }
      
      // Simple connectivity test using Supabase
      const response = await this.executeWithRetry(
        async () => {
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'HEAD',
            headers: {
              'apikey': supabasePublishableKey
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          return response;
        },
        { maxRetries: 1, timeoutMs: 5000 }
      );

      const latency = Date.now() - startTime;
      return { online: true, latency };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown connectivity error';
      return { online: false, error: errorMsg };
    }
  }
}

export const networkRetryService = NetworkRetryService.getInstance();
