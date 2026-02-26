import { ref, UnwrapRef, onUnmounted } from 'vue';
import { AxiosResponse } from 'axios';
import { HttpResponse } from '@/api/interceptor';
import useLoading from './loading';

interface UseRequestOptions<T> {
  defaultValue?: T;
  isLoading?: boolean;
  cache?: boolean;
  cacheKey?: string;
  cacheTime?: number;
  retry?: number;
  retryDelay?: number;
  timeout?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const requestCache = new Map<string, CacheItem<any>>();

export function clearRequestCache(pattern?: string | RegExp): void {
  if (!pattern) {
    requestCache.clear();
    return;
  }
  
  if (typeof pattern === 'string') {
    requestCache.forEach((_, key) => {
      if (key.includes(pattern)) {
        requestCache.delete(key);
      }
    });
  } else {
    requestCache.forEach((_, key) => {
      if (pattern.test(key)) {
        requestCache.delete(key);
      }
    });
  }
}

export function getAllCacheKeys(): string[] {
  return Array.from(requestCache.keys());
}

export default function useRequest<T>(
  api: () => Promise<AxiosResponse<HttpResponse>>,
  options: UseRequestOptions<T> = {}
) {
  const {
    defaultValue = undefined as unknown as T,
    isLoading = true,
    cache = false,
    cacheKey: customCacheKey,
    cacheTime = 5 * 60 * 1000,
    retry = 0,
    retryDelay = 1000,
    timeout = 30000,
    onSuccess,
    onError,
  } = options;

  const { loading, setLoading } = useLoading(isLoading);
  const response = ref<T>(defaultValue);
  const error = ref<Error | null>(null);
  
  let abortController: AbortController | null = null;
  let retryCount = 0;
  let cacheKey: string | null = null;

  const getCacheKey = () => {
    return cacheKey;
  };

  const clearCache = () => {
    if (cacheKey) {
      requestCache.delete(cacheKey);
    }
  };

  const executeRequest = async () => {
    abortController = new AbortController();
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);
    });

    try {
      let res: AxiosResponse<HttpResponse>;
      
      if (timeout < 60000) {
        res = await Promise.race([
          api(),
          timeoutPromise
        ]) as AxiosResponse<HttpResponse>;
      } else {
        res = await api();
      }

      const data = res.data as unknown as T;
      response.value = data as any;
      error.value = null;
      
      if (cache && cacheKey) {
        requestCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      return data;
    } catch (err: any) {
      error.value = err;
      
      if (retryCount < retry) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return executeRequest();
      }
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      setLoading(false);
      abortController = null;
    }
  };

  const run = (customApi?: () => Promise<AxiosResponse<HttpResponse>>, customKey?: string) => {
    setLoading(true);
    retryCount = 0;
    
    const targetApi = customApi || api;
    const targetCacheKey = customKey || cacheKey;
    
    if (cache && targetCacheKey) {
      const cached = requestCache.get(targetCacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        response.value = cached.data;
        setLoading(false);
        return Promise.resolve(cached.data);
      }
    }
    
    return executeRequest();
  };

  const cancel = () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    setLoading(false);
  };

  const refresh = (newCacheKey?: string) => {
    const keyToClear = newCacheKey || cacheKey;
    if (cache && keyToClear) {
      requestCache.delete(keyToClear);
    }
    return run();
  };

  cacheKey = customCacheKey || (cache ? api.toString() : null);

  onUnmounted(() => {
    cancel();
  });

  return {
    loading,
    response,
    error,
    run,
    cancel,
    refresh,
    clearCache,
    getCacheKey,
  };
}
