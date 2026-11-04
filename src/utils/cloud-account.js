import { Modal, Message } from '@arco-design/web-vue';
import { panelApi } from '@/utils/api';
import router from '@/router';

let pendingCheck = null;

export function getCloudAccountBound(frontProps) {
    return typeof frontProps?.openid === 'string'
        ? Boolean(frontProps.openid.trim())
        : undefined;
}

export function openCloudAccountBinding() {
    return router.push({ name: 'person-account' });
}

// 每次操作检查最新绑定状态；并发调用共享检查和引导，不缓存绑定结果。
export function ensureCloudAccountBound() {
    if (pendingCheck) return pendingCheck;
    pendingCheck = (async () => {
        try {
            const response = await panelApi.get('/microapp/global-frontprops', { noAlert: true });
            const bound = getCloudAccountBound(response?.data);
            if (bound === true) return true;
            if (bound !== false) throw new Error('unknown cloud account binding status');
            await new Promise(resolve => {
                Modal.confirm({
                    title: '绑定云端账号',
                    content: '当前面板尚未绑定云端账号，请前往「个人中心 → 账号管理」完成绑定。',
                    okText: '前往绑定',
                    cancelText: '取消',
                    onOk: () => openCloudAccountBinding(),
                    onClose: () => resolve(),
                });
            });
            return false;
        } catch {
            Message.error('获取云端账号绑定状态失败，请稍后重试');
            return false;
        }
    })().finally(() => { pendingCheck = null; });
    return pendingCheck;
}
