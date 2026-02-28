<template>
    <div v-if="!novisible">
        <div class="c-red">
            <span>POD规格：{{cpu||'0'}}核 / {{memory||'0'}}</span>
            <span style="margin:0 10px;">|</span>
            <span>实例数量：{{replica || 1}}</span>
            <span style="margin:0 10px;">|</span>
            <span>剩余资源：{{availableResource.cpu.value + availableResource.cpu.unit}}核 / {{availableResource.memory.value + availableResource.memory.unit}}</span>
        </div>
        <div class="mt-10">
            <a-alert v-if="availableResource.passed" type="success">检测通过，可正常创建！</a-alert>
            <a-alert v-else type="error">检测失败，剩余配额不足，无法创建！</a-alert>
        </div>
    </div>
</template>

<script>
import { getUserInfo } from '@/utils/auth';
import axios from 'axios';

export default {
    props: ['cpu','memory','replica','novisible'],
    data(){
        return {
            availableResource: {
                cpu: {value:'', unit: ''},
                memory: {value: '', unit:''},
                passed: false,
            }
        }
    },
    created(){
        this.getResource();
    },
    watch: {
        'replica': 'testResourcePass',
        'cpu': 'testResourcePass',
        'memory': 'testResourcePass',
        'availableResource.passed'(v){
            this.$emit('changeStatus', v);
            this.onlyShow();
        },
    },
    methods: {
        onlyShow(){
            this.$emit('onlyshow',{
                cpu: this.cpu || '0',
                memory: this.memory || '0',
                replica: this.replica,
                availableResource: this.availableResource,
            })
        },
        getResource(){
            let userInfo = getUserInfo();
            
// this.availableResource = {
//     cpu: {value:3,unit:''},
//     memory: {value:20,unit:'Gi'},
//     passed: false,
// }
// this.testResourcePass();
// return;
            return k8sproxy.get(`/api/v1/namespaces/${userInfo['w7.cc/k3k-namespace']}/resourcequotas/${userInfo['w7.cc/k3k-name']}?local=1`).then(res=>{
                let data = res.data;
                this.availableResource = {
                    cpu: this.minusCpu(data.status?.hard?.['limits.cpu'], data.status?.used?.['limits.cpu']),
                    memory: this.minusMemory(data.status?.hard?.['limits.memory'], data.status?.used?.['limits.memory']),
                    passed: false,
                }
                this.testResourcePass();
            })
        },
        testResourcePass(){
            let ar = this.availableResource;
            const multiply = (s, n) => {
                const numMatch = s.match(/^[\d.]+/);
                if (!numMatch) return s;

                const num = parseFloat(numMatch[0]);
                const unit = s.slice(numMatch[0].length) || '';
                return (num * n) + unit;
            };
            
            let timesCpu = this.cpu;
            let timesMemory = this.memory;
            let times = this.replica || 1;
            timesCpu = multiply(timesCpu,times);
            timesMemory = multiply(timesMemory,times);

            let cpu = this.minusCpu(ar.cpu.value + ar.cpu.unit, timesCpu);
            let memory = this.minusMemory(ar.memory.value + ar.memory.unit, timesMemory);
            this.availableResource.passed = cpu.value >= 0 && memory.value >= 0;
            this.$emit('changeStatus', this.availableResource.passed);
            this.onlyShow();
        },
        
        minusCpu(a,b){
            if(!a){a = '0'}
            if(!b){b = '0'}
            if(/^\d+(\.\d+)?$/.test(a)){ a = Number(a) * 1000; }
            if(/m$/.test(a)){a = Number(a.replace(/m$/,''))}
            if(/k$/.test(a)){a = Number(a.replace(/k$/,'')) * 1000 * 1000; }
            if(/^\d+(\.\d+)?$/.test(b)){ b = Number(b) * 1000; }
            if(/m$/.test(b)){b = Number(b.replace(/m$/,''))}
            if(/k$/.test(b)){b = Number(b.replace(/k$/,'')) * 1000 * 1000; }
            let value = a - b;
            let unit = 'm';
            if(value>0 && value%1000 == 0 ){
                value = value / 1000;
                unit = '';
            }
            return { value, unit };
        },

        minusMemory(a,b){
            if(!a){a = '0'}
            if(!b){b = '0'}
            if(/Ti$/.test(a)){ a = parseInt(a.replace(/Ti$/,'') * 1024 * 1024); }
            if(/Gi$/.test(a)){ a = parseInt(a.replace(/Gi$/,'') * 1024); }
            if(/Mi$/.test(a)){ a = Number(a.replace(/Mi$/,'')) }
            if(/Ti$/.test(b)){ b = parseInt(b.replace(/Ti$/,'') * 1024 * 1024); }
            if(/Gi$/.test(b)){ b = parseInt(b.replace(/Gi$/,'') * 1024); }
            if(/Mi$/.test(b)){ b = Number(b.replace(/Mi$/,'')) }
            let value = Number(a) - Number(b);
            let unit = 'Mi';
            if(value > 0 && value % 1024 == 0){
                value = value / 1024;
                unit = 'Gi';
            }
            return {value, unit}
        },
    }
}
</script>

<style>

</style>