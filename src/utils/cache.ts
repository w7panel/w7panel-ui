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

  invalidate(prefix: string): void {
    this.clear(prefix);
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

}

export const cacheManager = new CacheManager();

export const CachePresets = {
  NAMESPACE: 'namespace',
  PERMISSION: 'permission',
};
