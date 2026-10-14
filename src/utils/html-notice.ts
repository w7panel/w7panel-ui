import { h } from 'vue';
import { Message, Modal } from '@arco-design/web-vue';

export const MAX_HTML_NOTICE_LENGTH = 64 * 1024;
const handledKeys = new WeakSet<object>();

const allowedTags = new Set([
  'DIV', 'P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'A',
  'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SMALL', 'BR', 'HR', 'UL', 'OL', 'LI',
  'BUTTON', 'BLOCKQUOTE', 'PRE', 'CODE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
]);

// Parse inertly, then allow only local formatting and explicit web links.
const allowedStyles = new Set(['color', 'background-color', 'font-size', 'font-weight',
  'font-style', 'text-align', 'text-decoration', 'line-height', 'letter-spacing',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-color', 'border-width', 'border-style', 'border-radius',
  'display', 'gap', 'flex-wrap', 'justify-content', 'align-items']);
export function sanitizeNoticeHtml(html: string, allowedActions: readonly string[] = []): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  for (const element of Array.from(template.content.querySelectorAll('*'))) {
    if (!allowedTags.has(element.tagName)) {
      element.remove();
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      if (!['style', 'title'].includes(attribute.name)
        && !(element.tagName === 'A' && attribute.name === 'href')
        && !(element.tagName === 'BUTTON' && attribute.name === 'data-panel-action')) {
        element.removeAttribute(attribute.name);
      }
    }
    const styled = element as HTMLElement;
    for (const property of Array.from(styled.style)) {
      const value = styled.style.getPropertyValue(property);
      if (!allowedStyles.has(property) || /url|image|expression|var\s*\(|[\\@]/i.test(value)) {
        styled.style.removeProperty(property);
      } else {
        styled.style.setProperty(property, value); // Drop remote !important.
      }
    }
    if (element.tagName === 'BUTTON') {
      if (!allowedActions.includes(element.getAttribute('data-panel-action') || '')) {
        element.remove();
        continue;
      }
      element.setAttribute('type', 'button');
    }
    if (element.tagName === 'A') {
      try {
        const url = new URL(element.getAttribute('href') || '');
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
          throw new Error('Invalid notice link');
        }
        element.setAttribute('href', url.href);
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      } catch {
        element.removeAttribute('href');
      }
    }
  }
  return template.innerHTML;
}

export interface HtmlNoticeOptions {
  title?: string;
  html: string;
  fallbackText?: string;
  dedupeKey?: object;
  allowedActions?: readonly string[];
  onAction?: (action: string, context: { close: () => void }) => void | Promise<void>;
  onActionError?: (error: unknown) => void;
}

// Returns false when invalid or empty content should be handled by the caller.
export function showHtmlNotice(options: HtmlNoticeOptions): boolean {
  if (typeof options.html !== 'string' || !options.html.trim()
    || options.html.length > MAX_HTML_NOTICE_LENGTH) return false;
  if (options.dedupeKey && handledKeys.has(options.dedupeKey)) return true;
  const allowedActions = options.onAction ? options.allowedActions || [] : [];
  const sanitized = sanitizeNoticeHtml(options.html, allowedActions);
  const checked = document.createElement('template');
  checked.innerHTML = sanitized;
  const hasContent = Boolean(checked.content.textContent?.replace(/[\s\u200b-\u200d\ufeff]/g, ''));
  if (!hasContent && !options.fallbackText?.trim()) return false;
  const title = options.title?.trim() ? options.title.slice(0, 120) : '提示';
  let pending = false;
  let closed = false;
  const close = () => { closed = true; modal.close(); };
  const modal = Modal.warning({
    onClose: () => { closed = true; },
    title,
    content: () => h('div', {
      ref: (host: any) => {
        if (!(host instanceof HTMLElement) || host.shadowRoot) return;
        const root = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = ':host{display:block;max-height:60vh;overflow:auto;font:14px/1.7 sans-serif;color:#1d2129;overflow-wrap:anywhere}a{color:#165dff}button{cursor:pointer;font:inherit}pre{white-space:pre-wrap}table{max-width:100%}';
        const body = document.createElement('div');
        if (hasContent) body.innerHTML = sanitized;
        else body.textContent = options.fallbackText || '';
        body.addEventListener('click', async event => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          const button = target.closest('button[data-panel-action]');
          const action = button?.getAttribute('data-panel-action');
          if (action && allowedActions.includes(action)) {
            event.preventDefault();
            if (pending || closed) return;
            pending = true;
            const buttons = Array.from(body.querySelectorAll<HTMLButtonElement>('button[data-panel-action]'));
            buttons.forEach(item => { item.disabled = true; item.setAttribute('aria-busy', 'true'); });
            try {
              await options.onAction?.(action, { close });
            } catch (error) {
              if (options.onActionError) {
                try { options.onActionError(error); }
                catch { Message.error('操作失败，请重试'); }
              } else {
                Message.error('操作失败，请重试');
              }
            } finally {
              pending = false;
              buttons.forEach(item => { item.disabled = closed; item.removeAttribute('aria-busy'); });
            }
          }
        });
        root.append(style, body);
      },
    }),
    okText: '关闭',
    hideCancel: true,
    maskClosable: false,
    width: 560,
  });
  if (options.dedupeKey) handledKeys.add(options.dedupeKey);
  return true;
}
