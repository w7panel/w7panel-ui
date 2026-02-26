<template>
    <div>
        <div v-show="fileCache.exist" id="filecachemicroapp"></div>
        <div v-show="!fileCache.exist" class="mt-40 df df-c ai-c">
            <div>文件缓存应用未安装</div>
            <div class="mt-20">
                <a-button type="primary" @click="$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/w7_cdncache')">去安装</a-button>
            </div>
        </div>
    </div>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import { useNamespaceStore } from '@/store';
import { bus, setupApp, preloadApp, startApp, destroyApp } from "wujie";
import { getToken} from '@/utils/auth';
import { registerWujieEvent, clearAllWujieEvents } from '@/hooks/use-wujie-events';

export default{
    props: ['data','activeName'],
    data(){
        return {
            namespaceActive: '',
            inRvproxy: false,
            fileCache: {
                open: false,
                exist: false,
                show: false,
                backendUrl: '',
            },
            fileCacheApp: null,
            allAgent: [],
            
            microappInfo: {
                frontendUrl: '',
                backendUrl: '',
                username: '',
                password: '',
                domain: '',
            },
            appData: {},
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.inRvproxy = this.$route.name == 'app-rvproxy-domain';
        
        // 注册 wujie 事件（自动处理空值检查）
        registerWujieEvent("submit", this.submitFileCache);
        registerWujieEvent("close", this.close);
    },
    mounted(){
        this.init();
    },
    watch: {
        data: 'init',
        activeName(){
            if(this.activeName=='fileCache'){
                this.wujieInit();
            }else{
                try{
                    destroyApp('filecachemicroapp');
                }catch{}
            }
        },
    },
    beforeUnmount(){
        try{
            destroyApp('filecachemicroapp');
        }catch{}
        // 使用统一清理函数（自动处理空值检查）
        clearAllWujieEvents();
    },
    methods: {
        init(){
            this.getData();
            this.testFileCache();
        },
        getData(){
            if(!this.data){return}
            this.appData = JSON.parse(JSON.stringify(this.data?.metadata?.annotations||{}));
        },
        testFileCache(){
            if(!this.data||!Object.keys(this.data).length){return}
            k8sproxy.get('/apis/microapp.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/microapps?labelSelector=w7.cc/identifie=w7-cdncache',{loading:true}).then(res=>{
                if(!res?.data){return Promise.reject();}
                let app = res?.data?.items?.[0];
                if(!app || !app.spec){return}
                this.fileCacheApp = app;
                
                this.getAllAgent();
                this.fileCache = {
                    ...this.fileCache,
                    open: this.data.metadata?.annotations?.['w7.cc/filecache'] == 'true',
                    ingressHost: this.data?.spec?.rules?.[0]?.host,
                    backendUrl: app.spec.backendUrl,
                    exist: true,
                    show: false,
                    token: app?.spec?.config?.props?.OAUTH_TOKEN,
                    // noreplace: this.data?.metadata?.annotations?.['w7.cc/not-replace'] !== 'true',
                    destination: this.data?.metadata?.annotations?.['higress.io/destination'] || '',
                };
                
                this.microappInfo = {
                    ...this.microappInfo,
                    frontendUrl: app?.spec?.frontendUrl + '#/cache/' +  this.fileCache.ingressHost,
// frontendUrl: 'http://218.23.2.55:9090' + app?.spec?.frontendUrl + '#/cache/' +  this.fileCache.ingressHost,
                    backendUrl: app?.spec?.backendUrl,
                    username: app?.spec?.config?.props?.username,
                    password: app?.spec?.config?.props?.password,
                    appImage: app?.spec?.config?.props?.image,
                }
                    
            }).catch(()=>{})
        },
        
        wujieInit(){
            if(!this.fileCache.exist){return}

            let endpoint = '';
            let rewrite_path = '';
            let rewrite_host = '';
            let path_match_type = '';
            
            if(this.data?.metadata?.annotations?.['higress.io/enable-rewrite']=='true'){
                rewrite_host = this.data?.metadata?.annotations?.['higress.io/upstream-vhost'];
                rewrite_path = this.data?.metadata?.annotations?.['higress.io/rewrite-target'];
            }

            if(this.inRvproxy){
                let find = this.allAgent.find(i=>i.name == this.data?.metadata?.labels?.['destination'] );
                if(find){
                    endpoint = find?.host || [];
                    
                    const protocol = find?.protocol? (find?.protocol?.toLowerCase()+'://') : '';
                    const port = (find?.port==80||!find?.port)? '' : (':'+find.port);
                    
                    endpoint = endpoint.map(domain => `${protocol}${domain}${port}`)?.join(',');
                }
            }else{
                let backend = null;
                if(this.appData['w7.cc/origin-config']){
                    backend = JSON.parse(this.appData['w7.cc/origin-config'])
                }else{
                    backend = this.data?.spec?.rules?.[0]?.http?.paths?.[0]?.backend;
                }
                endpoint = 'http://' + backend?.service?.name + '.' + this.namespaceActive + '.svc:' + backend?.service?.port?.number;
            }

            path_match_type = this.data?.spec?.rules?.[0]?.http?.paths?.[0]?.pathType;
            path_match_type = path_match_type=='Prefix'? (this.data?.metadata?.annotations?.['higress.io/use-regex']=='true'?'ImplementationSpecific':'Prefix') : path_match_type;
            path_match_type = {Prefix:'prefix',Exact:'exact',ImplementationSpecific:'regex'}[path_match_type];
            
            setupApp({
                name: "filecachemicroapp",
                url: this.microappInfo.frontendUrl
                    + '?path_prefix=' + encodeURIComponent(this.data?.spec?.rules?.[0]?.http?.paths?.[0]?.path)
                    + '&endpoint=' + encodeURIComponent(endpoint)
                    + '&rewrite_host=' + encodeURIComponent(rewrite_host)
                    + '&rewrite_path=' + encodeURIComponent(rewrite_path)
                    + '&ingress_name=' + encodeURIComponent(this.data?.metadata?.name)
                    + '&path_match_type=' + encodeURIComponent(path_match_type),
                exec: true,
                el: '#filecachemicroapp',
                sync: true,
                props: {
                    url: (/^\//.test(this.microappInfo.backendUrl)? window.location.origin : '') + this.microappInfo.backendUrl,
                    Authorization: 'Basic '+ btoa(this.microappInfo.username+':'+this.microappInfo.password),
                    appImage: this.microappInfo.appImage,
                    domain: this.microappInfo.domain,
                    OAUTH_TOKEN: this.fileCache.token,
                    fileCacheOpen: this.fileCache.open,
                    paneltoken: getToken(),
                },
            })
            startApp({name:'filecachemicroapp'})
        },
        getAllAgent(){
            if(!this.inRvproxy){return}
            k8sproxy.get('/apis/networking.higress.io/v1/namespaces/'+this.namespaceActive+'/mcpbridges').then(res=>{
                let data = res?.data?.items || [];
                let list = [];
                data.filter(i=>i.metadata.name!='default').map(i=>{
                    let sr = i.spec?.registries || {};
                    let host = [];
                    let labels = [];
                    sr.map(i=>{
                        let h = i.domain.split(',').map(i=>i?.trim()).filter(i=>i)
                        host=host.concat(h);
                        labels.push(i.name+'.'+i.type);
                        list.push({
                            // title: i.title,
                            domain: i.domain,
                            host: host,
                            port: i.port,
                            protocol: i.protocol,
                            name: i.name,
                            type: i.type,
                        })
                    });
                })
                this.allAgent = list;
                // console.log('allAgent',this.allAgent)
            })
        },
        
        submitFileCache(open){
            if(open?.from && open.from!=='file-cache'){ return }
            this.fileCache.open = typeof open == 'boolean'? open : open.open;

            let operations = [];
            if(!this.fileCache.open){
                if(this.appData['w7.cc/origin-config']){
                    operations.push({
                        op: 'replace',
                        path: '/spec/rules/0/http/paths/0/backend',
                        value: JSON.parse(this.appData['w7.cc/origin-config'])
                    })
                    operations.push({
                        op: 'remove',
                        path: '/metadata/annotations/w7.cc~1origin-config',
                    })
                }
                
                if(this.appData['w7.cc/rewrite-config']){
                    let json = JSON.parse(this.appData['w7.cc/rewrite-config'])

                    operations.push({
                        op: 'remove',
                        path: '/metadata/annotations/w7.cc~1rewrite-config',
                    })
                    operations.push({
                        op: 'replace',
                        path: '/metadata/annotations/higress.io~1enable-rewrite',
                        value: json?.['higress.io/enable-rewrite'] || 'false',
                    })
                    operations.push({
                        op: 'replace',
                        path: '/metadata/annotations/higress.io~1rewrite-target',
                        value: json?.['higress.io/rewrite-target'] || '',
                    })
                    operations.push({
                        op: 'replace',
                        path: '/metadata/annotations/higress.io~1upstream-vhost',
                        value: json?.['higress.io/upstream-vhost'] || '',
                    })
                }
                operations.push({
                    op: 'replace',
                    path: '/metadata/annotations/w7.cc~1filecache',
                    value: 'false',
                })
            }else{
                if(!this.appData['w7.cc/origin-config']){
                    operations.push({
                        op: 'replace',
                        path: '/metadata/annotations/w7.cc~1origin-config',
                        value: JSON.stringify(this.data?.spec?.rules?.[0]?.http?.paths?.[0]?.backend),
                    })
                }
                
                if(this.appData['higress.io/enable-rewrite']=='true'){
                    operations.push({
                        op: 'replace',
                        path: '/metadata/annotations/w7.cc~1rewrite-config',
                        value: JSON.stringify({
                            'higress.io/enable-rewrite': this.appData['higress.io/enable-rewrite'],
                            'higress.io/rewrite-target': this.appData['higress.io/rewrite-target'],
                            'higress.io/upstream-vhost': this.appData['higress.io/upstream-vhost'],
                        })
                    })
                    operations.push({
                        op: 'replace',
                        path: '/metadata/annotations/higress.io~1enable-rewrite',
                        value: 'false',
                    })
                    operations.push({
                        op: 'replace',
                        path: '/metadata/annotations/higress.io~1rewrite-target',
                        value: '',
                    })
                    operations.push({
                        op: 'replace',
                        path: '/metadata/annotations/higress.io~1upstream-vhost',
                        value: '',
                    })
                }
                operations.push({
                    op: 'replace',
                    path: '/spec/rules/0/http/paths/0/backend',
                    value: {
                        service:{
                            name: this.fileCacheApp?.spec?.config?.props?.serviceName,
                            port:{
                                number: Number(this.fileCacheApp?.spec?.config?.props?.servicePort)
                            }
                        }
                    },
                })
                operations.push({
                    op: 'replace',
                    path: '/metadata/annotations/w7.cc~1filecache',
                    value: 'true',
                })
            }
            this.$emit('submit',operations);
        },
        
        close(){
            this.$emit('cancel');
        },
    }
}
</script>
<style scoped>
</style>
