import { panelApi } from '@/utils/api';

export async function loadDomainWhiteList(includeDisabled = false) {
  const { data } = await panelApi.get('/auth/domain-white-list', { noAlert: true });
  if (data?.code && data.code !== 200) throw new Error('域名白名单加载失败');
  const list = data?.code === 200 ? data.data : data;
  if (!Array.isArray(list)) throw new Error('域名白名单格式无效');
  return includeDisabled ? list : list.filter(item => !item.disabled);
}
