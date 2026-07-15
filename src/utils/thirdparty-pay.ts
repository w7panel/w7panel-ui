const THIRDPARTY_PAY_IFRAME_URL =
    'https://cdn.w7.cc/web-app/thirdparty_pay/latest/thirdparty_pay/index.html';

export function getThirdpartyPayIframeUrl(ticket: string): string {
    return `${THIRDPARTY_PAY_IFRAME_URL}?t=${Date.now()}&ticket=${encodeURIComponent(ticket)}`;
}
