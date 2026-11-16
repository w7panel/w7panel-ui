export async function continueAuthorization(authRequestID, panelApi, navigate) {
  if (typeof authRequestID !== 'string' || !authRequestID) return false;
  const response = await panelApi.post('/callback-url', { authRequestID });
  const url = response?.data?.callbackUrl;
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    throw new Error('授权回调地址无效');
  }
  navigate(url);
  return true;
}
