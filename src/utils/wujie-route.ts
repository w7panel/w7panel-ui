export function getWujieRoutePrefix(frontendUrl: unknown) {
  const index = String(frontendUrl || '');
  return {
    // index: index + 'index.html',
    index: index,
    other: index,
  };
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
