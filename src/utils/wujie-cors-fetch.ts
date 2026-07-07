export const wujieFetch: typeof window.fetch = (input, init = {}) => {
  const headers = new Headers(
    init.headers || (input instanceof Request ? input.headers : undefined)
  );

  return window.fetch(input, {
    ...init,
    headers,
    credentials: "include"
  });
};