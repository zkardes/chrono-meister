/**
 * Safari-Compatible Storage Adapter
 * 
 * Handles Safari's strict security policies and localStorage limitations:
 * - Intelligent Tracking Prevention (ITP)
 * - Private browsing mode restrictions
 * - localStorage quota limitations
 * - Cross-origin restrictions
 */

interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StorageInfo {
  isSafari: boolean;
  isLocalStorageAvailable: boolean;
  isPrivateMode: boolean;
  memoryStorageSize: number;
  localStorageKeys: number;
}

class SafariStorageAdapter implements StorageAdapter {
  private memoryStorage: Map<string, string> = new Map();
  private isLocalStorageAvailable = false;
  private isSafari = false;

  constructor() {
    this.detectBrowser();
    this.testLocalStorage();
    this.setupStorageEventListeners();
  }

  private detectBrowser(): void {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent;
      this.isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      
      if (this.isSafari) {
        console.log('🦁 Safari detected - using enhanced storage adapter');
      }
    }
  }

  private testLocalStorage(): void {
    try {
      if (typeof window === 'undefined') {
        this.isLocalStorageAvailable = false;
        return;
      }

      const testKey = '__safari_storage_test__';
      const testValue = 'test';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      this.isLocalStorageAvailable = retrieved === testValue;
      
      if (this.isSafari && this.isLocalStorageAvailable) {
        console.log('✅ localStorage available in Safari');
      } else if (this.isSafari && !this.isLocalStorageAvailable) {
        console.warn('⚠️ localStorage restricted in Safari - using memory fallback');
      }
    } catch (error) {
      console.warn('⚠️ localStorage test failed - using memory fallback:', error);
      this.isLocalStorageAvailable = false;
    }
  }

  private setupStorageEventListeners(): void {
    if (typeof window !== 'undefined') {
      // Listen for storage events to sync across tabs
      window.addEventListener('storage', (event) => {
        if (event.key && event.newValue) {
          this.memoryStorage.set(event.key, event.newValue);
        } else if (event.key && event.newValue === null) {
          this.memoryStorage.delete(event.key);
        }
      });

      // Safari-specific: Handle page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isSafari) {
          this.syncFromLocalStorage();
        }
      });

      // Handle beforeunload to save critical data
      window.addEventListener('beforeunload', () => {
        this.persistCriticalData();
      });
    }
  }

  private syncFromLocalStorage(): void {
    if (!this.isLocalStorageAvailable) return;

    try {
      // Sync Supabase auth data from localStorage to memory
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('sb-') || key.includes('supabase')
      );

      authKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          this.memoryStorage.set(key, value);
        }
      });
    } catch (error) {
      console.warn('⚠️ Failed to sync from localStorage:', error);
    }
  }

  private persistCriticalData(): void {
    if (!this.isLocalStorageAvailable) return;

    try {
      // Save memory storage to localStorage before page unload
      this.memoryStorage.forEach((value, key) => {
        if (key.includes('sb-') || key.includes('supabase')) {
          localStorage.setItem(key, value);
        }
      });
    } catch (error) {
      console.warn('⚠️ Failed to persist critical data:', error);
    }
  }

  getItem(key: string): string | null {
    // Try memory storage first (fastest)
    if (this.memoryStorage.has(key)) {
      return this.memoryStorage.get(key) || null;
    }

    // Try localStorage as fallback
    if (this.isLocalStorageAvailable) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          // Cache in memory for future access
          this.memoryStorage.set(key, value);
        }
        return value;
      } catch (error) {
        console.warn(`⚠️ Failed to get item ${key} from localStorage:`, error);
      }
    }

    return null;
  }

  setItem(key: string, value: string): void {
    // Always store in memory first
    this.memoryStorage.set(key, value);

    // Try to store in localStorage if available
    if (this.isLocalStorageAvailable) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn(`⚠️ Failed to set item ${key} in localStorage:`, error);
        
        // Safari might have exceeded quota or be in private mode
        if (this.isSafari) {
          this.handleSafariStorageError(error);
        }
      }
    }
  }

  removeItem(key: string): void {
    // Remove from memory
    this.memoryStorage.delete(key);

    // Remove from localStorage if available
    if (this.isLocalStorageAvailable) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`⚠️ Failed to remove item ${key} from localStorage:`, error);
      }
    }
  }

  private handleSafariStorageError(error: any): void {
    const errorMessage = error?.message || error;
    
    if (errorMessage.includes('QuotaExceededError') || errorMessage.includes('quota')) {
      console.warn('🚨 Safari storage quota exceeded - clearing old data');
      this.clearOldSessionData();
    } else if (errorMessage.includes('SecurityError')) {
      console.warn('🔒 Safari security restrictions - falling back to memory storage only');
      this.isLocalStorageAvailable = false;
    }
  }

  private clearOldSessionData(): void {
    if (!this.isLocalStorageAvailable) return;

    try {
      const keys = Object.keys(localStorage);
      const authKeys = keys.filter(key => key.includes('sb-') || key.includes('supabase'));
      
      // Keep only the most recent session data
      authKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            // Remove if expires_at is in the past
            if (parsed.expires_at && new Date(parsed.expires_at * 1000) < new Date()) {
              localStorage.removeItem(key);
              this.memoryStorage.delete(key);
            }
          }
        } catch {
          // If parsing fails, remove the corrupted data
          localStorage.removeItem(key);
          this.memoryStorage.delete(key);
        }
      });
    } catch (error) {
      console.warn('⚠️ Failed to clear old session data:', error);
    }
  }

  // Method to check if we're in Safari private mode
  isPrivateMode(): boolean {
    if (!this.isSafari) return false;
    
    try {
      localStorage.setItem('__private_test__', 'test');
      localStorage.removeItem('__private_test__');
      return false;
    } catch {
      return true;
    }
  }

  // Method to get storage info for debugging
  getStorageInfo(): StorageInfo {
    return {
      isSafari: this.isSafari,
      isLocalStorageAvailable: this.isLocalStorageAvailable,
      isPrivateMode: this.isPrivateMode(),
      memoryStorageSize: this.memoryStorage.size,
      localStorageKeys: this.isLocalStorageAvailable ? Object.keys(localStorage).length : 0
    };
  }
}

// Create a singleton instance
export const safariStorageAdapter = new SafariStorageAdapter();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).safariStorageAdapter = safariStorageAdapter;
}