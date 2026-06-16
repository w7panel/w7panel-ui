const HISTORY_STATE_PATCH_FLAG = '__W7_PRESERVE_HISTORY_STATE__';

const ROUTER_STATE_KEYS = [
    'back',
    'current',
    'forward',
    'replaced',
    'position',
    'scroll',
];

const isRecord = (value: unknown): value is Record<string, unknown> => (
    value !== null && typeof value === 'object'
);

const hasRouterState = (value: unknown) => (
    isRecord(value) && ROUTER_STATE_KEYS.every((key) => key in value)
);

const preserveHistoryState = (nextState: unknown) => {
    const currentState = window.history.state;

    if(nextState == null){
        return currentState ?? nextState;
    }

    if(isRecord(nextState) && hasRouterState(currentState)){
        return {
            ...(currentState as Record<string, unknown>),
            ...nextState,
        };
    }

    return nextState;
};

const installPreserveHistoryState = () => {
    const win = window as unknown as Record<string, unknown>;
    if(win[HISTORY_STATE_PATCH_FLAG]){
        return;
    }

    win[HISTORY_STATE_PATCH_FLAG] = true;

    const rawReplaceState = window.history.replaceState.bind(window.history);
    const rawPushState = window.history.pushState.bind(window.history);

    window.history.replaceState = ((state: unknown, title: string, url?: string | URL | null) => (
        rawReplaceState(preserveHistoryState(state), title, url)
    )) as History['replaceState'];

    window.history.pushState = ((state: unknown, title: string, url?: string | URL | null) => (
        rawPushState(preserveHistoryState(state), title, url)
    )) as History['pushState'];
};

if(typeof window !== 'undefined'){
    installPreserveHistoryState();
}
