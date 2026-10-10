const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Apply only fields changed in the form; Kubernetes fields the form cannot show stay intact.
export function applyTemplateAppEdit(original, baseline, edited) {
    if (same(baseline, edited)) return copy(original);
    if (Array.isArray(baseline) && Array.isArray(edited)) {
        if (!Array.isArray(original)) return copy(edited);
        const named = baseline.every(item => object(item) && typeof item.name === 'string')
            && edited.every(item => object(item) && typeof item.name === 'string');
        if (named) {
            const old = new Map(baseline.map((item, index) => [item.name, { item, original: original[index] }]));
            return edited.map((item, index) => {
                const previous = baseline[index];
                const source = old.get(item.name)
                    || (baseline.length === edited.length && previous && !edited.some(next => next.name === previous.name)
                        ? { item: previous, original: original[index] } : null);
                return source ? applyTemplateAppEdit(source.original, source.item, item) : copy(item);
            });
        }
        if (baseline.length === edited.length) {
            return edited.map((item, index) => applyTemplateAppEdit(original[index], baseline[index], item));
        }
        return copy(edited);
    }
    if (object(baseline) && object(edited)) {
        const result = object(original) ? copy(original) : {};
        for (const key of Object.keys(baseline)) {
            if (!(key in edited)) delete result[key];
            else result[key] = applyTemplateAppEdit(result[key], baseline[key], edited[key]);
        }
        for (const key of Object.keys(edited)) {
            if (!(key in baseline)) result[key] = copy(edited[key]);
        }
        return result;
    }
    return copy(edited);
}
