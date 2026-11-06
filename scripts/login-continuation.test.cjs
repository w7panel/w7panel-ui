const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const source = fs.readFileSync('src/utils/login-continuation.js', 'utf8');
  const { continueAuthorization } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
  let calls = 0;
  let destination = '';
  const api = { post: async (path, body) => {
    calls++;
    assert.equal(path, '/callback-url');
    assert.deepEqual(body, { authRequestID: 'request-1' });
    return { data: { callbackUrl: 'https://app.example/callback?code=abc' } };
  } };
  assert.equal(await continueAuthorization(undefined, api, () => {}), false);
  assert.equal(calls, 0);
  assert.equal(await continueAuthorization('request-1', api, url => { destination = url; }), true);
  assert.equal(destination, 'https://app.example/callback?code=abc');
  await assert.rejects(
    continueAuthorization('request-1', { post: async () => ({ data: { callbackUrl: 'javascript:alert(1)' } }) }, () => {}),
    /授权回调地址无效/,
  );
  console.log('login continuation: ok');
})().catch(error => { console.error(error); process.exitCode = 1; });
