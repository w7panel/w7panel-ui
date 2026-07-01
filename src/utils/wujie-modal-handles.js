const WUJIE_MODAL_HANDLE_MAP = {
    openFile: 'openFile',
    domainCert: 'setDomainCert',
    podLog: 'openPodLog',
    openPage: 'openPage',
    toStoreInstall: 'toStoreInstall',
    containerPlugin: 'openContainerPlugin',
    ingressEdit: 'openDomainEdit',
    ingressStrategy: 'openStrategy',
    toStoreInstallWithOrder: 'toStoreInstallWithOrder'
};

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
    };
    return props;
}
