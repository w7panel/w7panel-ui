<template>
    <div>
        <a-drawer
            v-model:visible="showDrower"
            direction="rtl"
            :footer="false"
            :width="1200"
            @cancel="close"
        >
            <template #title>{{title||'策略'}}</template>
            
            <a-tabs v-if="showDrower" @change="v=>activeName=v">
                <a-tab-pane v-if="!hideRewrite" title="重写" key="rewrite">
                    <div class="c-99 fs-14 lh-14">修改请求的域名（Host）以及请求路径（Path），通常用于后端服务的域名/路由与网关侧域名/路由不一致时的配置</div>
                </a-tab-pane>
                <a-tab-pane title="Header设置" key="header">
                    <div class="c-99 fs-14 lh-14">支持增加/删除/修改 HTTP 请求头以及 HTTP 应答头</div>
                </a-tab-pane>
                <a-tab-pane title="跨域" key="cross">
                    <div class="c-99 fs-14 lh-14">通过配置标示除了当前站点以外的其他源（域名、协议或端口），使得浏览器允许这些源访问加载该路由的响应</div>
                </a-tab-pane>
                <a-tab-pane title="重试" key="retry">
                    <div class="c-99 fs-14 lh-14">配置网关向后端服务请求当前路由的响应失败时的重试机制</div>
                </a-tab-pane>
                <a-tab-pane title="访问控制" key="requests"></a-tab-pane>
                <!-- <a-tab-pane title="重定向" key="redirect">
                    <div class="c-99 fs-14 lh-14">通过重定向可以将原始客户端请求更改为目标请求</div>
                </a-tab-pane>
                <a-tab-pane title="IP访问控制" key="iplist">
                    <div class="c-99 fs-14 lh-14">指定路由上的IP白名单，支持IP地址或CIDR地址块</div>
                </a-tab-pane>
                <a-tab-pane title="单机限流" key="routelimit">
                    <div class="c-99 fs-14 lh-14">支持针对路由级别的单机限流策略，在设定的时间周期内，限制每个网关副本匹配在某个路由上的请求数量不大于阈值。</div>
                </a-tab-pane> -->
                <!-- <a-tab-pane v-if="!isMicroComponents" title="文件缓存" key="fileCache"></a-tab-pane> -->
                <!-- <a-tab-pane v-if="!isMicroComponents" title="镜像缓存" key="imageCache"></a-tab-pane> -->
                <a-tab-pane v-if="!isMicroComponents" title="更多" key="plugin">
                    <template #title>
                        <a-badge v-if="plugin.badge>0" :count="plugin.badge"><span style="padding:0 16px;">更多</span></a-badge>
                        <span v-else>更多</span>
                    </template>
                </a-tab-pane>
            </a-tabs>
            
            <div v-if="rewrite.show" >
                <a-form :model="rewrite" auto-label-width class="padding-20">
                    <a-form-item label="开启状态">
                        <a-switch v-model="rewrite.enable" />
                    </a-form-item>
                    <a-form-item label="路径">
                        <a-input v-model="rewrite.path" placeholder="请输入" size="large"></a-input>
                    </a-form-item>
                    <a-form-item label="重写主机域">
                        <a-input v-model="rewrite.host" placeholder="例如:example.com" size="large"></a-input>
                    </a-form-item>
                    <a-form-item>
                        <a-button @click="close">取消</a-button>
                        <a-button type="primary" @click="rewriteSubmit" class="ml-20">保存</a-button>
                    </a-form-item>
                </a-form>
            </div>

            <div v-if="header.show" >
                <a-form :model="header" auto-label-width class="padding-20">
                    <a-form-item label="开启状态">
                        <a-switch v-model="header.enable" />
                    </a-form-item>
                    <table class="com-table"><tbody>
                        <tr>
                            <td>header类型</td>
                            <td>操作类型</td>
                            <td>key</td>
                            <td>value</td>
                            <td>操作</td>
                        </tr>
                        <tr v-for="(item,index) in header.list" :key="index" style="background:var(--color-neutral-1);">
                            <td>
                                <a-select v-model="item.type" style="width:100px;">
                                    <a-option label="请求头" value="request"></a-option>
                                    <a-option label="响应头" value="response"></a-option>
                                </a-select>
                            </td>
                            <td>
                                <a-select v-model="item.operation" style="width:100px;">
                                    <a-option label="添加" value="add"></a-option>
                                    <a-option label="删除" value="remove"></a-option>
                                    <a-option label="修改" value="update"></a-option>
                                </a-select>
                            </td>
                            <td>
                                <a-input v-model="item.key" placeholder="请输入" style="width:200px;"></a-input>
                            </td>
                            <td>
                                <a-input v-model="item.value" placeholder="请输入" style="width:200px;"></a-input>
                            </td>
                            <td>
                                <span class="c-blue cursor" @click="header.list.splice(index,1) ">删除</span>
                            </td>
                        </tr>
                        <tr style="background:var(--color-neutral-1);">
                            <td colspan="5" class="txt-c cursor" @click="header.list.push({type:'request',operation:'add',key:'',value:''})">
                                <span class="c-blue">添加</span>
                            </td>
                        </tr>
                    </tbody></table>
                    <a-form-item class="mt-20">
                        <a-button @click="close">取消</a-button>
                        <a-button @click="headerSubmit" type="primary" class="ml-20">保存</a-button>
                    </a-form-item>
                </a-form>
            </div>
            
            <div v-if="cross.show" >
                <a-form :model="cross" auto-label-width class="padding-20">
                    <a-form-item label="开启状态">
                        <a-switch v-model="cross.enable" />
                    </a-form-item>
                    <a-form-item label="允许的访问来源">
                        <a-input v-model="cross.origin" :rows="3" type="textarea" placeholder="请输入"></a-input>
                    </a-form-item>
                    <a-form-item label="允许的方法">
                        <a-checkbox-group v-model="cross.methods" class="checkbox-group">
                            <a-checkbox value="GET">GET</a-checkbox>
                            <a-checkbox value="POST">POST</a-checkbox>
                            <a-checkbox value="PUT">PUT</a-checkbox>
                            <a-checkbox value="HEAD">HEAD</a-checkbox>
                            <a-checkbox value="DELETE">DELETE</a-checkbox>
                            <a-checkbox value="PATCH">PATCH</a-checkbox>
                            <a-checkbox value="OPTIONS">OPTIONS</a-checkbox>
                        </a-checkbox-group>
                    </a-form-item>
                    <a-form-item label="允许的请求头部">
                        <a-input v-model="cross.headerAccept" :rows="3" type="textarea" placeholder="请输入"></a-input>
                    </a-form-item>
                    <a-form-item label="允许的响应头部">
                        <a-input v-model="cross.headerData" :rows="3" type="textarea" placeholder="请输入"></a-input>
                    </a-form-item>
                    <a-form-item label="允许携带凭证">
                        <a-radio-group v-model="cross.credentials">
                            <a-radio :value="false">不允许</a-radio>
                            <a-radio :value="true">允许</a-radio>
                        </a-radio-group>
                    </a-form-item>
                    <a-form-item label="预检的过期时间">
                        <a-input v-model="cross.age" type="number" placeholder="请输入">
                            <template #append>秒</template>
                        </a-input>
                    </a-form-item>
                    <a-form-item>
                        <a-button @click="close">取消</a-button>
                        <a-button @click="crossSubmit" type="primary" class="ml-20">保存</a-button>
                    </a-form-item>
                </a-form>
            </div>

            <div v-if="retry.show" >
                <a-form :model="retry" auto-label-width class="padding-20">
                    <a-form-item label="开启状态">
                        <a-switch v-model="retry.enable" />
                    </a-form-item>
                    <a-form-item label="重试次数">
                        <a-input v-model="retry.tries" placeholder="请输入" type="number">
                            <template #append>次</template>
                        </a-input>
                    </a-form-item>
                    <a-form-item label="重试条件">
                        <a-select v-model="retry.requirement" multiple placeholder="请选择" style="width:100%;">
                            <a-option label="建立连接失败" value="error" />
                            <a-option label="建立连接超时" value="timeout" />
                            <a-option label="对于非幂等请求出错时进行重试" value="non_idempotent" />
                        </a-select>
                    </a-form-item>
                    <a-form-item label="超时时间">
                        <a-input v-model="retry.timeout" placeholder="请输入" type="number">
                            <template #append>秒</template>
                        </a-input>
                    </a-form-item>
                    <a-form-item>
                        <a-button @click="close">取消</a-button>
                        <a-button @click="retrySubmit" type="primary" class="ml-20">保存</a-button>
                    </a-form-item>
                </a-form>
            </div>

            <div v-if="requests.show">
                <a-card class="" title="重定向" hoverable>
                    <template #extra>
                        <div class="c-99 fs-14 lh-14">通过重定向可以将原始客户端请求更改为目标请求</div>
                    </template>
                    <a-form :model="redirect" auto-label-width class="">
                        <a-form-item label="开启状态" >
                            <a-switch v-model="redirect.enable" />
                        </a-form-item>
                        <a-form-item label="重定向" >
                            <a-select v-model="redirect.type" >
                                <a-option value="permanent">永久重定向</a-option>
                                <a-option value="temporal">临时定向</a-option>
                            </a-select>
                        </a-form-item>
                        <a-form-item label="重定向地址" >
                            <a-input v-model="redirect.host" placeholder="请输入" type="text"></a-input>
                        </a-form-item>
                        <!-- <a-form-item>
                            <a-button @click="close">取消</a-button>
                            <a-button @click="redirectSubmit" type="primary" class="ml-20">保存</a-button>
                        </a-form-item> -->
                    </a-form>
                </a-card>

                <a-card class="mt-20" title="IP访问控制" hoverable>
                    <template #extra>
                        <div class="c-99 fs-14 lh-14">指定路由上的IP白名单，支持IP地址或CIDR地址块</div>
                    </template>
                    <a-form :model="iplist" auto-label-width class="">
                        <a-form-item label="开启状态" >
                            <a-switch v-model="iplist.enable" />
                        </a-form-item>
                        <a-form-item label="请输入IP" >
                            <a-textarea v-model="iplist.text" placeholder="换行填写多个IP" allow-clear style="height:200px;"/>
                        </a-form-item>
                        <!-- <a-form-item>
                            <a-button @click="close">取消</a-button>
                            <a-button @click="iplistSubmit" type="primary" class="ml-20">保存</a-button>
                        </a-form-item> -->
                    </a-form>
                </a-card>

                <a-card class="mt-20" title="单机限流" hoverable>
                    <template #extra>
                        <div class="c-99 fs-14 lh-14">支持针对路由级别的单机限流策略，在设定的时间周期内，限制每个网关副本匹配在某个路由上的请求数量不大于阈值。</div>
                    </template>
                    <a-form :model="routelimit" auto-label-width class="">
                        <a-form-item label="开启状态" >
                            <a-switch v-model="routelimit.enable" />
                        </a-form-item>
                        <a-form-item label="瞬时请求因子" >
                            <a-input v-model="routelimit.bm" type="number" placeholder="请输入"></a-input>
                        </a-form-item>
                        <a-form-item label="每分钟最大请求次数" >
                            <a-input v-model="routelimit.rpm" type="number" placeholder="请输入">
                                <template #append>
                                    <span>* {{routelimit.bm||0}} =  {{(routelimit.rpm||0)*(routelimit.bm||0)}}</span>
                                </template>
                            </a-input>
                        </a-form-item>
                        <a-form-item label="每秒最大请求次数" >
                            <a-input v-model="routelimit.rps" type="number" placeholder="请输入">
                                <template #append>
                                    <span>* {{routelimit.bm||0}} =  {{(routelimit.rps||0)*(routelimit.bm||0)}}</span>
                                </template>
                            </a-input>
                        </a-form-item>
                        <!-- <a-form-item>
                            <a-button @click="close">取消</a-button>
                            <a-button @click="routelimitSubmit" type="primary" class="ml-20">保存</a-button>
                        </a-form-item> -->
                    </a-form>
                </a-card>

                <a-card class="mt-20" title="错误页设置" hoverable>
                    <template #extra>
                        <div class="c-99 fs-14 lh-14">当定义的服务通信不可达时，请求会自动转发到设置的容灾服务。</div>
                    </template>
                    <a-form :model="errorPage" auto-label-width class="">
                        <a-form-item label="开启状态" >
                            <a-switch v-model="errorPage.enable" />
                        </a-form-item>
                        <a-form-item label="容灾服务" >
                            <a-select v-model="errorPage.group" placeholder="请选择应用" @change="changeGroup(errorPage.group)">
                                <a-option v-for="item in groupList" :key="item.name" :label="item.title" :value="item.name"></a-option>
                            </a-select>
                            <a-select v-model="errorPage.service" placeholder="请选择服务" class="ml-20">
                                <a-option v-for="item in appList" :key="item.name" :label="item.title" :value="item.name"></a-option>
                            </a-select>
                        </a-form-item>
                        <a-form-item label="HTTP响应码">
                            <a-select v-model="errorPage.codes" multiple placeholder="请选择">
                                <a-option v-for="item in httpCodes" :key="item" :label="item" :value="item"></a-option>
                            </a-select>
                        </a-form-item>
                    </a-form>
                </a-card>


                <div class="df ai-c mt-20" style="margin-bottom:20px;">
                    <a-button @click="close">取消</a-button>
                    <a-button @click="requestsSubmit" type="primary" class="ml-20">保存</a-button>
                </div>
            </div>

            <!-- <domain-strategy-filecache
                v-show="fileCache.show"
                :activeName="activeName"
                :data="data"
                @submit="v=>submit(v)"
                @cancel="close"
            ></domain-strategy-filecache> -->

            <!-- <domain-strategy-imagecache
                v-show="imageCache.show"
                :activeName="activeName"
                :data="data"
                @submit="v=>$emit('refresh')"
                @cancel="close"
            ></domain-strategy-imagecache> -->

            <domain-strategy-plugin
                v-show="plugin.show"
                :show="plugin.show"
                :data="data"
                @pluginbadge="v=>plugin.badge=v"
                @close="close"
            ></domain-strategy-plugin>

        </a-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import domainStrategyPlugin from './domain-strategy-plugin.vue';
import axios from 'axios';
// import domainStrategyFilecache from './domain-strategy-filecache.vue';
// import domainStrategyImagecache from './domain-strategy-imagecache.vue';

export default {
    props: ['title', 'show', 'data', 'hideRewrite','multiple','isMicroComponents'],
    emits: ['cancel', 'submit', 'refresh'],

    data() {
        return {
            namespaceActive: '',
            showDrower: false,
            appData: {},
            activeName: 'rewrite',

            errorPage:{
                enable: false,
                codes: [],
                group: '',
                service: '',
            },
            requests: {
                show: false,
            },
            rewrite: {
                show: false,
                enable: false,
                path: "",
                host: "",
            },
            header: {
                show: false,
                enable: false,
                list: [{type:'request',operation:'add', key: '', value: ''}],
            },
            cross: {
                show: false,
                enable: false,
                origin: "*",
                methods: [],
                headerAccept: "*",
                headerData: "*",
                credentials: false,
                age: "1800",
            },
            retry: {
                show: false,
                enable: false,
                tries: 0,
                timeout: 5,
                requirement: [],
            },
            redirect: {
                show: false,
                enable: false,
                type: "",
                host: "",
            },
            plugin: {
                show:false,
                badge: 0,
            },
            iplist: {
                show: false,
                enable: false,
                text: '',
                list: [],
            },
            routelimit: {
                show: false,
                enable: false,
                rpm: '',
                rps: '',
                bm: '5',
            },
            inRvproxy: false,
            groupList: [],
            appList: [],
            httpCodes: [
                 "301",
                 "302",
                 "303",
                 "304",
                 "308",

                 "400",
                 "401",
                 "403",
                 "404",
                 "405",
                 "408",
                 "410",
                 "422",
                 "429",

                 "500",
                 "501",
                 "502",
                 "503",
                 "504",
            ],
            fileCache: {
                show: false,
            },
            imageCache: {
                show: false,
            },
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.inRvproxy = this.$route.name == 'app-rvproxy-domain';
        this.showDrower = this.show;
        this.activeName = this.hideRewrite? 'header' : 'rewrite';
        this[this.hideRewrite? 'header' : 'rewrite'].show = true;
    },
    components: {
        domainStrategyPlugin,
        // domainStrategyFilecache,
        // domainStrategyImagecache,
    },
    watch: {
        activeName(){
            this.rewrite.show = false;
            this.header.show = false;
            this.cross.show = false;
            this.retry.show = false;
            this.plugin.show = false;
            // this.redirect.show = false;
            // this.iplist.show = false;
            // this.routelimit.show = false;
            this.fileCache.show = false;
            this.imageCache.show = false;
            this.requests.show = false;
            this[this.activeName].show = true;
        },
        show(val){
            this.showDrower = val;
            if(!val){return}
            this.getData();
            this.getGroups();
            this.activeName = this.hideRewrite? 'header' : 'rewrite';
            this[this.hideRewrite? 'header' : 'rewrite'].show = true;
        },
        data: "getData",
    },
    beforeUnmount(){},
    methods: {
        
        multipleAsync(){
            this.getData();
            let o = {}
            if(!this.hideRewrite){ o = {...o,...this.rewriteSubmit()} }
            o = {...o,...this.headerSubmit()};
            o = {...o,...this.crossSubmit()};
            o = {...o,...this.retrySubmit()};
            o = {...o,...this.requestsSubmit()};
            o = {...this.appData,...o};
            return o;
        },

        changeGroup(v){
            return k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ v).then(res=>{
                this.requests.service = '';
                this.appList = res.data?.status?.items?.map(i=>{
                    return {
                        title: i.title || i.name,
                        name: i.name,
                        kind: i.kind?.toLowerCase()+'s',
                    }
                });
            });
        },
        getGroups(){
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+this.namespaceActive+'/appgroups').then(res=>{
                let items = res?.data?.items;
                this.groupList =items?.map(i=>{
                    return {
                        title: i.metadata?.annotations?.title || i.metadata?.name,
                        name: i.metadata?.name,
                        kind: i.kind?.toLowerCase()+'s',
                    }
                });
            });
        },
        getData(){
            if(this.isMicroComponents){
                // 兼容制品库
                this.appData = JSON.parse(JSON.stringify(this.data || {}));
            }else{
                if(!this.data || !this.data.spec){return}
                this.appData = JSON.parse(JSON.stringify(this.data?.metadata?.annotations||{}));
            }

            let a = this.appData || {};
            this.rewrite.enable = a['higress.io/enable-rewrite']=='true' || false;
            this.rewrite.path = a[(a['higress.io/enable-rewrite']=='true'?'':'disabled.')+'higress.io/rewrite-target'] || '';
            this.rewrite.host = a[(a['higress.io/enable-rewrite']=='true'?'':'disabled.')+'higress.io/upstream-vhost'] || '';
            
            this.header.enable = a['higress.io/enable-header-control']=='true' || false;
            let list = [];
            for(let i in a){
                let match = i.match(/^(disabled\.)?higress\.io\/(request|response)\-header\-control\-(add|remove|update)/);
                if(!match){continue}
                let values = a[i].split('\n');
                for(let j in values){
                    let v = values[j].trim();
                    if(!v){continue}
                    let key = v.split(' ')[0].trim();
                    let value = v.split(' ')[1].trim();
                    list.push({type:match[2],operation:match[3],key,value});
                }
            }
            this.header.list = list;

            this.cross.enable = a['higress.io/enable-cors']=='true' || false;
            this.cross.origin = a[(a['higress.io/enable-cors']=='true'?'':'disabled.')+'higress.io/cors-allow-origin'] || '*';
            this.cross.methods = a[(a['higress.io/enable-cors']=='true'?'':'disabled.')+'higress.io/cors-allow-methods']?.split(",") || [];
            this.cross.headerAccept = a[(a['higress.io/enable-cors']=='true'?'':'disabled.')+'higress.io/cors-allow-headers'] || '*';
            this.cross.headerData = a[(a['higress.io/enable-cors']=='true'?'':'disabled.')+'higress.io/cors-expose-headers'] || '*';
            this.cross.credentials = a[(a['higress.io/enable-cors']=='true'?'':'disabled.')+'higress.io/cors-allow-credentials']=='true' || false;
            this.cross.age = a[(a['higress.io/enable-cors']=='true'?'':'disabled.')+'higress.io/cors-max-age'] || '1800';

            this.retry.enable = a['higress.io/enable-proxy-next-upstream']=='true' || false;
            this.retry.tries = a[(a['higress.io/enable-proxy-next-upstream']=='true'?'':'disabled.')+'higress.io/proxy-next-upstream-tries'] || '0';
            this.retry.timeout = a[(a['higress.io/enable-proxy-next-upstream']=='true'?'':'disabled.')+'higress.io/proxy-next-upstream-timeout'] || '5';
            this.retry.requirement = a[(a['higress.io/enable-proxy-next-upstream']=='true'?'':'disabled.')+'higress.io/proxy-next-upstream']?.split(",") || [];

            this.redirect.enable = Boolean(a['higress.io/permanent-redirect'] || a['higress.io/temporal-redirect']);
            this.redirect.type = (a['higress.io/permanent-redirect']||a['disabled.higress.io/permanent-redirect'])? 'permanent' : ((a['higress.io/temporal-redirect']||a['disabled.higress.io/temporal-redirect'])? 'temporal' : 'permanent');
            this.redirect.host = a['higress.io/permanent-redirect'] || a['disabled.higress.io/permanent-redirect'] || a['higress.io/temporal-redirect'] || a['disabled.higress.io/temporal-redirect'] || '';

            this.iplist.enable = Boolean(a?.['nginx.ingress.kubernetes.io/whitelist-source-range']);
            this.iplist.text = (a?.['nginx.ingress.kubernetes.io/whitelist-source-range']||a?.['disabled.nginx.ingress.kubernetes.io/whitelist-source-range'])?.split(',')?.join('\n') || '';
            this.iplist.value = (a?.['nginx.ingress.kubernetes.io/whitelist-source-range']||a?.['disabled.nginx.ingress.kubernetes.io/whitelist-source-range'])?.split(',') || [];

            this.routelimit.enable = Boolean(this.appData?.['higress.io/route-limit-rpm'] || this.appData?.['higress.io/route-limit-rps'] || this.appData?.['higress.io/route-limit-burst-multiplier']);
            this.routelimit.rpm = this.appData?.['higress.io/route-limit-rpm'] || this.appData?.['disabled.higress.io/route-limit-rpm'] || '';
            this.routelimit.rps = this.appData?.['higress.io/route-limit-rps'] || this.appData?.['disabled.higress.io/route-limit-rps'] || '';
            this.routelimit.bm = this.appData?.['higress.io/route-limit-burst-multiplier'] || this.appData?.['disabled.higress.io/route-limit-burst-multiplier'] || '5';

            this.errorPage.enable = Boolean(this.appData?.['nginx.ingress.kubernetes.io/custom-http-errors'] || this.appData?.['nginx.ingress.kubernetes.io/default-backend']);
            this.errorPage.service = this.appData?.['nginx.ingress.kubernetes.io/default-backend'] || this.appData?.['disabled.nginx.ingress.kubernetes.io/default-backend'] || '';
            this.errorPage.codes = this.appData?.['nginx.ingress.kubernetes.io/custom-http-errors']?.split(',') || this.appData?.['disabled.nginx.ingress.kubernetes.io/custom-http-errors']?.split(',') || [];
        },
        requestsSubmit(){
            let a = this.redirectSubmit();
            let b = this.iplistSubmit();
            let c = this.routelimitSubmit();
            let d = this.errorPageSubmit();

            if(this.multiple){ return {} }
            
            if(a && b && c && d){
                this.submit([{
                    op: 'replace',
                    path: '/metadata/annotations',
                    value: { ...this.appData },
                }])
            }
        },
        errorPageSubmit(){
            if(this.errorPage.enable){
                if(!this.errorPage.service){ this.$message.error('请选择容灾服务'); return false;}
                if(!this.errorPage.codes?.length){ this.$message.error('请选择HTTP响应码'); return false;}
            }
            delete this.appData['nginx.ingress.kubernetes.io/custom-http-errors'];
            delete this.appData['disabled.nginx.ingress.kubernetes.io/custom-http-errors'];
            delete this.appData['nginx.ingress.kubernetes.io/default-backend'];
            delete this.appData['disabled.nginx.ingress.kubernetes.io/default-backend'];
            this.appData[(this.errorPage.enable?'':'disabled.') + 'nginx.ingress.kubernetes.io/default-backend'] = this.errorPage.service;
            this.appData[(this.errorPage.enable?'':'disabled.') + 'nginx.ingress.kubernetes.io/custom-http-errors'] = this.errorPage.codes.join(',');
            return true;
        },
        routelimitSubmit(){
            delete this.appData['higress.io/route-limit-rpm'];
            delete this.appData['higress.io/route-limit-rps'];
            delete this.appData['higress.io/route-limit-burst-multiplier'];
            delete this.appData['disabled.higress.io/route-limit-rpm'];
            delete this.appData['disabled.higress.io/route-limit-rps'];
            delete this.appData['disabled.higress.io/route-limit-burst-multiplier'];
            this.appData[(this.routelimit.enable?'':'disabled.')+'higress.io/route-limit-rpm'] = this.routelimit.rpm;
            this.appData[(this.routelimit.enable?'':'disabled.')+'higress.io/route-limit-rps'] = this.routelimit.rps;
            this.appData[(this.routelimit.enable?'':'disabled.')+'higress.io/route-limit-burst-multiplier'] = this.routelimit.bm;
            // this.submit({ ...this.appData });
            return true;
        },
        iplistSubmit(){
            let list = this.iplist.text.split('\n').filter(i=>i);
            delete this.appData['nginx.ingress.kubernetes.io/whitelist-source-range'];
            delete this.appData['disabled.nginx.ingress.kubernetes.io/whitelist-source-range'];
            this.appData[(this.iplist.enable?'':'disabled.')+'nginx.ingress.kubernetes.io/whitelist-source-range'] =  list.join(',');
            // this.submit({ ...this.appData });
            return true;
        },
        rewriteSubmit(){
            let o = { annotations:{"higress.io/enable-rewrite": this.rewrite.enable.toString() }};
            o["annotations"][(this.rewrite.enable?'':'disabled.')+"higress.io/upstream-vhost"] = this.rewrite.host;
            o["annotations"][(this.rewrite.enable?'':'disabled.')+"higress.io/rewrite-target"] = this.rewrite.path;
            
            delete this.appData[(this.rewrite.enable?'disabled.':'')+"higress.io/upstream-vhost"];
            delete this.appData[(this.rewrite.enable?'disabled.':'')+"higress.io/rewrite-target"];

            if(this.multiple){ return o.annotations; }

            this.submit([{
                op: 'replace',
                path: '/metadata/annotations',
                value: {
                    ...this.appData,
                    ...o.annotations,
                },
            }])
        },
        headerSubmit(){
            let o = { annotations:{"higress.io/enable-header-control": this.header.enable.toString() }};
            this.header.list?.filter(i=>i.key&&i.value&&i.type&&i.operation)?.map(item=>{
                let objkey = `${this.header.enable?'':'disabled.'}higress.io/${item.type}-header-control-${item.operation}`;
                o['annotations'][objkey] = o['annotations'][objkey] || [];
                o['annotations'][objkey].push(`${item.key} ${item.value}`);
            })
            for(let i in o.annotations){
                if(i=="higress.io/enable-header-control"){continue}
                o['annotations'][i] = o['annotations'][i].join("\n");
            }
            for(let i in this.appData){
                let match = i.match(/^(disabled\.)?higress\.io\/(request|response)\-header\-control\-(add|remove|update)/);
                if(!match){continue}
                delete this.appData[i];
            }
            
            if(this.multiple){ return o.annotations; }

            this.submit([{
                op: 'replace',
                path: '/metadata/annotations',
                value: {
                    ...this.appData,
                    ...o.annotations,
                },
            }])
        },
        crossSubmit(){
            let o = { annotations:{"higress.io/enable-cors": this.cross.enable.toString() }};
            o["annotations"][(this.cross.enable?'':'disabled.')+"higress.io/cors-allow-origin"] = this.cross.origin;
            o["annotations"][(this.cross.enable?'':'disabled.')+"higress.io/cors-allow-methods"] = this.cross.methods?.join(",") || '';
            o["annotations"][(this.cross.enable?'':'disabled.')+"higress.io/cors-allow-headers"] = this.cross.headerAccept;
            o["annotations"][(this.cross.enable?'':'disabled.')+"higress.io/cors-expose-headers"] = this.cross.headerData;
            o["annotations"][(this.cross.enable?'':'disabled.')+"higress.io/cors-allow-credentials"] = this.cross.credentials.toString();
            o["annotations"][(this.cross.enable?'':'disabled.')+"higress.io/cors-max-age"] = this.cross.age;
            delete this.appData[(this.cross.enable?'disabled.':'')+"higress.io/cors-allow-origin"];
            delete this.appData[(this.cross.enable?'disabled.':'')+"higress.io/cors-allow-methods"];
            delete this.appData[(this.cross.enable?'disabled.':'')+"higress.io/cors-allow-headers"];
            delete this.appData[(this.cross.enable?'disabled.':'')+"higress.io/cors-expose-headers"];
            delete this.appData[(this.cross.enable?'disabled.':'')+"higress.io/cors-allow-credentials"];
            delete this.appData[(this.cross.enable?'disabled.':'')+"higress.io/cors-max-age"];

            if(this.multiple){ return o.annotations; }

            this.submit([{
                op: 'replace',
                path: '/metadata/annotations',
                value: {
                    ...this.appData,
                    ...o.annotations,
                },
            }])
        },
        retrySubmit(){
            let o = { annotations:{"higress.io/enable-proxy-next-upstream": this.retry.enable.toString() }};
            o["annotations"][(this.retry.enable?'':'disabled.')+"higress.io/proxy-next-upstream-tries"] = this.retry.tries.toString();
            o["annotations"][(this.retry.enable?'':'disabled.')+"higress.io/proxy-next-upstream-timeout"] = this.retry.timeout.toString();
            o["annotations"][(this.retry.enable?'':'disabled.')+"higress.io/proxy-next-upstream"] = this.retry.requirement?.join(",") || '';
            delete this.appData[(this.retry.enable?'disabled.':'')+"higress.io/proxy-next-upstream-tries"]
            delete this.appData[(this.retry.enable?'disabled.':'')+"higress.io/proxy-next-upstream-timeout"]
            delete this.appData[(this.retry.enable?'disabled.':'')+"higress.io/proxy-next-upstream"]
            
            if(this.multiple){ return o.annotations; }

            this.submit([{
                op: 'replace',
                path: '/metadata/annotations',
                value: {
                    ...this.appData,
                    ...o.annotations,
                },
            }])
        },
        redirectSubmit(){
            if(!this.redirect.type){ this.$message.error("请选择重定向"); return false; }
            if(this.redirect.enable){
                if(!this.redirect.host){ this.$message.error("请输入重定向地址"); return false; }
                if(!/^https?:\/\//.test(this.redirect.host)){ this.$message.error("重定向地址必须包含scheme（http or https)"); return false; }
            }
            delete this.appData['higress.io/permanent-redirect'];
            delete this.appData['higress.io/temporal-redirect'];
            delete this.appData['disabled.higress.io/permanent-redirect'];
            delete this.appData['disabled.higress.io/temporal-redirect'];
            this.appData[(this.redirect.enable?'':'disabled.')+'higress.io/'+ this.redirect.type +'-redirect'] = this.redirect.host;
            // this.submit({ ...this.appData });
            return true;
        },

        submit(o, callback){
            this.$emit('submit', o, callback);
        },
        close(){
            this.$emit('cancel');
        },
    },
}
</script>

<style scoped>
.checkbox-group{width:100%; display:grid; grid-template-columns:1fr 1fr 1fr 1fr; grid-gap:0 10px;}
.table{width:100%;}
.table td{padding:10px; line-height:1.4; border:1px solid #eee; border-left:0; border-right:0;}
.table tr:last-child td{background:transparent;}
.table tr:first-child td{background:#f3f3f3; border-top:0;}
</style>
<style>
.yaml-drawer .el-drawer__header{margin-bottom:0!important; padding:10px 20px!important;}
.yaml-drawer .el-drawer__body{padding:10px 20px 20px;}
.plugin-tags .arco-tag{background-color:var(--color-fill-2);}
</style>
