import axios from 'axios';
import { buildApiPath } from '@/config/api';

export function login(data: any) {
    return axios.post(buildApiPath('AUTH_LOGIN'), data, { timeout: 10000 });
}

export function getUserInfo() {
    return axios.get(buildApiPath('CLUSTER_K3K_INFO').replace('/k3k/info', '/userinfo'));
}

export function resetPasswordCurrent(data: any) {
    return axios.post(buildApiPath('AUTH_RESET_PASSWORD'), data);
}

export function refreshToken(token: string) {
    return axios.post(buildApiPath('AUTH_REFRESH_TOKEN'), { token });
}
