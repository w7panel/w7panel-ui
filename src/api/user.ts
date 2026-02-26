import axios from 'axios';
import { buildApiPath } from '@/config/api';

export function login(data: any) {
    let str = 'username=' + data.username + '&password=' + data.password + '&point=' + data.point + '&key=' + data.key;
    return axios.post(buildApiPath('AUTH_LOGIN'), str, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
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
