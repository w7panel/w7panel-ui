const resourceKinds = ['cpu', 'memory', 'gpu', 'bandwidth'];

export function isResourceParam(param: { type?: string }) {
    return resourceKinds.some(kind => param?.type === `resource-${kind}`);
}

export function resourceParamValue(param: { type?: string; value?: unknown }, noLimit: boolean) {
    return isResourceParam(param) && noLimit ? '' : String(param.value ?? '').trim();
}

export function resourceParamError(param: { type?: string; value?: unknown }, noLimit: boolean) {
    if (noLimit) return '';
    const value = resourceParamValue(param, false);
    if (!value) return '';
    const number = Number(value);
    if (!/^\d+(\.\d+)?$/.test(value) || !Number.isFinite(number) || number <= 0 || number > 1000000000) return '请输入有效正数，或留空表示不限制';
    if (param.type === 'resource-gpu' && !Number.isInteger(number)) return 'GPU 数量必须为正整数';
    if (param.type === 'resource-cpu' && Math.abs(number * 1000 - Math.round(number * 1000)) > 0.000001) return 'CPU 精度最多为 0.001 核';
    return '';
}
