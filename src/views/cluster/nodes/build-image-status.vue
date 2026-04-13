<template>
    <div>
        <a-modal
            v-model:visible="visible"
            :title="title"
            title-align="start"
            width="1000px"
            :footer="false"
            @cancel="closeDrawer()"
            :mask-closable="false"
        >
            <div class="df df-c ai-c" style="height:360px;">
                
                <div class="df df-c ai-c mt-20">
                    <icon-check-circle-fill v-if="status==1" style="font-size:80px;color:rgb(var(--green-6));" />
                    <icon-close-circle-fill v-else-if="status==2" class="c-red" style="font-size:80px;" />
                    <img v-else src="@/assets/image/loading.png" style="width:60px; height:auto;" class="loader" alt="" />
                    <div class="fs-18 mt-16 c-99">
                        <div v-if="status==1">任务成功</div>
                        <div v-else-if="status==2">任务失败</div>
                        <div v-else>任务执行中</div>
                    </div>
                </div>

                <div class="task mt-60">

                    <div class="item df ai-c">
                        <div class="fc df ai-c" style="overflow:hidden;">
                            <span class="df-s0">执行命令</span>
                            <span class="fc ml-20 c-99 one-hide txt-overhidden cursor">{{exec.result}}</span>
                        </div>
                        <div class="df-s0 ml-20">
                            <icon-check-circle-fill v-if="exec.status==1" class="c-green" />
                            <span v-if="exec.status==1" class="ml-6">正常</span>
                            <icon-close-circle-fill v-if="exec.status==2" class="c-red" />
                            <span v-if="exec.status==2" class="ml-6">失败</span>
                            <icon-loading v-if="exec.status==3" />
                            <span v-if="exec.status==3" class="ml-6">执行中...</span>
                        </div>
                    </div>

                    <div class="item df ai-c">
                        <div class="fc df ai-c" style="overflow:hidden;">
                            <span class="df-s0">镜像推送</span>
                            <span class="fc ml-20 c-99 txt-overhidden cursor"></span>
                        </div>
                        <div class="df-s0 ml-20">
                            <icon-check-circle-fill v-if="imagePush.status==1" class="c-green" />
                            <span v-if="imagePush.status==1" class="ml-6">正常</span>
                            <icon-close-circle-fill v-if="imagePush.status==2" class="c-red" />
                            <span v-if="imagePush.status==2" class="ml-6">失败</span>
                            <icon-loading v-if="imagePush.status==3" />
                            <span v-if="imagePush.status==3" class="ml-6">执行中...</span>
                        </div>
                    </div>
                </div>

            </div>
        </a-modal>

        <a-modal v-model:visible="log.show">
            <div class="log-terminal" ref="bislog"></div>
        </a-modal>
    </div>
</template>
<script>
import { useNamespaceStore } from '@/store';
import { panelApi } from '@/utils/api';
export default{
    props: ['show','data'],
    data(){
        return {
            namespaceActive: 'default',
            title: "打包容器镜像",
            visible: false,
            exec: {
                status: 3,
                result: '',
            },
            imagePush: {
                status: 3,
            },
            log: {
                show: false,
                data: '',
            },
        }
    },
    computed: {
        status(){
            if(this.exec.status==1 && this.imagePush.status==1){return 1;}
            if(this.exec.status==2 || this.imagePush.status==2){return 2;}
            return 3;
        }
    },
    watch: {
        show(v){
            this.visible = v;
            this.init();
        },
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    methods: {
        init(){
            this.exec = {
                ...this.exec,
                status: 3,
                result: '',
            };
            this.imagePush.status = 3;

            this.getStatus();
        },
        
        async runExec(data){
            return panelApi.post(`/exec2`,{
                podName: data?.podName,
                containerName: data?.containerName,
                tty: false,
                namespace: this.namespaceActive,
                command: ['sh', '-c', data.command],
            },{responseType: 'text', loading:true, noAlert:true})
        },
        async getStatus(){
            let buildContainer = this.data;
            console.log('ccccccccc',this.data)
            // 执行命令
            if(buildContainer.cmd){
                try{
                    let { data } = await this.runExec({
                        podName: buildContainer.podName,
                        containerName: buildContainer.containerName,
                        command: buildContainer.cmd,
                    });
                    this.exec.result = data;
                }catch{
                    this.exec.status = 2;
                }
            }else{
                this.exec.status = 1;
                this.exec.result = '';
            }
            return;
            try{
                await axios.post(this.outEditorInfo.agentUrl.replace(/\/$/,'')+'/panel-api/v1/containers/image/export-push',{
                    containerID: buildContainer.containerID?.replace?.(/^containerd:\/\//,''),
                    imageName: buildContainer.imageName?.replace?.(/^registry\.local\.w7\.cc\/w7build\//,''),
                    registryDomain: this.outEditorInfo.registryDomain,
                },{
                    loading: true,
                    timeout: 0,
                }).then(async res=>{

                    if(buildContainer.pinned){
                        
                        await axios.post(this.outEditorInfo.agentUrl+'/panel-api/v1/registry/patch/images/label',{
                            "name": buildContainer.imageName?.replace?.(/^registry\.local\.w7\.cc\/w7build\//,''),
                            "labels": {"io.cri.containerd.pinned":"pinned", "io.cattle.k3s.pinned":"pinned"},
                            "replace": true,
                        },{
                            loading: true,
                        }).then(()=>{}).catch(()=>{});
                    }

                    this.$message.success('操作成功');
                    buildContainer.show = false;
                    this.getList();
                })
            }catch(err){
                console.log('镜像推送失败: ' + (err.response?.data?.message || err.message || '未知错误'));
                return;
            }
        },
        openLog(){

        },
        initTerm(){

        },
        writeChunk(){
            
        },
        closeDrawer(v){
            this.visible = false;
            this.$emit('close',v);
        },
    }
}
</script>
<style scoped>

.task{width:800px; border:1px solid var(--color-neutral-3); border-radius:4px;}
.task .item.title{background:#f0f3fa; font-weight:bold;}
.task .item{padding:20px; border-bottom:1px solid var(--color-neutral-3);}
.task .item:last-child{border-bottom:none;}

.loader{animation: spin 3s linear infinite; vertical-align:middle;}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}


.log-terminal {
    width: 100%;
    flex: 1;
    min-height: 0;
    border: 1px solid var(--color-neutral-3);
}
</style>