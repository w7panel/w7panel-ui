import { defineStore } from 'pinia';
import axios from 'axios';
import { cacheManager, CachePresets } from '@/utils/cache';

const NAMESPACE_CACHE_KEY = `${CachePresets.NAMESPACE}:list`;
const NAMESPACE_CACHE_TIME = 5 * 60 * 1000;

export default defineStore('namespace', {
    state: () => ({
        namespaceList: [] as string[],
        namespace: 'default',
        loading: false,
        error: null as string | null,
    }),
    getters: {
        getNamespaceList: (state) => state.namespaceList,
        currentNamespace: (state) => state.namespace,
        isLoading: (state) => state.loading,
    },
    actions: {
        async fetchNamespaceList(forceRefresh = false) {
            if (this.loading) return;
            
            if (!forceRefresh) {
                const cached = cacheManager.get<string[]>(NAMESPACE_CACHE_KEY);
                if (cached && cached.length > 0) {
                    this.namespaceList = cached;
                    if (!this.namespace || !cached.includes(this.namespace)) {
                        this.namespace = cached[0];
                    }
                    return;
                }
            }

            this.loading = true;
            this.error = null;

            try {
                const res = await axios.get('/panel-api/v1/namespaces', {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    noAlert: true,
                    timeout: 10000,
                });
                
                let list = res?.data?.items || [];
                list = list.map((i: any) => i?.metadata?.name).filter(Boolean);
                
                this.namespaceList = list;
                cacheManager.set(NAMESPACE_CACHE_KEY, list, {
                    duration: NAMESPACE_CACHE_TIME,
                    prefix: CachePresets.NAMESPACE,
                });
                
                if (list.length > 0) {
                    if (!this.namespace || !list.includes(this.namespace)) {
                        this.namespace = list[0];
                    }
                }
            } catch (err: any) {
                this.error = err?.message || 'Failed to fetch namespace list';
                console.error('Failed to fetch namespace list:', err);
                
                const cached = cacheManager.get<string[]>(NAMESPACE_CACHE_KEY);
                if (cached) {
                    this.namespaceList = cached;
                }
            } finally {
                this.loading = false;
            }
        },
        setNamespaceList() {
            return this.fetchNamespaceList();
        },
        setNamespace(namespace: string) {
            this.namespace = namespace;
        },
        clearNamespaceCache() {
            cacheManager.clear(CachePresets.NAMESPACE);
            this.namespaceList = [];
        },
        async refreshNamespaceList() {
            cacheManager.clear(CachePresets.NAMESPACE);
            return this.fetchNamespaceList(true);
        },
    },
});
