export function nodeTlsSans(node) {
    let args;
    try {
        args = JSON.parse(node?.metadata?.annotations?.['k3s.io/node-args'] || '[]');
    } catch {
        return [];
    }
    if (!Array.isArray(args)) return [];
    return args.flatMap((arg, index) => {
        if (arg === '--tls-san') return [args[index + 1]];
        if (typeof arg === 'string' && arg.startsWith('--tls-san=')) return [arg.slice(10)];
        return [];
    }).filter(address => typeof address === 'string' && address && !address.startsWith('--'));
}
