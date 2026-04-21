<template>
    <a-form auto-label-width>
        <div class="title">基本信息</div>
        <a-form-item label="应用类型">
            <div class="df ai-c">
                <a-radio-group v-model="kind">
                    <a-radio value="deployments" >
                        <template #radio="{checked,disabled}">
                            <div class="app-type-custom-label" :class="{'custom-radio-card-checked':checked, 'custom-radio-card-disabled':disabled }">无状态应用</div>
                        </template>
                    </a-radio>
                    <a-radio value="statefulsets">
                        <template #radio="{checked,disabled}">
                            <div class="app-type-custom-label" :class="{'custom-radio-card-checked':checked, 'custom-radio-card-disabled':disabled }">有状态应用</div>
                        </template>
                    </a-radio>
                    <a-radio value="daemonsets">
                        <template #radio="{checked,disabled}">
                            <div class="app-type-custom-label" :class="{'custom-radio-card-checked':checked, 'custom-radio-card-disabled':disabled }">守护进程应用</div>
                        </template>
                    </a-radio>
                </a-radio-group>
            </div>
        </a-form-item>
        <!-- 数据卷 -->
        <app-form-volumes
            :data="data"
            :isPlugin="true"
            :kind="kind"
            :pluginData="pluginData"
            @submit="v=>{volumes=v.volumes;volumeClaimTemplates=v.volumeClaimTemplates;}"
        ></app-form-volumes>
        
        <div class="title">容器（Containers）</div>
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
    </a-form>
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

            kind: 'deployments',
            types: {
                'deployments': 'Deployment',
                'statefulsets': 'StatefulSet',
                'daemonsets': 'DaemonSet',
            }
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
                if(this.pluginData.kind){
                    this.kind = this.pluginData.kind.toLowerCase() + 's';
                }
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
            if(window.$wujie?.props?.volumeClaimTemplates){
                if(this.data?.spec?.template?.spec){
                    this.data.spec.template.spec.volumeClaimTemplates = window.$wujie.props.volumeClaimTemplates;
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
                pluginData: {
                    ...pluginData,
                    kind: this.types[this.kind],
                },
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

.title{font-size:16px; padding:10px; border-bottom:1px solid var(--color-neutral-3);margin-bottom:20px;}

.app-type-custom-label{padding:8px 20px; border:1px solid var(--color-border-2); border-radius: 4px;}
.app-type-custom-label.custom-radio-card-checked{ color:rgb(var(--primary-6)); border-color:rgb(var(--primary-6)); background-color:var(--color-primary-light-1);}
.app-type-custom-label.custom-radio-card-disabled{opacity: 0.8; color: var(--color-text-3);}
.app-type-custom-label.custom-radio-card-checked.custom-radio-card-disabled{border-color:var(--color-primary-light-3);}

</style>