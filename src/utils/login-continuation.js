// Only the panel server may resolve an authorization request into a callback URL.
export async function continueAuthorization(authRequestID, api, navigate) {
  if (authRequestID == null || authRequestID === '') return false;
  if (typeof authRequestID !== 'string' || !authRequestID.trim()) {
    throw new Error('授权请求无效，请从原应用重新登录');
  }
  const response = await api.post('/callback-url', { authRequestID }, { timeout: 10000 });
  const callbackURL = response.data?.callbackUrl;
  if (typeof callbackURL !== 'string' || !callbackURL) {
    throw new Error('授权回调无效，请从原应用重新登录');
  }
  const url = new URL(callbackURL, window.location.origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('授权回调无效，请从原应用重新登录');
  }
  navigate(url.href);
  return true;
}
