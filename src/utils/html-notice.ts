import { h } from 'vue';
import { Button, Message, Modal } from '@arco-design/web-vue';

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
  'display', 'gap', 'row-gap', 'column-gap', 'flex-wrap', 'justify-content', 'align-items',
  // Browsers expand shorthand declarations when iterating CSSStyleDeclaration.
  'text-decoration-line', 'text-decoration-style', 'text-decoration-color', 'text-decoration-thickness',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius']);
const themedColors: Record<string, string> = {
  'rgb(29, 33, 41)': 'var(--color-text-1, #1d2129)',
  'rgb(22, 93, 255)': 'rgb(var(--primary-6, 22, 93, 255))',
  'rgb(245, 63, 63)': 'rgb(var(--danger-6, 245, 63, 63))',
};
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
        && !(element.tagName === 'DIV' && attribute.name === 'data-notice-footer')
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
        // Convert known palette colors locally; remote CSS variables remain forbidden.

        const themed = (property === 'color' || property.endsWith('-color'))
          ? themedColors[value] : undefined;
        styled.style.setProperty(property, themed || value); // Drop remote !important.
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
  const footerParts: string[] = [];
  for (const section of Array.from(checked.content.querySelectorAll('div[data-notice-footer]'))) {
    // Only move outermost marked sections; nested sections stay inside them.
    if (section.parentElement?.closest('div[data-notice-footer]')) continue;
    if (section.textContent?.trim()) footerParts.push(section.outerHTML);
    section.remove();
  }
  const footerHtml = footerParts.join('');
  const contentHtml = checked.innerHTML;
  const regions = new Set<HTMLElement>();
  const title = options.title?.trim() ? options.title.slice(0, 120) : '提示';
  let pending = false;
  let closed = false;
  const close = () => { closed = true; modal.close(); };
  const renderRegion = (html: string, footer = false) => h('div', {
    ref: (host: any) => {
      if (!(host instanceof HTMLElement) || host.shadowRoot) return;
      const root = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = ':host{display:block;max-height:60vh;overflow:auto;font:14px/1.7 sans-serif;color:var(--color-text-1,#1d2129);overflow-wrap:anywhere}a{color:rgb(var(--primary-6,22,93,255))}button{cursor:pointer;font:inherit}button:disabled{opacity:.5;cursor:not-allowed}button:disabled[aria-busy="true"]{cursor:wait}pre{white-space:pre-wrap}table{max-width:100%}';
      const body = document.createElement('div');
      if (hasContent) body.innerHTML = html;
      else body.textContent = options.fallbackText || '';
      regions.add(body);
      body.addEventListener('click', async event => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const button = target.closest('button[data-panel-action]');
        const action = button?.getAttribute('data-panel-action');
        if (action && allowedActions.includes(action)) {
          event.preventDefault();
          if (pending || closed) return;
          pending = true;
          const buttons = Array.from(regions).flatMap(region => Array.from(region.querySelectorAll<HTMLButtonElement>('button[data-panel-action]')));
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
      if (footer) {
        body.style.cssText = 'display:flex;align-items:center;gap:16px;flex-wrap:wrap';
        style.textContent += ':host{max-height:none;overflow:visible}p{margin:0}';
      }
      root.append(style, body);
    },
  });
  const modal = Modal.warning({
    onClose: () => { closed = true; },
    title,
    content: () => renderRegion(contentHtml),
    footer: () => h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' } }, [
      ...(footerHtml ? [renderRegion(footerHtml, true)] : []),
      h(Button, { onClick: close }, () => '关闭'),
    ]),
    okText: '关闭',
    hideCancel: true,
    maskClosable: false,
    width: 480,
  });
  if (options.dedupeKey) handledKeys.add(options.dedupeKey);
  return true;
}
