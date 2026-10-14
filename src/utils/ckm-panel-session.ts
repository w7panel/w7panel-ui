import { getToken } from './auth';

export const CKM_SESSION_ACTIVE = 'w7panel-ckm-session-active';
export const CKM_SESSION_PREFIX = 'w7panel-ckm-session:';

export function createOpenCkmPanel() {
    return async ({ namespace, name, k8sToken, navigate = true }) => {
        const key = `${CKM_SESSION_PREFIX}${namespace}/${name}`;
        if (!navigate && sessionStorage.getItem(CKM_SESSION_ACTIVE) !== key) throw new Error('子面板已切换或关闭');
        const response = await fetch('/panel-api/v1/auth/ckm-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ namespace, name, k8sToken }),
            credentials: 'omit',
        });
        if (!response.ok) {
            if (response.status === 404) throw new Error('宿主面板版本不支持 CKM 会话登录，请升级 Server');
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || error.msg || '无法创建 CKM 面板会话');
        }
        const session = await response.json();
        if (!session.token || !session.expiresAt) throw new Error('面板会话响应无效，请检查宿主版本');
        if (!navigate && sessionStorage.getItem(CKM_SESSION_ACTIVE) !== key) throw new Error('子面板已切换或关闭');
        const oldKey = sessionStorage.getItem(CKM_SESSION_ACTIVE);
        if (oldKey && oldKey !== key) {
            sessionStorage.removeItem(oldKey);
            Object.keys(localStorage).filter(k => k.startsWith(oldKey + ':')).forEach(k => localStorage.removeItem(k));
        }
        sessionStorage.setItem(key, JSON.stringify({ ...session, namespace, name }));
        sessionStorage.setItem(CKM_SESSION_ACTIVE, key);
        if (navigate) {
            const appmicro = '{index}panel.html?ckm-session=1&ckm-item=%2Fcluster%2Fpanel';
            window.location.assign('/appgroup/w7panel-ckm-root/micro?showMenu=false&appmicro=' + encodeURIComponent(appmicro));
        }
        return session;
    };
}
