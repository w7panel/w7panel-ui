import { Checkbox, Message, Modal } from '@arco-design/web-vue';
import { h } from 'vue';
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
    systemTemplateAppForm: 'openSystemTemplateAppForm',
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

export async function uninstallInstalledApp(options = {}) {
    const appIdentify = normalizeAppIdentify(options);
    if (!appIdentify) {
        Message.warning('未获取到应用安装标识');
        return false;
    }

    const namespace = options.namespace || useNamespaceStore().namespace;
    const confirm = async (plan) => {
        const checks = await Promise.all(plan.items.map(async item => {
            const response = await panelApi.post('/zpk/crds/uninstall-check', {
                namespace, releaseName: item.name,
            }, { noAlert: true });
            return response?.data || {};
        }));
        const names = [...new Set(checks.flatMap(item => item.names || []))];
        const risks = checks.flatMap(item => item.risks || []);
        const canDelete = checks.every(item => item.canDelete);
        let deleteCrds = names.length > 0 && canDelete;
        const dependents = plan.dependentItems.map(item => `${item.title || item.name}（${item.name}）`);
        const accepted = options.alreadyConfirmed && !names.length && !dependents.length ? true : await new Promise(resolve => Modal.confirm({
			title: options.alreadyConfirmed ? '卸载附加确认' : '确认卸载',
            content: h('div', [
                h('p', options.alreadyConfirmed
                    ? (names.length ? '请确认以下 CRD 清理选项。' : '请确认是否一并卸载以下依赖应用。')
                    : `确定要卸载应用“${options.name || appIdentify}”吗？`),
                dependents.length ? h('p', `以下依赖应用也会卸载：${dependents.join('、')}`) : null,
                names.length ? h(Checkbox, {
                    defaultChecked: canDelete,
                    disabled: !canDelete,
                    onChange: checked => { deleteCrds = checked; },
                }, { default: () => `同时删除应用数据库（CRD 及其所有自定义资源：${names.join('、')}）` }) : null,
                names.length && !canDelete ? h('p', '当前账号无权删除集群级 CRD，卸载后将保留 CRD 和自定义资源。') : null,
            ]),
            okText: options.alreadyConfirmed ? '继续卸载' : '确认卸载',
            cancelText: '取消',
            okButtonProps: { status: 'danger' },
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
        }));
        if(!accepted){return false}
        let forceSharedCrds = false;
        if(deleteCrds && risks.length){
            forceSharedCrds = await new Promise(resolve => Modal.confirm({
                title: '确认删除共享 CRD',
                content: `删除 CRD 会删除该类型在整个集群中的所有自定义资源，可能影响其他应用。检测到：${risks.join('；')}。仍要继续吗？`,
                okText: '强制删除',
                cancelText: '返回',
                okButtonProps: { status: 'danger' },
                onOk: () => resolve(true),
                onCancel: () => resolve(false),
            }));
            if(!forceSharedCrds){return false}
        }
        if(deleteCrds){
            await panelApi.post('/zpk/crds/prepare-uninstall', {
                namespace,
                releaseName: plan.rootName,
                releaseNames: plan.items.map(item => item.name),
                forceSharedCrds,
            }, { noAlert: true });
        }
        return { deleteCrds };
    };

    try {
        const result = await uninstallAppGroup(
            k8sproxy,
            namespace,
            appIdentify,
            {
                confirm,
                deleteItem: async (item, choice) => {
                    await panelApi.post('/zpk/crds/uninstall', {
                        namespace,
                        releaseName: item.name,
                        preservePrepared: choice.deleteCrds && item.name === appIdentify,
                    }, { noAlert: true });
                },
            },
        );
        if(result.cancelled){return false}
        const dependentCount = result.plan.dependentItems.length;
        if(!options.silentSuccess){
            Message.success(dependentCount
                ? `卸载成功，已一并卸载 ${dependentCount} 个依赖应用`
                : '卸载成功');
        }
        return options.returnResult ? result : true;
    } catch(error) {
        if(!options.silentError){Message.error(error?.response?.data?.error || error?.message || '卸载失败，请稍后重试')}
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

export function appendWujieModalHandles(props, getModal, appDynamicHandles = {}) {
    const { getAppDynamicValues, validateApp } = appDynamicHandles;
    props.handles = {
        ...(props.handles || {}),
        ...createWujieModalHandles(getModal),
        ...createInstalledAppHandles(),
        ...(typeof getAppDynamicValues === 'function' ? { getAppDynamicValues } : {}),
        ...(typeof validateApp === 'function' ? { validateApp } : {}),
    };
    return props;
}
