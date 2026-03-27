<template>
    <div>
        <!-- 数据卷 -->
        <app-form-volumes
            :data="data"
            :isPlugin="true"
            :pluginData="pluginData"
            @submit="v=>{volumes=v.volumes;volumeClaimTemplates=v.volumeClaimTemplates;}"
        ></app-form-volumes>
        
        <!-- 容器 -->
        <app-form-container
            ref="appformcontainer"
            :data="data"
            :volumes="volumes"
            :volumeClaimTemplates="volumeClaimTemplates"
            :mirror="mirror"
            :isPlugin="true"
            :pluginData="pluginData"
            @getMirror="getMirror"
            @editMirror="v=>{createImage.name=v;createImage.show=true;}"
            @delMirror="delMirror"
        ></app-form-container>
        
        <imageform-drawer :show="createImage.show" :id="createImage.name" @submit="createImage.submit" @close="createImage.show=false;"></imageform-drawer>
    </div>
</template>
<script>
import appFormVolumes from '@/components/app-form-volumes.vue';
import appFormContainer from '@/components/app-form-container.vue';
import imageformDrawer from '@/views/config/sercet/imageform-drawer.vue';
import { useNamespaceStore } from '@/store';
import { k8sproxy } from '@/utils/api';
import { getToken } from '@/utils/auth';

const dataTemplate = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
        name: 'my-deployment',
        labels: {
            app: 'my-app'
        }
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                app: 'my-app'
            }
        },
        template: {
            metadata: {
                labels: {
                    app: 'my-app'
                }
            },
            spec: {
                containers: [{
                    name: 'my-container',
                    image: 'nginx:latest',
                    ports: [{
                        containerPort: 80
                    }]
                }],
                imagePullSecrets: [{"name": ""}]
            }
        }
    }
}

export default{
    data(){
        return {
            data: {},
            volumes: [],
            volumeClaimTemplates: [],
            mirror: [],
            namespaceActive: 'default',
            createImage: {
                show: false,
                name: '',
                submit: ()=>{ this.getMirror(); }
            },
            token: '',
            pluginData: {},
            wujieId: '',
        }
    },
    async created(){
        this.wujieId = window?.__WUJIE?.id;
        if(window.__POWERED_BY_WUJIE__ && window?.$wujie?.props?.paneltoken){
            this.token = window.$wujie.props.paneltoken;
        }else{
            this.token = getToken();
        }
        this.namespaceActive = useNamespaceStore().namespace;
        await this.getMirror();
        this.init();
        
        window.$wujie?.bus.$on("submit"+this.wujieId, this.submit);
        window.$wujie?.bus.$on("changeData"+this.wujieId, this.changeData);
    },
    beforeUnmount(){
        window.$wujie?.bus.$off("submit"+this.wujieId, this.submit);
        window.$wujie?.bus.$off("changeData"+this.wujieId, this.changeData);
    },
    components: {
        appFormVolumes,
        appFormContainer,
        imageformDrawer,
    },
    methods: {
        init(){
            this.data = JSON.parse(JSON.stringify(dataTemplate));
            if(window.$wujie?.props?.pluginData){
                this.pluginData = window.$wujie.props.pluginData;
            }
            if(window.$wujie?.props?.containers){
                this.data.spec.template.spec.containers = window.$wujie.props.containers;
            }
            if(window.$wujie?.props?.initContainers){
                this.data.spec.template.spec.initContainers = window.$wujie.props.initContainers;
            }
            if(window.$wujie?.props?.volumes){
                if(this.data?.spec?.template?.spec){
                    this.data.spec.template.spec.volumes = window.$wujie.props.volumes;
                }
            }
        },
        changeData({containers,initContainers,volumes}){
            if(containers){
                this.data.spec.template.spec.containers = containers;
            }
            if(initContainers){
                this.data.spec.template.spec.initContainers = initContainers;
            }
            if(volumes){
                if(this.data?.spec?.template?.spec){
                    this.data.spec.template.spec.volumes = volumes;
                }
            }
            this.data = JSON.parse(JSON.stringify(this.data));
        },
        submit(callback){
            let {
                initContainers,
                containers,
                hostPorts, // 暴露端口
                imagePullSecrets, // 镜像仓库
                pluginData,
            } = this.$refs.appformcontainer.formToData();
            console.log('panel callback',{initContainers, containers, hostPorts, imagePullSecrets, pluginData})
            callback({
                initContainers,
                containers,
                hostPorts, // 暴露端口
                imagePullSecrets, // 镜像仓库
                volumes: this.volumes,
                volumeClaimTemplates: this.volumeClaimTemplates,
                pluginData,
            });
        },
        
        getMirror(){
            return k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets?fieldSelector=type=kubernetes.io/dockerconfigjson',{
                customToken: this.token,
            }).then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    let dockerconfigjson = {};
                    if(i?.data['.dockerconfigjson']){
                        let dj = {}
                        try{
                            dj = JSON.parse(atob(i?.data['.dockerconfigjson']));
                        } catch(e){}
                        if(dj?.auths){
                            let o = Object.keys(dj?.auths).map(i=>({
                                host: i,
                                username: dj?.auths[i]?.username || '',
                                password: dj?.auths[i]?.password || '',
                            }));
                            o.length && (dockerconfigjson = o[0]);
                        }
                    }

                    return {
                        label: dockerconfigjson.host || i?.metadata?.name || '',
                        namespace: atob(i?.data?.namespace || ''),
                        value: i?.metadata?.name || '',
                    }
                });
                
                this.mirror = [
                    {label: '无', value:'', namespace: ''},
                    ...list,
                ]
            })
        },
        
        delMirror(name){
            k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/secrets/"+name,{
                customToken: this.token,
                loading:true
            }).then(res=>{
                if(!res?.data){return}
                this.$message.success('删除成功');
                this.getMirror();
            })
        },
    }
}
</script>
<style scoped>
</style>