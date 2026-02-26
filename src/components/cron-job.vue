<template>
    <div class="df df-ww">
        <a-select v-model="plan.cycle" style="width:160px; margin:0 10px 10px 0;" @change="setCron">
            <a-option value="everymon">每月</a-option>
            <a-option value="everyweek">每周</a-option>
            <a-option value="everyday">每天</a-option>
            <a-option value="everyhour">每小时</a-option>
            <a-option value="eoday">每隔N日</a-option>
            <a-option value="eohour">每隔N小时</a-option>
            <a-option value="eomin">每隔N分钟</a-option>
        </a-select>
        <a-select v-if="plan.cycle=='everyweek'" @change="setCron" v-model="plan.week" style="width:160px; margin:0 10px 10px 0;">
            <a-option :value="1">周一</a-option>
            <a-option :value="2">周二</a-option>
            <a-option :value="3">周三</a-option>
            <a-option :value="4">周四</a-option>
            <a-option :value="5">周五</a-option>
            <a-option :value="6">周六</a-option>
            <a-option :value="0">周日</a-option>
        </a-select>
        <a-input v-if="plan.cycle=='everymon'||plan.cycle=='eoday'" v-model="plan.day" @input="setCron" type="number" style="width:160px; margin:0 10px 10px 0;">
            <template #append>日</template>
        </a-input>
        <a-input v-if="plan.cycle!='everyhour'&&plan.cycle!='eomin'&&plan.cycle!='eos'" @input="setCron" v-model="plan.hour" type="number" style="width:160px; margin:0 10px 10px 0;">
            <template #append>时</template>
        </a-input>
        <a-input v-model="plan.min" type="number" @input="setCron" style="width:160px; margin:0 10px 10px 0;">
            <template #append>分</template>
        </a-input>
    </div>
</template>

<script>
export default {
    props: ['value'],
    emits: ['change'],
    data(){
        return {
            plan: {
                cycle: 'everymon',
                week: 1,
                day: 1,
                hour: 0,
                min: 0,
                second: 0,
            },
        }
    },
    created(){
        this.setValue();
    },
    watch: {
        value(){
            this.setValue();
        },
    },
    methods: {
        setValue(){
            if(!this.value){return}
            this.plan = this.getCron(this.value, true);
        },
        setCron(){
            this.plan = {
                cycle: this.plan.cycle || 'everymon',
                week: this.plan.week,
                day: this.plan.day || 1,
                hour: this.plan.hour || 0,
                min: this.plan.min || 0,
                second: this.plan.second || 0,
            }
            let p = this.plan;
            let cron = "";
            switch(this.plan.cycle){
                case 'everymon': cron = `${p.min} ${p.hour} ${p.day} * ?`; break;
                case 'everyweek': cron = `${p.min} ${p.hour} ? * ${p.week}`; break;
                case 'everyday': cron = `${p.min} ${p.hour} * * *`; break;
                case 'everyhour': cron = `${p.min} * * * *`; break;
                case 'eoday': cron = `${p.min} ${p.hour} 0/${p.day} * ?`; break;
                case 'eohour': cron = `${p.min} 0/${p.hour} * * *`; break;
                case 'eomin': cron = `0/${p.min} * * * *`; break;
            }
            // console.log(cron)
            this.$emit('change',cron);
        },
        
        getCron(cron,getObj){
            let txt = '';
            let obj = {};
            if(!cron){return getObj ? obj : txt;}
            let m = null;
            if(m = cron.match(/^(\d+) (\d+) (\d+) \* \?/)){
                let time = this.getTime(m[2], m[1], 0);
                txt = `每月${m[3]}日 ${time} 执行`;
                obj = {cycle:'everymon', week:1, day:Number(m[3]), hour:Number(m[2]), min:Number(m[1]), second:0, };
            }else if(m = cron.match(/^(\d+) (\d+) \? \* (\d)/)){
                let w = '日一二三四五六';
                let time = this.getTime(m[2], m[1], 0);
                txt = `每周${w[m[3]]} ${time} 执行`;
                obj = {cycle:'everyweek', week:Number(m[3]), day:1, hour:Number(m[2]), min:Number(m[1]), second:0, };
            }else if(m = cron.match(/^(\d+) (\d+) \* \* \*/)){
                let time = this.getTime(m[2], m[1], 0);
                txt = `每天 ${time} 执行`;
                obj = {cycle:'everyday', week:1, day:1, hour:Number(m[2]), min:Number(m[1]), second:0, };
            }else if(m = cron.match(/^(\d+) \* \* \* \*/)){
                let time = this.getTime(null, m[1], 0);
                txt = `每小时 ${time} 执行`;
                obj = {cycle:'everyhour', week:1, day:1, hour:0, min:Number(m[1]), second:0, };
            }else if(m = cron.match(/^(\d+) (\d+) [\d\*]+\/(\d+) \* \?/)){
                let time = this.getTime(m[2], m[1], m[0]);
                txt = `每隔${m[3]}天，${time} 执行`;
                obj = {cycle:'eoday', week:1, day:Number(m[3]), hour:Number(m[2]), min:Number(m[1]), second:0, };
            }else if(m = cron.match(/^(\d+) [\d\*]+\/(\d+) \* \* \*/)){
                let time = this.getTime(null, m[1], 0);
                txt = `每隔${m[2]}小时，${time} 执行`;
                obj = {cycle:'eohour', week:1, day:1, hour:Number(m[2]), min:Number(m[1]), second:0, };
            }else if(m = cron.match(/^[\d\*]+\/(\d+) \* \* \* \*/)){
                txt = `每隔${m[1]}分钟执行`;
                obj = {cycle:'eomin', week:1, day:1, hour:0, min:Number(m[1]), second:0, };
            }
            return getObj ? obj : txt;
        },
        getTime(h,m,s){
            if(h!==null){
                h = Number(h)
                h = h<10? '0'+h : h;
            }
            m = Number(m)
            m = m<10? '0'+m : m;
            s = Number(s)
            s = s<10? '0'+s : s;
            return (h===null? '' : (h+':'))+m+':'+s;
        },
    },
}
</script>

<style>

</style>