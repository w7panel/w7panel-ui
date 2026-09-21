import { Message, Modal } from '@arco-design/web-vue';
import router from '@/router';
import { useNamespaceStore } from '@/store';
import { k8sproxy, panelApi } from '@/utils/api';
import { uninstallAppGroup } from '@/utils/appgroup';

const WUJIE_MODAL_HANDLE_MAP = {
    openFile: 'openFile',
    openApp: 'openApp',
    domainCert: 'setDomainCert',
    podLog: 'openPodLog',
    openPage: 'openPage',
    toStoreInstall: 'toStoreInstall',
    openStoreInstall: 'openStoreInstall',
    containerPlugin: 'openContainerPlugin',
    ingressEdit: 'openDomainEdit',
    ingressStrategy: 'openStrategy',
    toStoreInstallWithOrder: 'toStoreInstallWithOrder',
    module: 'openBuyServiceDialog',
    pay: 'openPay',
    getModuleVersion: 'getModuleVersion'
};

function normalizeAppIdentify(options = {}) {
    return String(options.appIdentify || options.app_identify || '').trim();
}

async function getUpgradeContext() {
    const response = await panelApi.get('/auth/console/info?code=test', { noAlert: true });
    return response?.data || {};
}

async function checkInstalledAppUpgrade(options = {}) {
    const appIdentify = normalizeAppIdentify(options);
    if (!appIdentify) {
        Message.warning('未获取到应用安装标识');
        return null;
    }

    try {
        const context = await getUpgradeContext();
        const response = await panelApi.get('/zpk/upgrade-info', {
            noAlert: true,
            params: {
                namespace: useNamespaceStore().namespace,
                releaseName: appIdentify,
                thirdpartyCDToken: context.thirdparty_cd_token || '',
            },
        });
        return response?.data || null;
    } catch (error) {
        if (!options.silent) {
            Message.error('升级检测失败，请稍后重试');
        }
        throw error;
    }
}

async function openInstalledAppUpgrade(options = {}) {
    const appIdentify = normalizeAppIdentify(options);
    const upgrade = options.upgrade || {};
    if (!appIdentify || !upgrade.zpkUrl) {
        Message.warning('缺少插件升级信息');
        return false;
    }

    try {
        const context = await getUpgradeContext();
        const query = {
            path: upgrade.zpkUrl,
            releasename: appIdentify,
        };
        if (options.domain) { query.domain = options.domain; }
        if (context.thirdparty_cd_token) { query.thirdpartyCDToken = context.thirdparty_cd_token; }
        if (context.cluster_id) { query.insClusterId = context.cluster_id; }
        await router.push({ path: '/app/store-install', query });
        return true;
    } catch (error) {
        Message.error('打开升级页面失败，请稍后重试');
        throw error;
    }
}

async function uninstallInstalledApp(options = {}) {
    const appIdentify = normalizeAppIdentify(options);
    if (!appIdentify) {
        Message.warning('未获取到应用安装标识');
        return false;
    }

    const confirm = () => new Promise((resolve) => {
        Modal.confirm({
            title: '确认卸载',
            content: `确定要卸载应用“${options.name || appIdentify}”吗？`,
            okText: '确认卸载',
            cancelText: '取消',
            okButtonProps: { status: 'danger' },
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
        });
    });

    try {
        const result = await uninstallAppGroup(
            k8sproxy,
            useNamespaceStore().namespace,
            appIdentify,
            { confirm },
        );
        if(result.cancelled){return false}
        const dependentCount = result.plan.dependentItems.length;
        Message.success(dependentCount
            ? `卸载成功，已一并卸载 ${dependentCount} 个依赖应用`
            : '卸载成功');
        return true;
    } catch(error) {
        Message.error(error?.message || '卸载失败，请稍后重试');
        throw error;
    }
}

function createInstalledAppHandles() {
    return {
        checkInstalledAppUpgrade,
        openInstalledAppUpgrade,
        uninstallInstalledApp,
    };
}

export function createWujieModalHandles(getModal) {
    return Object.entries(WUJIE_MODAL_HANDLE_MAP).reduce((handles, [eventName, methodName]) => {
        handles[eventName] = (...args) => {
            const modal = typeof getModal === 'function' ? getModal() : getModal;
            const handler = modal?.[methodName];
            if(typeof handler !== 'function'){
                console.warn(`[wujie-modals] missing handle: ${methodName}`);
                return;
            }
            return handler.apply(modal, args);
        };
        return handles;
    }, {});
}

export function appendWujieModalHandles(props, getModal) {
    props.handles = {
        ...(props.handles || {}),
        ...createWujieModalHandles(getModal),
        ...createInstalledAppHandles(),
    };
    return props;
}
