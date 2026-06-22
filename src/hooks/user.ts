import { useRouter } from 'vue-router';
import Message from '@arco-design/web-vue/es/message';
import { clearToken } from '@/utils/auth';

export default function useUser() {
    const router = useRouter();
    const logout = async () => {
        clearToken();
        Message.success('登出成功');
        router.push('/login');
    };
    return {
        logout,
    };
}
