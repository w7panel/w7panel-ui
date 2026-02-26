interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface CacheOptions {
  duration?: number;
  prefix?: string;
}

class CacheManager {
  private memoryCache: Map<string, CacheItem<any>> = new Map();
  private listeners: Map<string, Set<() => void>> = new Map();

  get<T>(key: string, defaultValue?: T): T | undefined {
    const item = this.memoryCache.get(key);
    if (!item) {
      return defaultValue;
    }
    return item.data as T;
  }

  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const { duration = 5 * 60 * 1000, prefix = '' } = options;
    const fullKey = prefix ? `${prefix}:${key}` : key;
    
    this.memoryCache.set(fullKey, {
      data: value,
      timestamp: Date.now(),
    });
    
    this.notifyListeners(fullKey);
  }

  delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key);
    if (deleted) {
      this.notifyListeners(key);
    }
    return deleted;
  }

  clear(pattern?: string | RegExp): void {
    if (!pattern) {
      this.memoryCache.clear();
      this.listeners.clear();
      return;
    }

    if (typeof pattern === 'string') {
      this.memoryCache.forEach((_, key) => {
        if (key.includes(pattern) || key.startsWith(`${pattern}:`)) {
          this.memoryCache.delete(key);
        }
      });
    } else {
      this.memoryCache.forEach((_, key) => {
        if (pattern.test(key)) {
          this.memoryCache.delete(key);
        }
      });
    }
    
    this.notifyListeners(pattern.toString());
  }

  has(key: string): boolean {
    return this.memoryCache.has(key);
  }

  keys(prefix?: string): string[] {
    const allKeys = Array.from(this.memoryCache.keys());
    if (!prefix) {
      return allKeys;
    }
    return allKeys.filter(key => key.startsWith(`${prefix}:`) || key === prefix);
  }

  invalidate(prefix: string): void {
    this.clear(prefix);
  }

  subscribe(key: string, listener: () => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    return () => {
      this.listeners.get(key)?.delete(listener);
    };
  }

  private notifyListeners(key: string): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(listener => listener());
    }
    
    const prefix = key.split(':')[0];
    const prefixListeners = this.listeners.get(`${prefix}:*`);
    if (prefixListeners) {
      prefixListeners.forEach(listener => listener());
    }
  }

  getSize(): number {
    return this.memoryCache.size;
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys()),
    };
  }
}

export const cacheManager = new CacheManager();

export const CachePresets = {
  NAMESPACE: 'namespace',
  PERMISSION: 'permission',
  USER_INFO: 'userinfo',
  APP_LIST: 'applist',
  POD_LIST: 'podlist',
  NODE_LIST: 'nodelist',
  STORAGE_LIST: 'storagelist',
};

export function createCachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): () => Promise<T> {
  return async () => {
    const cached = cacheManager.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const data = await fetcher();
    cacheManager.set(key, data, options);
    return data;
  };
}

export function invalidateCache(prefix: string): void {
  cacheManager.invalidate(prefix);
}

export function subscribeToCache(key: string, listener: () => void): () => void {
  return cacheManager.subscribe(key, listener);
}
