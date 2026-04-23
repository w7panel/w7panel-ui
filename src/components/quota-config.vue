<template>
    <a-form ref="quotaForm" class="label-width-100" :model="quotaForm" auto-label-width>
        <a-form-item label="配额配置">
            <div class="df df-c ai-s" style="width:100%;">
                <div class="padding-10 mt-10" style="background:var(--color-neutral-1);width:100%;">
                    <a-form-item label="CPU/内存" field="cpu" :rules="rules">
                        <a-input-number v-model="quotaForm.cpu" :disabled="noLimitCpu" :min="2" @change="setQuotaPackage()" placeholder="请输入">
                            <template #append>核</template>
                        </a-input-number>
                        <a-input-number v-model="quotaForm.memory" class="ml-10" :disabled="noLimitCpu" :min="4" @change="setQuotaPackage()" placeholder="请输入">
                            <template #append>Gi</template>
                        </a-input-number>
                        <template #extra>
                            <span v-if="noLimitCpu" >创建POD时，CPU和内存可为不限制</span>
                            <span v-else >创建POD时，如果CPU和内存为空，会自动给一个默认值CPU：0.25核 / 内存：0.5GiB</span>
                        </template>
                    </a-form-item>
                    <a-form-item label="带宽" field="bandwidth" :max="200" @change="setQuotaPackage()" :rules="[{required:true,message:'请输入带宽', trigger: 'blur' }]" extra="共享模式下会针对每个POD独立限制带宽，虚拟模式下会针对所有POD整体限制带宽。">
                        <a-input-number v-model="quotaForm.bandwidth" :min="1" placeholder="请输入">
                            <template #append>Mbps</template>
                        </a-input-number>
                    </a-form-item>

                    <a-form-item label="存储" field="storageclass" :rules="[{required:true,message:'请选择存储设备', trigger: 'blur' }]" style="margin-bottom:0;">
                        <div style="flex:1;">
                            <div class="df">
                                <a-select v-model="quotaForm.storageclass" @change="setQuotaPackage()" placeholder="请选择">
                                    <a-option v-for="item in storageLs" :key="item" :label="item" :value="item"></a-option>
                                </a-select>
                                
                                <a-input-number v-model="quotaForm.storage" :min="10" class="ml-20" @change="setQuotaPackage();" placeholder="请输入">
                                    <template #append>Gi</template>
                                </a-input-number>
                            </div>
                        </div>
                    </a-form-item>
                </div>
            </div>
        </a-form-item>
    </a-form>
</template>

<script>

import { k8sproxy } from '@/utils/api';

export default {
    props: ['data'],
    data(){
        return {
            rules: [{
                required:true,
                validator: (value, cb) => {
                    if(!this.quotaForm.cpu){cb('请输入CPU'); return}
                    if(!this.quotaForm.memory){cb('请输入内存'); return}
                    cb();
                }
            }],
            quotaForm: {},
        }
    },
    created(){
        this.init();
        this.getStorageList();
    },
    watch: {
        data(v){
            this.init();
        },
    },
    methods: {
        init(){
            if(!this.data){return}
            let v = this.data;
            this.quotaForm = {
                cpu: Number(v?.cpu) || 2,
                memory: Number(v?.memory) || 4,
                bandwidth: Number(v?.bandwidth) || 100,
                storage: Number(v?.storage) || 10,
                storageclass: v?.storageclass || '',
            }
        },
        setQuotaPackage(){
            this.$emit('setQuotaPage','');
        },
        getForm(){
            return new Promise((resolve,reject)=>{
                this.$refs.quotaForm.validate((err) => {
                    if (err) {
                        this.$refs.quotaForm.scrollToField(Object.keys(err)[0])
                        reject();
                        return;
                    }
                    resolve(this.quotaForm);
                });
            })
        },
        getStorageList(){
            k8sproxy.get('/apis/storage.k8s.io/v1/storageclasses').then(res=>{
                let data = res?.data || [];
                let list = data.items || [];
                list = list.map(item=>{
                    return item.metadata.name;
                })
                list = list.filter(i=>!/longhorn/i.test(i))
                this.storageLs = list;
            });
        },
    },

}
</script>

<style scoped>
.m-lr6{margin-left:6px; margin-right:6px;}
</style>