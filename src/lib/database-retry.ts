import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  shouldRetry?: (error: PostgrestError) => boolean;
}

const defaultRetryOptions: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  shouldRetry: (error: PostgrestError) => {
    // Retry on authentication/session errors
    const retryableCodes = [
      'PGRST301', // JWT expired
      'PGRST300', // JWT invalid
      'PGRST302', // JWT malformed
      '401',      // Unauthorized
      '403',      // Forbidden
    ];
    
    const retryableMessages = [
      'JWT expired',
      'invalid claim',
      'session expired',
      'authentication required',
      'token expired',
    ];
    
    return (
      retryableCodes.includes(error.code) ||
      retryableMessages.some(msg => 
        error.message.toLowerCase().includes(msg.toLowerCase())
      )
    );
  }
};

/**
 * Validates current session before database operation
 */
export async function validateAndRefreshSession(): Promise<boolean> {
  try {
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('⚠️ Session validation error:', sessionError);
      return false;
    }
    
    if (!session) {
      console.warn('⚠️ No active session found');
      return false;
    }
    
    // Check if session is expired or will expire soon (within 5 minutes)
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (timeUntilExpiry <= fiveMinutes) {
        console.log('⏰ Session expiring soon, refreshing...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ Session refresh failed:', refreshError);
          return false;
        } else {
          console.log('✅ Session refreshed successfully');
          return true;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Session validation failed:', error);
    return false;
  }
}

/**
 * Wraps a database operation with automatic retry logic for authentication issues
 */
export async function withRetry<T>(
  operation: () => Promise<{ data: T; error: PostgrestError | null }>,
  options: RetryOptions = {}
): Promise<{ data: T; error: PostgrestError | null }> {
  const opts = { ...defaultRetryOptions, ...options };
  let lastError: PostgrestError | null = null;

  // Validate session before first attempt
  const sessionValid = await validateAndRefreshSession();
  if (!sessionValid) {
    console.error('❌ Session validation failed before operation');
    return { 
      data: null as T, 
      error: { 
        code: 'PGRST301', 
        message: 'Session expired. Please refresh the page and try again.',
        details: 'Session validation failed'
      } as PostgrestError 
    };
  }

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      console.log(`🔄 Database operation attempt ${attempt + 1}/${opts.maxRetries + 1}`);
      
      const result = await operation();
      
      if (!result.error) {
        if (attempt > 0) {
          console.log(`✅ Database operation succeeded after ${attempt + 1} attempts`);
        }
        return result;
      }
      
      lastError = result.error;
      
      // Check if we should retry this error
      if (!opts.shouldRetry(result.error)) {
        console.log(`❌ Database operation failed with non-retryable error: ${result.error.message}`);
        return result;
      }
      
      if (attempt < opts.maxRetries) {
        console.log(`⚠️ Database operation failed, retrying in ${opts.retryDelay}ms. Error: ${result.error.message}`);
        
        // Try to validate and refresh session before retry
        const sessionRecovered = await validateAndRefreshSession();
        if (!sessionRecovered) {
          console.error('❌ Session recovery failed - aborting retries');
          return {
            data: null as T,
            error: {
              code: 'PGRST301',
              message: 'Session expired. Please refresh the page and try again.',
              details: 'Session recovery failed'
            } as PostgrestError
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
      }
      
    } catch (err) {
      console.error(`❌ Database operation threw exception on attempt ${attempt + 1}:`, err);
      if (attempt === opts.maxRetries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
    }
  }
  
  console.error(`❌ Database operation failed after ${opts.maxRetries + 1} attempts`);
  return { data: null as T, error: lastError };
}

/**
 * Enhanced error handler for database operations
 */
export function handleDatabaseError(error: PostgrestError | Error, operation: string): string {
  console.error(`❌ Database error in ${operation}:`, error);
  
  if ('code' in error) {
    const pgError = error as PostgrestError;
    
    switch (pgError.code) {
      case 'PGRST301':
      case 'PGRST300':
      case 'PGRST302':
        return 'Your session has expired. Please refresh the page and try again.';
      
      case '23505':
        return 'This record already exists. Please check your data and try again.';
      
      case '23503':
        return 'Cannot perform this action due to related data constraints.';
      
      case '42501':
        return 'You do not have permission to perform this action.';
      
      case 'PGRST116':
        return 'No matching record found.';
      
      default:
        if (pgError.message.toLowerCase().includes('jwt')) {
          return 'Authentication error. Please refresh the page and try again.';
        }
        return pgError.message || `Database error in ${operation}`;
    }
  }
  
  return error.message || `Unexpected error in ${operation}`;
}

/**
 * Creates a wrapped version of a database operation that automatically handles retries
 */
export function createRetryableOperation<T extends any[], R>(
  operation: (...args: T) => Promise<{ data: R; error: PostgrestError | null }>,
  operationName: string,
  retryOptions?: RetryOptions
) {
  return async (...args: T): Promise<{ data: R; error: PostgrestError | null }> => {
    return withRetry(() => operation(...args), retryOptions);
  };
}

/**
 * Convenient wrapper for database operations that handles session validation and retry automatically
 * Use this for any direct Supabase operation to ensure proper error handling
 */
export async function executeWithRetry<T>(
  operation: () => Promise<{ data: T; error: PostgrestError | null }>,
  operationName: string = 'database operation',
  options?: RetryOptions
): Promise<{ data: T; error: PostgrestError | null }> {
  console.log(`🚀 Starting ${operationName}`);
  
  const result = await withRetry(operation, options);
  
  if (result.error) {
    console.error(`❌ ${operationName} failed:`, result.error.message);
  } else {
    console.log(`✅ ${operationName} completed successfully`);
  }
  
  return result;
}

// Global error handler for unhandled database errors
export function setupGlobalErrorHandler() {
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      
      if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error as PostgrestError;
        
        if (defaultRetryOptions.shouldRetry(pgError)) {
          console.warn('🔄 Detected retryable database error in unhandled rejection:', pgError.message);
          // You could trigger a global session refresh here
        }
      }
    });
  }
}