import { panelApi } from '@/utils/api';
import { Modal } from '@arco-design/web-vue';

const CACHE_TTL_MS = 30_000;
const VALIDATION_NOTICE_INTERVAL_MS = 5_000;
let lastValidationNoticeAt = 0;

export interface AppDynamicValuesResult {
  status: 'ready' | 'not_supported' | 'unavailable';
  title: string;
  data: Record<string, unknown> | null;
}

export interface AppValidation {
  title: string;
  valid: boolean;
  reason: string;
  message: string;
}

interface AppDynamicValuesGetterOptions {
  currentAppgroup: string;
}

interface CacheEntry {
  expiresAt: number;
  value?: AppDynamicValuesResult;
  pending?: Promise<AppDynamicValuesResult>;
}

const cache = new Map<string, CacheEntry>();

/**
 * 创建按 AppGroup 读取应用动态值的方法。制品地址由面板后端根据已安装
 * AppGroup 解析，不依赖目标应用是否创建 MicroApp。
 */
export function createAppDynamicValuesGetter(options: AppDynamicValuesGetterOptions) {
  const currentAppgroup = String(options.currentAppgroup || '').trim();

  return async function getAppDynamicValues(
    appgroup?: string,
    requestOptions: { force?: boolean } = {},
  ): Promise<AppDynamicValuesResult> {
    const requestedAppgroup = String(appgroup || '').trim();
    const target = requestedAppgroup || currentAppgroup;
    if(!target){
      return { status: 'not_supported', title: '', data: null };
    }

    const cacheKey = target;
    const cached = cache.get(cacheKey);
    if(!requestOptions.force && cached?.pending){
      return cached.pending;
    }
    if(!requestOptions.force && cached?.value && cached.expiresAt > Date.now()){
      return cached.value;
    }

    const pending = panelApi.get('/zpk/config', {
      params: {
        releaseName: target,
        runtimeContext: true,
      },
      noAlert: true,
      timeout: 10_000,
    }).then(response => {
      const payload = response?.data || {};
      return {
        status: payload?.status === 'ready'
          ? 'ready'
          : payload?.status === 'not_supported' ? 'not_supported' : 'unavailable',
        title: typeof payload?.title === 'string' ? payload.title : '',
        data: payload?.status === 'ready' && payload?.data && typeof payload.data === 'object'
          ? payload.data
          : null,
      } as AppDynamicValuesResult;
    }).catch(() => ({
      status: 'unavailable',
      title: '',
      data: null,
    } as AppDynamicValuesResult)).then(value => {
      cache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      return value;
    });
    cache.set(cacheKey, { pending, expiresAt: 0 });
    return pending;
  };
}

export function createAppValidator(
  getAppDynamicValues: ReturnType<typeof createAppDynamicValuesGetter>,
) {
  return async function validateApp(
    appgroup?: string,
    requestOptions: { force?: boolean } = {},
  ): Promise<AppValidation | null> {
    const result = await getAppDynamicValues(appgroup, requestOptions);
    const validate = result.status === 'ready' ? result.data?.validate : null;
    if(!validate || typeof validate !== 'object'){
      return null;
    }
    const value = validate as Record<string, unknown>;
    if(typeof value.valid !== 'boolean'
      || typeof value.reason !== 'string'
      || typeof value.message !== 'string'){
      return null;
    }
    return {
      title: result.title,
      valid: value.valid,
      reason: value.reason,
      message: value.message,
    };
  };
}

/**
 * 进入应用时在后台刷新可用性。查询异常不阻断应用启动；市场明确返回
 * valid=false 时才展示提示，并复用稳定原因码生成标题。
 */
export async function checkAppAvailability(
  validateApp: ReturnType<typeof createAppValidator>,
): Promise<void> {
  try {
    const validation = await validateApp();
    if(!validation || validation.valid){
      return;
    }
    const now = Date.now();
    if(now - lastValidationNoticeAt <= VALIDATION_NOTICE_INTERVAL_MS){
      return;
    }
    lastValidationNoticeAt = now;
    const isTrialExpired = validation.reason === 'trial_expired';
    const detail = String(validation.message || '当前应用授权无效').replace(/[。！!]+$/, '');
    Modal.warning({
      title: isTrialExpired ? '制品试用已到期' : '应用当前不可用',
      content: `${detail}。请通过应用菜单中的“授权与续费”处理后继续使用。`,
      okText: '知道了',
      hideCancel: true,
    });
  } catch (error) {
    console.warn('[app-validation] 应用可用性检查失败，继续打开已安装应用', error);
  }
}
