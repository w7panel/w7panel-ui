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

export function resolveSiteFileTarget(group: string) {
  if (typeof group !== 'string' || !group.trim()) throw new Error('未获取到当前应用');
  return {
    appgroup: group,
    kind: 'deployments',
    appname: group,
    path: encodeURIComponent(encodeURIComponent('/www/wwwroot')),
  };
}
