export function getWujieRoutePrefix(frontendUrl: unknown) {
  const index = String(frontendUrl || '');
  const prefix: Record<string, string> = {
    // index: index + 'index.html',
    index: index,
    other: index,
  };

  try {
    if (index && typeof window !== 'undefined') {
      const absoluteIndex = new URL(index, window.location.origin).href;
      if (absoluteIndex !== index) {
        prefix.absoluteIndex = absoluteIndex;
        prefix.absoluteOther = absoluteIndex;
      }
    }
  } catch {}

  return prefix;
}

export function normalizeWujieSyncRoute(value: unknown, prefix: Record<string, string> = {}) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) {
    return '';
  }

  let route = String(rawValue);
  try {
    route = decodeURIComponent(route);
  } catch {}

  Object.entries(prefix)
    .filter(([, longPath]) => longPath)
    .sort((a, b) => b[1].length - a[1].length)
    .some(([shortPath, longPath]) => {
      const token = `{${shortPath}}`;
      if (route.startsWith(token)) {
        route = route.replace(token, longPath);
        return true;
      }
      return false;
    });

  Object.values(prefix)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .some((longPath) => {
      if (route.startsWith(longPath)) {
        route = route.slice(longPath.length);
        return true;
      }
      return false;
    });

  return route;
}

export function normalizeWujieNavigationRoute(value: unknown, frontendUrl: unknown) {
  const route = normalizeWujieSyncRoute(value, getWujieRoutePrefix(frontendUrl));
  if (!route || !/^https?:\/\//i.test(route)) {
    return route;
  }

  try {
    if (typeof window === 'undefined') {
      return route;
    }

    const baseUrl = new URL(String(frontendUrl || '/'), window.location.origin);
    const targetUrl = new URL(route);
    const basePath = baseUrl.pathname.endsWith('/')
      ? baseUrl.pathname
      : baseUrl.pathname.replace(/[^/]*$/, '');

    if (targetUrl.origin !== baseUrl.origin || !targetUrl.pathname.startsWith(basePath)) {
      return '';
    }

    return targetUrl.pathname.slice(basePath.length) + targetUrl.search + targetUrl.hash;
  } catch {
    return route;
  }
}

export function joinWujieUrlRoute(base: unknown, route: unknown) {
  const baseUrl = String(base || '');
  const routePath = String(route || '');

  if (!routePath) {
    return baseUrl;
  }

  if (/^https?:\/\//i.test(routePath) || !baseUrl || /^[?#]/.test(routePath)) {
    return baseUrl + routePath;
  }

  if (baseUrl.endsWith('/') && routePath.startsWith('/')) {
    return baseUrl + routePath.slice(1);
  }

  if (!baseUrl.endsWith('/') && !routePath.startsWith('/')) {
    return baseUrl + '/' + routePath;
  }

  return baseUrl + routePath;
}
