<template>
    <div id="gpustackbox" class="padding-20 bg-white" style="height:calc(100vh - 146px)!important;transform:translate(0,0);"></div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import { bus, setupApp, preloadApp, startApp, destroyApp } from "wujie";
import { useNamespaceStore } from '@/store';
import { registerWujieEvent, clearAllWujieEvents } from '@/hooks/use-wujie-events';

export default {
    props: ['app'],
    data(){
        return {
            namespaceActive: '',
            info: {
                name: '',
                username: '',
                password: '',
            },
            menus: [],
            menuActive: '',
            selectMenu: [],
            // app: null,
            podList: [],
            domain: '',
            identifie: 'gpustack-backend',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        if(this.app){
            this.init();
        }
        
        // 注册 wujie 事件（自动处理空值检查）
        registerWujieEvent('createApp', this.createApp);
        registerWujieEvent('editApp', this.editApp);
        registerWujieEvent('deleteApp', this.deleteApp);
        registerWujieEvent('getPodList', this.sendPodList);
        registerWujieEvent('changeMenu', this.changeMenu);
        registerWujieEvent('changeReplicas', this.changeReplicas);
    },
    unmounted(){
        // 使用统一清理函数（自动处理空值检查）
        clearAllWujieEvents();
        try{
            destroyApp('gpustackbox')
        }catch{}
    },
    watch: {
        app(n,o){
            if(n){this.init()}
        }
    },
    methods: {
        async editApp(formData){
            console.log(formData)
            let {data} = await k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/statefulsets/"+formData.name)
            let resources = data.spec.template.spec.containers[0].resources;
            if(!resources){return}
            resources.limits = resources.limits || {};
            resources.limits.cpu = (formData.cpu || '0') + formData.cpuDw;
            resources.limits.memory = (formData.memory || '0') + 'Mi';
            resources.limits['nvidia.com/gpu'] = formData.gpuNumber;
            resources.limits['nvidia.com/gpucores'] = formData.gpuCompute;
            resources.limits['nvidia.com/gpumem'] = formData.gpuVm;
            resources.requests = resources.requests || {};
            resources.requests.cpu = (formData.cpu || '0') + formData.cpuDw;
            resources.requests.memory = (formData.memory || '0') + 'Mi';
            resources.requests['nvidia.com/gpu'] = formData.gpuNumber || '0';
            resources.requests['nvidia.com/gpucores'] = formData.gpuCompute || '0';
            resources.requests['nvidia.com/gpumem'] = formData.gpuVm || '0';
            k8sproxy.patch("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/statefulsets/"+formData.name,data,{
                headers: {'Content-Type': 'application/strategic-merge-patch+json'}
            }).then(res=>{
                this.$message.success("操作成功");
                this.sendPodList();
            });
        },
        changeReplicas(data){
            k8sproxy.patch("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/statefulsets/"+data.name,{spec:{replicas: data.replicas}},{
                headers: {'Content-Type': 'application/strategic-merge-patch+json'}
            }).then(res=>{
                this.$message.success("操作成功");
            });
        },
        changeMenu(v){
            this.menuActive = v;
            this.selectMenu = [v];
        },
        getPods(){
            return k8sproxy.get('/api/v1/namespaces/'+this.namespaceActive+'/pods?labelSelector='+encodeURIComponent('w7.cc/group-name='+this.app.metadata.name+',w7.cc/groupstack-worker=true')).then(async res=>{
                let list = res?.data?.items?.map(i=>{
                    let podips = i?.status?.podIPs?.map(i=>i.ip) || [];
                    return {
                        name: i.metadata.name,
                        hostIp: i?.status?.hostIP,
                        statusTxt: i?.status?.phase || '',
                        ip: podips.join(' , '),
                        workerName: i?.metadata?.labels?.['w7.cc/groupstack-worker-name'],
                    }
                });
                let names = [...new Set(list.map(i=>i.workerName))]
                for(let n in names){
                    let name = names[n];
                    try{
                        let {data} = await k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/statefulsets/"+name, {noAlert:true})
                        let replicas = data.spec.replicas;
                        let cpu = data?.spec?.template?.spec?.containers?.[0]?.resources?.limits?.cpu;
                        let memory = data?.spec?.template?.spec?.containers[0]?.resources?.limits?.memory;
                        if(/Gi$/.test(memory)){
                            memory = Number(memory.replace('Gi','')) * 1024;
                        }else if(/Mi$/.test(memory)){
                            memory = Number(memory.replace('Mi',''));
                        }
                        let convertStringToNumber = (str)=>{
                            str = String(str);
                            const isK = str.toLowerCase().endsWith('k');
                            const numStr = str.replace(/[a-zA-Z]/g, '');
                            let num = parseFloat(numStr);
                            if (isK) { num *= 1000; }
                            return num;
                        }
                        let gpuNumber = data?.spec?.template?.spec?.containers?.[0]?.resources?.requests?.['nvidia.com/gpu'] || 0;
                        let gpuVm = data?.spec?.template?.spec?.containers?.[0]?.resources?.requests?.['nvidia.com/gpumem'] || 0;
                        gpuVm = convertStringToNumber(gpuVm);
                        let gpuCompute = data?.spec?.template?.spec?.containers?.[0]?.resources?.requests?.['nvidia.com/gpucores'] || 0;
                        let form = {
                            cpu: cpu.replace(/m$/,''),
                            cpuDw: /m$/.test(cpu)? 'm' : '',
                            memory: memory,
                            gpuNumber,
                            gpuCompute,
                            gpuVm,
                        }
                        list.map(i=>{
                            if(i.workerName==name){
                                i.replicas = replicas;
                                i.form = form;
                            }
                        })
                    }catch{
                        list = list.filter(i=>i.workerName!=name);
                    }
                }
                return list;
            })
        },
        sendPodList(){
            this.getPods().then(list=>{
                bus.$emit("podList", list);
            })
        },
        init(){
            if(!this.app){return}
            let item = this.app;
            let appname = item.metadata.name;
            this.info = {
                ...this.info,
                frontendUrl: item?.spec?.frontendUrl,
// frontendUrl: 'http://localhost:8001',
                backendUrl: item?.spec?.backendUrl,
                username: item?.spec?.config?.props?.username,
                password: item?.spec?.config?.props?.password,
                appImage: item?.spec?.config?.props?.image,
            }

            let gpustackbox = this.$route.query?.gpustackbox;
            gpustackbox = gpustackbox? decodeURIComponent(gpustackbox) : '';
            gpustackbox = gpustackbox?.match(new RegExp('^'+this.info.frontendUrl+'(.*)$'))?.[1] || '';
            this.menuActive = gpustackbox || '';

            k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses?labelSelector=group='+appname).then(res=>{
                let i = res?.data?.items?.[0];
                let is_auto_ssl = i?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';
                let domain = i?.spec?.rules?.[0]?.host;
                this.domain = domain? ((is_auto_ssl?'https://':'http://') + domain) : '';
            }).then(()=>{
                this.$nextTick(()=>{
                    this.wujieInit();
                })
            })

            // k8sproxy.get('/apis/microapp.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/microapps?labelSelector=w7.cc/identifie='+ this.identifie +'&limit=500').then(res=>{
            //     if(!res?.data?.items?.[0]){
            //         // this.$router.push('/app/store?keyword=GPUSTACK');
            //         this.$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/gpustack_backend');
            //         return;
            //     }
            //     let item  = res?.data?.items?.[0];
            //     this.app = item;
            //     this.info = {
            //         ...this.info,
            //         frontendUrl: item?.spec?.frontendUrl,
            //         backendUrl: item?.spec?.backendUrl,
            //         username: item?.spec?.config?.props?.username,
            //         password: item?.spec?.config?.props?.password,
            //         appImage: item?.spec?.config?.props?.image,
            //     }
            //     return item.metadata.name
            // }).then((appname)=>{
            //     return k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses?labelSelector=group='+appname).then(res=>{
            //         let i = res?.data?.items?.[0];
            //         let is_auto_ssl = i?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';
            //         let domain = i?.spec?.rules?.[0]?.host;
            //         this.domain = domain? ((is_auto_ssl?'https://':'http://') + domain) : ''
            //     })
            // }).then(()=>{
            //     this.$nextTick(()=>{
            //         this.wujieInit();
            //     })
            // })
        },
        wujieInit(){
            console.log(this.info)
            setupApp({
                name: "gpustackbox",
                url: this.info.frontendUrl + this.menuActive,
                exec: true,
                el: '#gpustackbox',
                sync: true,
                props: {
                    url: /^\//.test(this.info.backendUrl)? window.location.origin + this.info.backendUrl : this.info.backendUrl,
                    Authorization: 'Basic '+ btoa(this.info.username+':'+this.info.password),
                    appImage: this.info.appImage,
                    domain: this.domain,
                },
            })
            startApp({name:'gpustackbox'})
        },
        deleteApp(v){
            let name = v.name; //?.replace(/\-\d+$/,'');
            if(!name){return}
            k8sproxy.delete("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/statefulsets/" + name).then(async res=>{
                if(!res?.data){return}
                this.$message.success('操作成功');
                this.sendPodList();
            })
        },
        createApp(formData){
            if(!this.app){return}
            let props = this.app?.spec?.config?.props;
            console.log(formData,props)
            panelApi.post('/gpu/gpustack/worker',{
                ...props,
                cpu: (formData.cpu || '0') + formData.cpuDw,
                memory: (formData.memory || '0') + 'Mi',
                gpucores: formData.gpuCompute || '0',
                gpu: formData.gpuNumber || '0',
                gpumem: formData.gpuVm || '0',
                runtimeClassName: formData.runtimeClassName,
                namespace: 'default',
            },{
                loading: true,
            }).then(res=>{
                this.$message.success('操作成功');
                this.sendPodList();
            })
        },
        changeKey(v){
            this.menuActive = v;
            bus.$emit("routeChange", v.replace(/^#/,''));
        },
        // parseMenu(menu) {
        //     const parentMenu = [];
        //     const menuMap = {};

        //     menu.forEach(item => {
        //         const newItem = {
        //             do: item.do,
        //             location: item.location || '',
        //             icon: item.icon || '',
        //             title: item.title,
        //             children: []
        //         };
        //         menuMap[item.do] = newItem;

        //         const parentPath = item.do.split('/').slice(0, -1).join('/');
        //         if (parentPath && menuMap[parentPath]) {
        //             menuMap[parentPath].children.push(newItem);
        //         } else {
        //             parentMenu.push(newItem);
        //         }
        //     });

        //     return parentMenu;
        // },
        // createName(length){
        //     let len = length || 8;
        //     let s = 'abcdefghijklmnopqrstuvwxyz';
        //     let p = '';
        //     for(var i=0; i<len; i++){
        //         p = p + s[parseInt(Math.random()*s.length)]
        //     }
        //     return p;
        // },
    }
}
</script>

<style>

.gpustack-detailmenu{width:100%;}
.gpustack-detailmenu .arco-tabs-nav{width:100px; padding-top:10px;}
</style>