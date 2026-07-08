function toValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function getWujieProxyBackendUrl(backendUrl) {
  const url = String(backendUrl || '');
  if(!url){
    return '';
  }
  return /^\//.test(url) ? window.location.origin + url : url;
}

function readFrontProp(frontProps, key) {
  const props = frontProps || {};
  return toValue(
    props?.system?.[key]
    ?? props?.frontend_props?.system?.[key]
    ?? props?.[`system.${key}`]
    ?? props?.frontend_props?.[`system.${key}`]
    ?? props?.[key]
    ?? props?.frontend_props?.[key]
  );
}

function buildSystemValues({ frontProps, backendUrl, group, role }: any = {}) {
  const frontUrl = readFrontProp(frontProps, 'url');
  return {
    url: getWujieProxyBackendUrl(frontUrl || backendUrl),
    group: readFrontProp(frontProps, 'group') || group || '',
    userid: readFrontProp(frontProps, 'userid'),
    role: readFrontProp(frontProps, 'role') || role || '',
    access_token: readFrontProp(frontProps, 'access_token'),
    openid: readFrontProp(frontProps, 'openid'),
    nickname: readFrontProp(frontProps, 'nickname'),
    cloud_uid: readFrontProp(frontProps, 'cloud_uid'),
    cloud_accesstoken: readFrontProp(frontProps, 'cloud_accesstoken'),
  };
}

function resolveTemplate(value, systemValues) {
  if(value == null){
    return value;
  }
  if(Array.isArray(value)){
    return value.map((item) => resolveTemplate(item, systemValues));
  }
  if(typeof value !== 'string'){
    return value;
  }
  return value.replace(/\$\{system\.([A-Za-z0-9_]+)\}/g, (match, key) => {
    const resolved = systemValues[key];
    return resolved == null ? '' : String(resolved);
  });
}

function eachQueryEntry(query, callback) {
  if(!query){
    return;
  }
  if(typeof query === 'string'){
    new URLSearchParams(query.replace(/^\?/, '')).forEach((value, key) => callback(key, value));
    return;
  }
  if(Array.isArray(query)){
    query.forEach((item) => {
      if(Array.isArray(item)){
        callback(item[0], item[1]);
        return;
      }
      if(item && typeof item === 'object'){
        callback(item.key || item.name, item.value);
      }
    });
    return;
  }
  if(typeof query === 'object'){
    Object.entries(query).forEach(([key, value]) => callback(key, value));
  }
}

function buildProxyRequestParams(query, systemValues) {
  const result = {};
  eachQueryEntry(query, (key, value) => {
    if(!key){
      return;
    }
    const resolved = resolveTemplate(value, systemValues);
    if(resolved == null){
      return;
    }
    result[key] = resolved;
  });
  return result;
}

function appendQuery(appUrl, query) {
  const entries = Object.entries(query || {});
  if(!entries.length){
    return appUrl;
  }

  const rawUrl = String(appUrl || '');
  const hashIndex = rawUrl.indexOf('#');
  const beforeHash = hashIndex === -1 ? rawUrl : rawUrl.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : rawUrl.slice(hashIndex);
  const queryIndex = beforeHash.indexOf('?');
  const path = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
  const search = queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1);
  const params = new URLSearchParams(search);

  entries.forEach(([key, value]) => {
    params.delete(key);
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      if(item != null){
        params.append(key, String(item));
      }
    });
  });

  const nextSearch = params.toString();
  return path + (nextSearch ? `?${nextSearch}` : '') + hash;
}

export function appendWujieProxyRequestQuery(appUrl, options: any = {}) {
  const proxyQuery = options.proxyRequest?.query || options.query;
  if(!proxyQuery){
    return appUrl;
  }

  const systemValues = buildSystemValues(options);
  const params = buildProxyRequestParams(proxyQuery, systemValues);
  return appendQuery(appUrl, params);
}
