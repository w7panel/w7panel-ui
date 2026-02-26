<template>
    <a-drawer :width="800" :visible="visible" @cancel="closeDrawer()" @ok="submit">
        <template #title>配额管理</template>
        <div>
            <a-form ref="quotaForm" class="label-width-100" auto-label-width>
                
                <a-form-item label="集群模式" disabled>
                    <a-select :model-value="clustermode" placeholder="请选择集群模式">
                        <a-option label="全局" value="global"></a-option>
                        <a-option label="共享" value="shared"></a-option>
                        <a-option label="独享" value="virtual"></a-option>
                    </a-select>
                    <template #extra>
                        <div v-if="clustermode=='shared'">共享：基于主集群轻度隔离，轻量，适用于内部团队场景。</div>
                        <div v-if="clustermode=='virtual'">独享：基于主集群完全隔离，完整的集群架构，适用于商业多租户场景。</div>
                        <div v-if="clustermode=='global'">全局：可直接对创始人端后台进行管理。</div>
                    </template>
                </a-form-item>

            </a-form>
            <quota-config
                ref="quotaconfig"
                :clustermode="clustermode"
                :data="quotaForm"
                @setQuotaPage="()=>quotaForm.isLock=true"
            ></quota-config>
        </div>
    </a-drawer>
</template>

<script>
import { useNamespaceStore } from '@/store';
import quotaConfig from './quota-config.vue';

export default {
    props: ['show', 'data', 'name','clustermode'],
    data(){
        return {
            namespaceActive: '',
            quotaList: [],
            quotaForm: {},
        }
    },
    components: {
        quotaConfig,
    },
    watch:{
        show(){
            this.visible = this.show;
            this.init();
        },
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.init();
    },
    methods: {
        init(){
            this.perseForm(this.data);
        },
        perseForm(data){
            let quota = data || {};
            let qd = quota?.hard || {};
            this.quotaForm = {
                ...this.quotaForm,
                cpu: qd.cpu,
                memory: qd.memory,
                bandwidth: qd.bandwidth,
                storage: qd?.['requests.storage'],
                storageclass: quota.storageclass,
                isLock: true,
            }
        },
        submit(){
            this.$refs.quotaconfig.getForm().then(v=>{
                this.quotaForm = {
                    ...this.quotaForm,
                    ...v,
                }
                let hard = {
                    cpu: this.quotaForm.cpu,
                    memory: this.quotaForm.memory,
                    bandwidth: (this.quotaForm.bandwidth || '0'),
                    'requests.storage': this.quotaForm.storage,
                }

                this.$emit('submit',{
                    name: this.name,
                    limit: JSON.stringify({
                        hard: hard,
                        storageclass: this.quotaForm.storageclass,
                    }),
                    isLock: this.quotaForm.isLock,
                });
                this.closeDrawer();
            });
        },
        // 关闭抽屉
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
    },

}
</script>

<style>
</style>