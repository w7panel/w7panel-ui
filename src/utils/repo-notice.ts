import { Modal } from '@arco-design/web-vue';
import { showHtmlNotice } from './html-notice';

export const REPO_HTML_NOTICE_CODE = 'ZPK_HTML_NOTICE';

export interface RepoNoticeOptions {
  onReinstall?: () => void;
}

export function showRepoHtmlNotice(error: any, options: RepoNoticeOptions = {}): boolean {
  const payload = error?.response?.data;
  const detail = payload?.data;
  const html = detail?.html;
  const isNotice = error?.response?.status === 403 && payload?.code === REPO_HTML_NOTICE_CODE;
  const isConflict = error?.response?.status === 409 && payload?.code === 409
    && ['domain_mismatch', 'app_identify_exists'].includes(detail?.conflict_reason);
  if ((!isNotice && !isConflict)
    || typeof html !== 'string' || !html.trim()) {
    return false;
  }
  const title = typeof detail.title === 'string' && detail.title.trim()
    ? detail.title : '制品安装提示';
  const allowReinstall = isConflict && detail.conflict_reason === 'app_identify_exists'
    && Boolean(options.onReinstall);
  let confirming = false;
  let reinstallStarted = false;
  const runReinstall = (close: () => void) => {
    if (confirming || reinstallStarted) return;
    confirming = true;
    Modal.confirm({
      title: '确认强制清除并安装',
      content: '强制清除会覆盖旧应用的安装记录，可能导致老应用状态丢失、无法继续升级。确定继续吗？',
      okText: '确认强制安装',
      cancelText: '取消',
      okButtonProps: { status: 'danger' },
      onClose: () => { confirming = false; },
      onOk: () => {
        if (reinstallStarted) return;
        reinstallStarted = true;
        close();
        options.onReinstall?.();
      },
    });
  };
  return showHtmlNotice({
    title,
    html,
    dedupeKey: error,
    fallbackText: typeof payload.error === 'string' && payload.error.trim()
      ? payload.error : '制品操作暂不可用，请稍后重试',
    allowedActions: allowReinstall ? ['reinstall'] : [],
    onAction: (action, { close }) => {
      if (action === 'reinstall' && allowReinstall) runReinstall(close);
    },
  });
}
