import axios from "axios";
import { setFileEditor,setWebshell, setK8sinfo } from '@/utils/auth';
import { getPermission, setPermission, setUserInfo } from '@/utils/auth';
import { cacheManager, CachePresets } from '@/utils/cache';

const PERMISSION_CACHE_KEY = `${CachePresets.PERMISSION}:timestamp`;
const PERMISSION_CACHE_DURATION = 5 * 60 * 1000;

export default async function useK3kinfo(){
    let { data } = await axios.get('/panel-api/v1/k3k/info').then(res=>{
        let rData = res?.data;
        if(rData && rData.code === 200 && rData.data) {
            rData = rData.data;
        }
        setFileEditor(rData?.['w7.cc/file-editor']);
        setWebshell(rData?.['w7.cc/web-shell']);
        setK8sinfo(rData);
        // 为了向后兼容，返回包含正确 data 的 res
        res.data = rData;
        return res;
    })
    
    const shouldRefresh = () => {
        if (!getPermission()) return true;
        const cached = cacheManager.get<number>(PERMISSION_CACHE_KEY);
        if (!cached) return true;
        return Date.now() - cached > PERMISSION_CACHE_DURATION;
    };

    if (shouldRefresh()) {
        let arr = [];
        await axios.get('/panel-api/v1/auth/userinfo').then(res => {
            let uData = res.data;
            if(uData && uData.code === 200 && uData.data) {
                uData = uData.data;
            }
            setUserInfo(uData);
            arr = JSON.parse(uData?.['w7.cc/menu'] || '[]')
            if (uData?.['w7.cc/debug'] != 'true') {
                arr = arr.filter(i => i != 'cluster-resource');
            }
            setPermission(arr);
            cacheManager.set(PERMISSION_CACHE_KEY, Date.now(), {
                duration: PERMISSION_CACHE_DURATION,
                prefix: CachePresets.PERMISSION,
            });
        })
        await axios.get("/panel-api/v1/auth/console/info?code=test").then(res => {
            let cData = res.data;
            if(cData && cData.code === 200 && cData.data) {
                cData = cData.data;
            }
            let is_register = cData?.is_register;
            let license_type = cData?.license_type;

            let data = cData;
            if (data.cluster_id == "" && data.thirdparty_cd_token != "") {
                axios.post('/panel-api/v1/auth/console/register-to-console?offline_url=' + window.location.origin, {
                    offline_url: window.location.origin,
                    offlineUrl: window.location.origin,
                }).then(() => { }).catch(() => { })
            }

            if (!is_register) {
                arr = arr.filter(i => i != 'system-order-center' && i != 'system-cost-center')
            }
            if (license_type == 'free') {
                arr = arr.filter(i => i != 'system-user' && i != 'system-usergroup')
            }
            setPermission(arr);
            cacheManager.set(PERMISSION_CACHE_KEY, Date.now(), {
                duration: PERMISSION_CACHE_DURATION,
                prefix: CachePresets.PERMISSION,
            });
        });
    }

    return {data}
}