<template>
    <div class="padding-20">
        <div>
            <a-input v-model="microUrlInput" placeholder="请输入" style="width:500px;"></a-input>
            <a-button type="primary" @click="setUrl(microUrlInput)">确定</a-button>
            <span class="c-blue cursor ml-20" @click="setUrl()">清除地址</span>
        </div>
        <div class="mt-10" style="height:100%;border:1px solid #999;">
            <micro-app
                v-if="microUrl"
                name='examcentertest'
                :url="microUrl"
                :baseroute="baseRoute"
                :data="microData"
                router-mode='native'
                destroy
            ></micro-app>
        </div>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import microApp from '@micro-zoe/micro-app'

import { useNamespaceStore } from '@/store';

export default {
    props: ['data','allYaml'],
    data(){
        return {
            show: true,
            microUrlInput: '',
            microUrl: '',
            baseRoute: '',
            namespaceActive: '',
            microData: {
                cd: {
                    info:{
                        env: this?.data?.spec?.template?.spec?.containers[0]?.env || [],
                    },
                    getApps:()=>{
                        return this.allYaml || [];
                    },
                    createDomain:(v)=>{
                        return this.createDomain(v);
                    }
                }
            },
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.baseRoute = '/app/deployments/'+this.$route.params.id+'/microtest'
        if(sessionStorage.getItem('microTestUrl')){
            this.microUrlInput = this.microUrl = sessionStorage.getItem('microTestUrl');
        }
    },
    mounted(){
        microApp.start()
    },
    watch:{
        $route(v){
            if(v.name == 'app-detail-microtest'){
                microApp.setData('examcentertest', {
                    type:'route',
                    data: v.fullPath.replace(/^\/app\/deployments\/[^/]+\/micro/,''),
                    ...this.microData,
                });
            }
        }
    },
    methods:{
        setUrl(v){
            this.microUrl = v;
            if(v){
                sessionStorage.setItem('microTestUrl', v);
            }else{
                this.microUrlInput = '';
                sessionStorage.removeItem('microTestUrl');
            }
        },
        createDomain(v){
            // console.log(v);
            if(!v.domain||!v.ingressClass||!v.app||!v.port){
                return Promise.reject();
            }
            let data = {
                apiVersion: 'networking.k8s.io/v1',
                kind: 'Ingress',
                metadata: {
                    name: 'ing-'+this.createName(),
                    namespace: this.namespaceActive, //'higress-system',
                    annotations: {
                        'kubernetes.io/ingress.class': v.ingressClass,
                        'higress.io/resource-definer': 'higress',
                    },
                    labels: {
                        'higress.io/resource-definer': 'higress',
                        app: this.allYaml?.[0]?.metadata?.name || this.$route.params.id,
                    },
                },
                spec: {
                    rules: [
                        {
                            host: v.domain,
                            http: {
                                paths: [
                                    {
                                        path: v.path? ('/'+v.path.replace(/^\//,'')) : '/',
                                        pathType: 'Prefix',
                                        backend: {
                                            service: {
                                                name: v.app,
                                                port: {number: Number(v.port)},
                                            }
                                        }
                                    },
                                ],
                            },
                        },
                    ],
                },
            }
            if(v.auto_ssl){
                data.metadata.annotations['cert-manager.io/cluster-issuer'] = 'w7-letsencrypt-prod';
                data.metadata.annotations['cert-manager.io/renew-before'] = '30m';
                data.spec.tls = [{
                    hosts: [v.domain],
                    secretName: data.metadata.name + "-tls-secret"
                }]
            }else{
                delete data.metadata.annotations['cert-manager.io/cluster-issuer'];
                delete data.metadata.annotations['cert-manager.io/renew-before'];
                delete data.spec.tls;
            }
            
            return k8sproxy.post("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses", data)
        },
        createName(len){
            len = len || 8;
            let s = 'abcdefghijklmnopqrstuvwxyz';
            let p = '';
            for(var i=0; i<len; i++){
                p = p + s[parseInt(Math.random()*s.length)]
            }
            return p;
        },
    },
}
</script>

<style>

</style>