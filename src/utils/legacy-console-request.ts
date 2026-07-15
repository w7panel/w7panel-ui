import type { AxiosRequestConfig } from 'axios';

export function legacyConsoleRequestConfig(
    config: AxiosRequestConfig = {}
): AxiosRequestConfig {
    const { headers, ...rest } = config;

    return {
        baseURL: '',
        withCredentials: true,
        ...rest,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            ...(headers || {}),
        },
    };
}
