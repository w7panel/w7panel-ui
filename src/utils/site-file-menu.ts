export const SITE_FILES_MENU_DO = '__panel_site_files__';

interface SiteFilesMenu {
  do?: unknown;
  microAppName?: unknown;
  children?: SiteFilesMenu[];
  [key: string]: unknown;
}

export function getSiteFilesMenu<T extends SiteFilesMenu>(route: any, menus: T[] = []): T | null {
  const query = route?.query || {};
  if (route?.name !== 'app-detail-files' || query.do !== SITE_FILES_MENU_DO
    || typeof query.microapp !== 'string' || !query.microapp.trim()) {
    return null;
  }
  const find = (items: SiteFilesMenu[]): SiteFilesMenu | null => {
    for (const menu of items) {
      if (menu.do === SITE_FILES_MENU_DO && menu.microAppName === query.microapp) return menu;
      const child = Array.isArray(menu.children) ? find(menu.children) : null;
      if (child) return child;
    }
    return null;
  };
  return find(menus) as T | null;
}

interface NativeFileData {
  appgroup?: unknown;
  kind?: unknown;
  appname?: unknown;
  path?: unknown;
  sourceMicroApp?: unknown;
  sourceMenuDo?: unknown;
}

// `path` follows the existing toFile contract: callers supply the encoded hash value.
export function nativeFileRoute(data: NativeFileData = {}) {
  const base = `/app/appgroup/${data.appgroup}/${data.kind}/${data.appname}/files`;
  const source = typeof data.sourceMicroApp === 'string' ? data.sourceMicroApp : '';
  const query = source.trim() && data.sourceMenuDo === SITE_FILES_MENU_DO
    ? `?${new URLSearchParams({ do: SITE_FILES_MENU_DO, microapp: source }).toString()}`
    : '';
  return `${base}${query}#path=${data.path || ''}`;
}

interface ResourceApi {
  get(url: string): Promise<{ data: any }>;
}

// Called by the file-menu action only; menu discovery must not load AppGroups.
export async function resolveSiteFileTarget(api: ResourceApi, namespace: string, group: string) {
  if (typeof group !== 'string' || !group.trim()) throw new Error('未获取到当前应用');
  const ns = encodeURIComponent(namespace || 'default');
  const name = encodeURIComponent(group);
  let appGroup: any;
  try {
    appGroup = (await api.get(`/apis/w7panel.w7.com/v1alpha1/namespaces/${ns}/appgroups/${name}`)).data;
  } catch {
    throw new Error('读取应用信息失败，请稍后重试');
  }
  const workloads = (appGroup?.status?.items || []).filter((item: any) => (
    item?.kind === 'Deployment' && item.name === group
  ));
  if (workloads.length !== 1) {
    throw new Error(workloads.length ? '站点主应用信息不唯一' : '未找到站点主应用');
  }
  let hostname: string;
  const address = appGroup?.metadata?.annotations?.['w7.cc/default-domain'];
  if (!address) throw new Error('应用尚未配置默认域名');
  try {
    const url = new URL(address);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error();
    hostname = url.hostname;
  } catch {
    throw new Error('应用默认域名格式不正确，请使用 HTTP 或 HTTPS 地址');
  }
  let application: any;
  try {
    application = (await api.get(`/apis/apps/v1/namespaces/${ns}/deployments/${name}`)).data;
  } catch {
    throw new Error('读取站点主应用失败，请稍后重试');
  }
  const spec = application?.spec?.template?.spec || {};
  const containers = spec.containers || [];
  if (!containers[0]?.name) throw new Error('未找到站点主容器');
  const candidates: { containerIndex: number; path: string }[] = [];
  containers.forEach((container: any, containerIndex: number) => {
    (container.volumeMounts || []).forEach((mount: any) => {
      const volume = (spec.volumes || []).find((item: any) => item?.name === mount?.name);
      const subPath = typeof mount?.subPath === 'string' ? mount.subPath.replace(/^\/+|\/+$/g, '') : '';
      const path = mount?.mountPath;
      if (!volume?.persistentVolumeClaim?.claimName || mount.subPathExpr
        || subPath.split('/').includes('..') || subPath !== `nginx-web-dir/${hostname}`
        || typeof path !== 'string' || !path.startsWith('/') || path.includes('\0')
        || path.split('/').includes('..')) return;
      candidates.push({ containerIndex, path: path.replace(/\/+$/, '') || '/' });
    });
  });
  if (candidates.length !== 1) {
    throw new Error(candidates.length ? '站点目录存在多个匹配的持久化挂载，无法唯一定位' : '未找到当前站点的持久化目录挂载');
  }
  if (candidates[0].containerIndex !== 0) {
    throw new Error('站点目录位于非首个容器，原生文件管理暂不支持访问');
  }
  return {
    appgroup: group,
    kind: 'deployments',
    appname: group,
    path: encodeURIComponent(encodeURIComponent(candidates[0].path)),
  };
}
