import { panelApi } from '@/utils/api';
import { Modal } from '@arco-design/web-vue';

const ZPK_URL_ANNOTATION = 'w7.cc/zpk-url';
const RESOURCE_GROUP_LABEL = 'w7.cc/group-name';
const CACHE_TTL_MS = 30_000;
const VALIDATION_NOTICE_INTERVAL_MS = 5_000;
let lastValidationNoticeAt = 0;

export interface AppDynamicValuesResult {
  status: 'ready' | 'not_supported' | 'unavailable';
  data: Record<string, unknown> | null;
}

export interface AppValidation {
  valid: boolean;
  reason: string;
  message: string;
}

interface AppDynamicValuesGetterOptions {
  currentAppgroup: string;
  reverseDependentApps?: Array<{ appgroup?: string }>;
  microApps?: any[];
}

interface CacheEntry {
  expiresAt: number;
  value?: AppDynamicValuesResult;
  pending?: Promise<AppDynamicValuesResult>;
}

const cache = new Map<string, CacheEntry>();

function resourceAppgroup(resource: any): string {
  return String(resource?.metadata?.labels?.[RESOURCE_GROUP_LABEL] || '').trim();
}

function resourceZpkURL(resource: any): string {
  return String(resource?.metadata?.annotations?.[ZPK_URL_ANNOTATION] || '').trim();
}

/**
 * 创建一个仅能访问当前应用及 reverse_dependent_apps 的动态值读取器。
 * 制品地址保留在宿主闭包中，调用方只能传 AppGroup 名称。
 */
export function createAppDynamicValuesGetter(options: AppDynamicValuesGetterOptions) {
  const currentAppgroup = String(options.currentAppgroup || '').trim();
  const allowedAppgroups = new Set([
    currentAppgroup,
    ...(options.reverseDependentApps || []).map(item => String(item?.appgroup || '').trim()),
  ].filter(Boolean));
  const zpkURLByAppgroup = new Map<string, string>();
  (options.microApps || []).forEach(resource => {
    const appgroup = resourceAppgroup(resource);
    const zpkURL = resourceZpkURL(resource);
    if(appgroup && zpkURL && !zpkURLByAppgroup.has(appgroup)){
      zpkURLByAppgroup.set(appgroup, zpkURL);
    }
  });

  return async function getAppDynamicValues(
    appgroup?: string,
    requestOptions: { force?: boolean } = {},
  ): Promise<AppDynamicValuesResult> {
    const requestedAppgroup = String(appgroup || '').trim();
    const target = requestedAppgroup || currentAppgroup;
    const repoUrl = zpkURLByAppgroup.get(target) || '';
    if(!target || !allowedAppgroups.has(target) || !repoUrl){
      return { status: 'not_supported', data: null };
    }

    const cacheKey = `${target}\n${repoUrl}`;
    const cached = cache.get(cacheKey);
    if(!requestOptions.force && cached?.pending){
      return cached.pending;
    }
    if(!requestOptions.force && cached?.value && cached.expiresAt > Date.now()){
      return cached.value;
    }

    const pending = panelApi.get('/zpk/config', {
      params: {
        repoUrl,
        releaseName: target,
        runtimeContext: true,
      },
      noAlert: true,
      timeout: 10_000,
    }).then(response => {
      const payload = response?.data || {};
      return {
        status: payload?.status === 'ready' ? 'ready' : 'unavailable',
        data: payload?.status === 'ready' && payload?.data && typeof payload.data === 'object'
          ? payload.data
          : null,
      } as AppDynamicValuesResult;
    }).catch(() => ({
      status: 'unavailable',
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
    return validate as AppValidation;
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
