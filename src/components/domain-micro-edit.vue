<template>
    <a-drawer :width="700" :visible="visible" @ok="submit" @cancel="closeDrawer()">
        <template #title>修改子目录</template>
        
        <a-form ref="dialog" :model="domain" validate-trigger="blur" class="padding-20" auto-label-width>
            
            <a-form-item  label="应用" field="app">
                <a-select v-model="domain.app" @change="v=>{domain.port='';domain.appPorts=appPorts[v] || [];}" placeholder="请选择应用" style="width:500px;">
                    <a-option v-for="i in appList" :key="i.name" :label="i.title" :value="i.name"></a-option>
                </a-select>
            </a-form-item>
            
            <a-form-item label="选择端口" field="port">
                <a-select v-model="domain.port" placeholder="请选择端口" style="width:500px;">
                    <a-option v-for="i in domain.appPorts" :key="i" :label="i" :value="i"></a-option>
                </a-select>
            </a-form-item>

            <a-form-item label="子目录">
                <div style="flex:1;">
                    <div class="df">
                        <a-select v-model="domain.path_type" placeholder="匹配方式" style="width: 140px">
                            <a-option label="前缀匹配" value="Prefix" />
                            <a-option label="精准匹配" value="Exact" />
                            <a-option label="正则匹配" value="ImplementationSpecific" />
                        </a-select>
                        <a-input v-model="domain.path" placeholder="请输入子目录" :spellcheck="false" style="margin-left:20px;">
                            <template #prepend>/</template>
                        </a-input>
                    </div>
                </div>
            </a-form-item>
            <a-form-item label="重写">
                <div class="df df-c ai-s" style="width:100%;">
                    <a-switch v-model="domain.rewrite"></a-switch>
                    <div v-if="domain.rewrite" class="padding-10 mt-10" style="background:var(--color-neutral-1);width:100%;">
                        <a-alert style="line-height:1.2;">修改请求的域名（Host）以及请求路径（Path），通常用于后端服务的域名/路由与网关侧域名/路由不一致时的配置</a-alert>
                        <div class="mt-20">
                            <a-form-item label="重写路径" prop="rewrite">
                                <a-input v-model="domain.rewrite_path" placeholder="请输入" :spellcheck="false" ></a-input>
                            </a-form-item>
                            <a-form-item label="重写域名" prop="rewrite">
                                <a-input v-model="domain.rewrite_host" placeholder="请输入" :spellcheck="false" ></a-input>
                            </a-form-item>
                        </div>
                    </div>
                </div>
            </a-form-item>
            <a-form-item label="高级匹配">
                <div class="df df-c ai-s" style="width:100%;">
                    <a-switch v-model="domain.openOther"></a-switch>
                    <div v-if="domain.openOther" class="padding-10 mt-10" style="background:var(--color-neutral-1);width:100%;">
                        <div style="color:var(--color-text-2);margin-bottom:8px;">请求方法</div>
                        <a-select v-model="domain.matchMethod" multiple placeholder="方法匹配值，可多选，不填则匹配所有的HTTP方法">
                            <a-option label="GET" value="GET"></a-option>
                            <a-option label="POST" value="POST"></a-option>
                            <a-option label="PUT" value="PUT"></a-option>
                            <a-option label="DELETE" value="DELETE"></a-option>
                            <a-option label="OPTIONS" value="OPTIONS"></a-option>
                            <a-option label="HEAD" value="HEAD"></a-option>
                            <a-option label="PATCH" value="PATCH"></a-option>
                            <a-option label="TRACE" value="TRACE"></a-option>
                            <a-option label="CONNECT" value="CONNECT"></a-option>
                        </a-select>
                        
                        <div class="mt-20" style="color:var(--color-text-2);margin-bottom:8px;">
                            <span>请求头(Header)</span>
                            <a-tooltip content="多个参数之间是“与”关系">
                                <icon-question-circle-fill class="ml-4 cursor" />
                            </a-tooltip>
                        </div>
                        <table class="com-table">
                            <tbody>
                                <tr class="thead"><td>键</td><td>条件</td><td>值</td><td>操作</td></tr>
                                <tr v-for="(item,index) in domain.matchHeader" :key="index">
                                    <td><a-input v-model="item.key" size="small" placeholder="请输入" /></td>
                                    <td>
                                        <a-select v-model="item.type" size="small">
                                            <a-option value="prefix" label="前缀匹配"></a-option>
                                            <a-option value="exact" label="精准匹配"></a-option>
                                            <a-option value="regex" label="正则匹配"></a-option>
                                        </a-select>
                                    </td>
                                    <td><a-input v-model="item.value" size="small" placeholder="请输入" /></td>
                                    <td>
                                        <span class="c-blue cursor" style="white-space:nowrap;" @click="domain.matchHeader.splice(index,1);">删除</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="4" class="txt-c c-99">
                                        <div class="df ai-c jc-c cursor" @click="domain.matchHeader.push({key:'',type:'prefix',value:''})">
                                            <icon-plus :size="14" class="c-99" />
                                            <span class="c-99 lh-1 ml-6">添加</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="mt-20" style="color:var(--color-text-2);margin-bottom:8px;">
                            <span>请求参数(Query)</span>
                            <a-tooltip content="多个参数之间是“与”关系">
                                <icon-question-circle-fill class="ml-4 cursor" />
                            </a-tooltip>
                        </div>
                        <table class="com-table">
                            <tbody>
                                <tr class="thead"><td>键</td><td>条件</td><td>值</td><td>操作</td></tr>
                                <tr v-for="(item,index) in domain.matchQuery" :key="index">
                                    <td><a-input v-model="item.key" size="small" placeholder="请输入" /></td>
                                    <td>
                                        <a-select v-model="item.type" size="small">
                                            <a-option value="prefix" label="前缀匹配"></a-option>
                                            <a-option value="exact" label="精准匹配"></a-option>
                                            <a-option value="regex" label="正则匹配"></a-option>
                                        </a-select>
                                    </td>
                                    <td><a-input v-model="item.value" size="small" placeholder="请输入" /></td>
                                    <td>
                                        <span class="c-blue cursor" style="white-space:nowrap;" @click="domain.matchQuery.splice(index,1);">删除</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="4" class="txt-c c-99">
                                        <div class="df ai-c jc-c cursor" @click="domain.matchQuery.push({key:'',type:'prefix',value:''})">
                                            <icon-plus :size="14" class="c-99" />
                                            <span class="c-99 lh-1 ml-6">添加</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </a-form-item>
        </a-form>
    </a-drawer>
</template>
<script>
export default{
    props: {
        show: {
            type: Boolean,
            default: false,
        },
        ingress: {
            type: Object,
            default: () => ({}),
        },
        appList: {
            type: Array,
            default: () => ([]),
        },
        appPorts: {
            type: Object,
            default: () => ({}),
        },
        multiple: {
            type: Boolean,
            default: false,
        },
    },
    data(){
        return {
            visible: false,
            domain: {
                app: '',
                port: '',
                appPorts: [],
                path_type: '',
                path: '',

                rewrite: false,
                rewrite_path: '',
                rewrite_host: '',

                openOther: false,
                matchHeader: [],
                matchQuery: [],
            },
        }
    },
    created(){

    },
    watch: {
        show(v) {
            this.visible = v;
            v && this.init();
        },
    },
    methods: {
        init(){
            if(!this.ingress){return}
            let data = this.ingress;

            this.domain.app = data?.backend?.name || '';
            this.domain.port = data?.backend?.port || '';
            this.domain.appPorts = this.appPorts[this.domain.app] || [];
            this.domain.path_type = data?.backend?.match || 'Prefix';
            this.domain.path = data?.path?.replace?.(/^\//,'') || '';
            
            this.domain.rewrite = !!data?.backend?.rewrite;
            this.domain.rewrite_path = data?.backend?.rewrite?.path || '';
            this.domain.rewrite_host = data?.backend?.rewrite?.host || '';

            this.domain.openOther = !!data?.backend?.moreMatch;
            this.domain.matchMethod = data?.backend?.moreMatch?.method || [];
            this.domain.matchHeader = data?.backend?.moreMatch?.header || [];
            this.domain.matchQuery = data?.backend?.moreMatch?.query || [];

        },
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
        submit(){
            this.$emit('submit',{
                path: '/' + this.domain.path,
                backend: {
                    match: this.domain.path_type,
                    name: this.domain.app,
                    port: this.domain.port,
                    // 高级匹配
                    moreMatch: this.domain.openOther ? {
                        method: this.domain.matchMethod,
                        header: this.domain.matchHeader,
                        query: this.domain.matchQuery,
                    } : null,
                    // 重写
                    rewrite: this.domain.rewrite ? {
                        path: this.domain.rewrite_path,
                        host: this.domain.rewrite_host,
                    } : null
                },
            })
        },
    }
}
</script>
<style scoped>
</style>
