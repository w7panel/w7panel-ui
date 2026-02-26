# API 缓存使用规范

## 问题背景

前端项目在 API 缓存方面存在以下问题：

1. **缓存 Key 不可靠**：使用 `api.toString()` 作为缓存 key，不同组件中相同 API 会生成不同引用
2. **缓存孤立**：每个组件实例的缓存互不相通，无法同步清除
3. **缓存策略分散**：多处实现缓存逻辑（Map、localStorage），缺乏统一管理
4. **无失效机制**：数据变更后无法通知相关缓存失效

## 修复方案

### 1. 统一缓存管理工具 (`src/utils/cache.ts`)

提供统一的缓存管理 API：

```typescript
import { cacheManager, CachePresets, invalidateCache } from '@/utils/cache';

// 设置缓存
cacheManager.set('key', data, {
  duration: 5 * 60 * 1000,  // 缓存时间（默认 5 分钟）
  prefix: 'namespace',       // 缓存前缀，用于批量清除
});

// 获取缓存
const data = cacheManager.get('key');

// 清除指定前缀的所有缓存
invalidateCache('namespace');

// 清除匹配模式的缓存
cacheManager.clear('namespace');      // 清除包含 'namespace' 的缓存
cacheManager.clear(/^namespace:/);    // 清除匹配正则的缓存

// 订阅缓存变化
const unsubscribe = subscribeToCache('namespace:list', () => {
  console.log('namespace cache updated');
});
```

### 2. useRequest Hook 缓存增强 (`src/hooks/request.ts`)

**新增功能：**
- 支持自定义 `cacheKey` 参数
- 导出全局缓存管理函数

```typescript
import useRequest, { clearRequestCache, getAllCacheKeys } from '@/hooks/request';

// 使用自定义 cacheKey
const { response, run, refresh } = useRequest(api, {
  cache: true,
  cacheKey: 'namespace:list',  // 自定义缓存 key
  cacheTime: 5 * 60 * 1000,
});

// 全局清除缓存
clearRequestCache();                    // 清除所有缓存
clearRequestCache('namespace');         // 清除包含 'namespace' 的缓存
clearRequestCache(/^namespace:/);       // 清除匹配正则的缓存

// 刷新时指定 cacheKey
refresh('namespace:list');
```

### 3. 缓存预设常量

```typescript
import { CachePresets } from '@/utils/cache';

// 可用的缓存前缀常量
CachePresets.NAMESPACE      // 'namespace'
CachePresets.PERMISSION     // 'permission'
CachePresets.USER_INFO      // 'userinfo'
CachePresets.APP_LIST       // 'applist'
CachePresets.POD_LIST       // 'podlist'
CachePresets.NODE_LIST      // 'nodelist'
CachePresets.STORAGE_LIST   // 'storagelist'
```

## 使用指南

### 场景 1：页面组件使用缓存

```typescript
import useRequest from '@/hooks/request';
import { CachePresets } from '@/utils/cache';

// 获取命名空间列表（带缓存）
const { response: namespaceList } = useRequest(
  () => axios.get('/api/v1/namespaces'),
  {
    cache: true,
    cacheKey: `${CachePresets.NAMESPACE}:list`,
    cacheTime: 5 * 60 * 1000,
  }
);
```

### 场景 2：数据变更后清除缓存

```typescript
import { invalidateCache, CachePresets } from '@/utils/cache';

// 删除命名空间后清除缓存
async function deleteNamespace(name: string) {
  await axios.delete(`/api/v1/namespaces/${name}`);
  invalidateCache(CachePresets.NAMESPACE);  // 清除所有 namespace 缓存
}

// 创建应用后清除应用列表缓存
async function createApp(data: any) {
  await axios.post('/api/v1/apps', data);
  invalidateCache(CachePresets.APP_LIST);
}
```

### 场景 3：Store 中使用缓存

```typescript
// store/modules/namespace.ts
import { cacheManager, CachePresets } from '@/utils/cache';

export default defineStore('namespace', {
  actions: {
    async fetchNamespaceList(forceRefresh = false) {
      if (!forceRefresh) {
        const cached = cacheManager.get(`${CachePresets.NAMESPACE}:list`);
        if (cached) {
          this.namespaceList = cached;
          return;
        }
      }

      const res = await axios.get('/api/v1/namespaces');
      const list = res.data.items.map((i: any) => i.metadata.name);
      
      this.namespaceList = list;
      cacheManager.set(`${CachePresets.NAMESPACE}:list`, list, {
        duration: 5 * 60 * 1000,
        prefix: CachePresets.NAMESPACE,
      });
    },
    
    async refreshNamespaceList() {
      cacheManager.clear(CachePresets.NAMESPACE);
      return this.fetchNamespaceList(true);
    },
  },
});
```

### 场景 4：缓存订阅（响应式更新）

```typescript
import { subscribeToCache, CachePresets } from '@/utils/cache';
import { onMounted, onUnmounted } from 'vue';

export default {
  setup() {
    const unsubscribe = subscribeToCache(`${CachePresets.NAMESPACE}:*`, () => {
      // namespace 缓存更新时自动刷新
      fetchNamespaceList();
    });

    onUnmounted(() => {
      unsubscribe();
    });
  },
};
```

## 缓存清除时机

| 操作 | 应清除的缓存 |
|------|-------------|
| 创建命名空间 | `CachePresets.NAMESPACE` |
| 删除命名空间 | `CachePresets.NAMESPACE` |
| 创建应用 | `CachePresets.APP_LIST` |
| 删除应用 | `CachePresets.APP_LIST` |
| 创建 Pod | `CachePresets.POD_LIST` |
| 删除 Pod | `CachePresets.POD_LIST` |
| 节点操作 | `CachePresets.NODE_LIST` |
| 存储操作 | `CachePresets.STORAGE_LIST` |
| 权限变更 | `CachePresets.PERMISSION` |
| 用户信息变更 | `CachePresets.USER_INFO` |

## 最佳实践

### ✅ 推荐做法

1. **使用统一的 cacheKey 命名**
   ```typescript
   // ✅ 好：使用预设常量 + 描述性后缀
   cacheKey: `${CachePresets.NAMESPACE}:list`
   cacheKey: `${CachePresets.APP_LIST}:detail:${appId}`
   ```

2. **数据变更后立即清除相关缓存**
   ```typescript
   // ✅ 好：操作后清除缓存
   await deleteResource();
   invalidateCache(CachePresets.APP_LIST);
   ```

3. **使用合理的缓存时间**
   ```typescript
   // ✅ 好：根据数据更新频率设置
   cacheTime: 5 * 60 * 1000,   // 频繁更新：5 分钟
   cacheTime: 30 * 60 * 1000,  // 较少更新：30 分钟
   ```

4. **在 Store 中统一管理缓存**
   ```typescript
   // ✅ 好：Store 中封装缓存逻辑
   actions: {
     async fetchData() {
       const cached = cacheManager.get(KEY);
       if (cached) return cached;
       // fetch...
     },
   }
   ```

### ❌ 避免做法

1. **不要直接使用 localStorage**
   ```typescript
   // ❌ 坏：直接使用 localStorage
   localStorage.setItem('my_cache', JSON.stringify(data));
   
   // ✅ 好：使用 cacheManager
   cacheManager.set('my_cache', data);
   ```

2. **不要使用 api.toString() 作为 cacheKey**
   ```typescript
   // ❌ 坏：依赖 api.toString()
   useRequest(api, { cache: true });
   
   // ✅ 好：显式指定 cacheKey
   useRequest(api, {
     cache: true,
     cacheKey: 'namespace:list',
   });
   ```

3. **不要忘记清除缓存**
   ```typescript
   // ❌ 坏：只修改数据，不清除缓存
   await updateResource();
   
   // ✅ 好：修改后立即清除
   await updateResource();
   invalidateCache(CachePresets.APP_LIST);
   ```

4. **不要缓存敏感数据**
   ```typescript
   // ❌ 坏：缓存 token、密码等
   cacheManager.set('user_token', token);
   
   // ✅ 好：使用 auth 工具存储
   setToken(token);
   ```

## 迁移指南

### 从旧的 localStorage 缓存迁移

**之前：**
```typescript
const cached = localStorage.getItem('namespace_list_cache');
localStorage.setItem('namespace_list_cache', JSON.stringify(data));
localStorage.removeItem('namespace_list_cache');
```

**现在：**
```typescript
const cached = cacheManager.get(`${CachePresets.NAMESPACE}:list`);
cacheManager.set(`${CachePresets.NAMESPACE}:list`, data);
cacheManager.clear(CachePresets.NAMESPACE);
```

### 从旧的 useRequest 迁移

**之前：**
```typescript
useRequest(api, { cache: true })  // cacheKey 不可控
```

**现在：**
```typescript
useRequest(api, {
  cache: true,
  cacheKey: 'namespace:list',  // 显式指定
})
```

## 调试工具

```typescript
// 查看所有缓存 key
import { getAllCacheKeys } from '@/hooks/request';
console.log(getAllCacheKeys());

// 查看缓存统计
import { cacheManager } from '@/utils/cache';
console.log(cacheManager.getStats());

// 手动清除特定缓存
import { clearRequestCache } from '@/hooks/request';
clearRequestCache('namespace');
```

## 相关文件

- `src/utils/cache.ts` - 缓存管理工具
- `src/hooks/request.ts` - 增强的 useRequest Hook
- `src/store/modules/namespace.ts` - 使用示例
- `src/hooks/k3k-info.ts` - 使用示例
