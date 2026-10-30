import { panelApi } from '@/utils/api';
import { loadApiRouteDescriptions } from '@/utils/api-route-description';

export async function loadPermissionApiCatalog() {
  const [response, descriptions] = await Promise.all([
    panelApi.get('/auth/permissions/routes', { noAlert: true }),
    loadApiRouteDescriptions(),
  ]);
  const routes = response?.data?.data || response?.data || [];
  return {
    routes: Array.isArray(routes) ? routes : [],
    descriptions,
  };
}
