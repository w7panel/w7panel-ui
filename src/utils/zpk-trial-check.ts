import { panelApi } from '@/utils/api';

const ZPK_TRIAL_CHECK_TIMEOUT = 3000;
const ZPK_TRIAL_EXPIRED = 'ZPK_TRIAL_EXPIRED';

/**
 * 在后台刷新制品试用状态。
 *
 * ZPK_TRIAL_EXPIRED 由全局响应拦截器负责提示；制品服务超时或异常时
 * 仅记录警告，不能阻断已经安装好的 MicroApp 启动。
 */
export async function checkZpkTrialExpiration(repoUrl: string): Promise<void> {
  if (!repoUrl) return;

  try {
    await panelApi.get('/zpk/config', {
      params: { repoUrl },
      noAlert: true,
      timeout: ZPK_TRIAL_CHECK_TIMEOUT,
    });
  } catch (error: any) {
    if (error?.response?.data?.code === ZPK_TRIAL_EXPIRED) return;
    console.warn('[zpk-trial-check] 制品试用状态检查失败，继续打开已安装应用', {
      status: error?.response?.status,
      code: error?.response?.data?.code || error?.code,
    });
  }
}
