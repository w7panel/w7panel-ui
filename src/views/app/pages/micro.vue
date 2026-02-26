<template>
    <div style="height:100%;">
        <micro-app
            v-if="show"
            name='examcenter'
            :url="microUrl"
            :baseroute="baseRoute"
            :data="microData"
            router-mode='native'
            destroy
        ></micro-app>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import microApp from '@micro-zoe/micro-app'
import axios from 'axios'
import { useNamespaceStore } from '@/store';

export default {
    props: ['data','url'],
    data(){
        return {
            show: false,
            microUrl: '',
            baseRoute: '',
            namespaceActive: '',
            microData: {
                cd: {
                    info:{
                        env: [],
                    },
                    getPod:()=>{
                        return this.getPod();
                    },
                    shell:(command,pod_name)=>{
                        return this.command(command,pod_name);
                    },
                    toFilesPage: (path)=>{
                        this.$router.push(`/app/deployments/${this?.data?.metadata?.name}/files?path=${path}`);
                    },
                }
            },
        }
    },
    created(){
        this.microData.cd.info.env = this.data?.spec?.template?.spec?.containers?.[0]?.env || [];
        this.show = true;
        this.namespaceActive = useNamespaceStore().namespace;
        this.microUrl = sessionStorage.getItem('microTestUrl') || this.url || '';
        // this.microUrl = 'http://localhost:8001';
        this.baseRoute = this.$route.name == 'app-detail-micro'? '/app/deployments/'+this.$route.params.id+'/micro' : '/helm/'+this.$route.params.name+'/micro';
    },
    mounted(){
        microApp.start()
    },
    watch:{
        url(){
            this.microUrl = this.url || '';
        },
        $route(v){
            if(v.name == 'app-detail-micro' || v.name == 'helm-detail-micro'){
                // this.show = false;
                // this.$nextTick(()=>{
                //     this.show = true;
                // })
                let r = v.name=='helm-detail-micro'? /^\/helm\/[^/]+\/micro/ : /^\/app\/deployments\/[^/]+\/micro/;
                microApp.setData('examcenter', {
                    type:'route',
                    data: v.fullPath.replace(r,''),
                    ...this.microData,
                });
            }
        }
    },
    methods:{
        getPod(){
            if(!Object.keys(this.data)?.length){return Promise.reject();}
            let selector = this.data?.spec?.selector?.matchLabels || {};
            let label = Object.keys(selector).map(key=>`${key}=${selector[key]}`).join(',');
            return new Promise((resolve,reject)=>{
                k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods",{
                    params:{
                        labelSelector: label
                    },
                    loading:true,
                }).then(res=>{
                    let items = res?.data?.items || [];
                    resolve(items);
                }).catch(()=>reject())
            })
        },
        command(command,pod_name){
            // return myAxios.post('/api/thirdparty-cd/app/'+ this.data.name +'/k8s-pod-exec',{
            //     pod_name: pod_name,
            //     command_line: ['/bin/sh', '-c', command ],
            // });
            return Promise.reject();
        },
    },
}
</script>

<style>

</style>