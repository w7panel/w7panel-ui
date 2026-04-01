<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div>
            <a-button v-if="permission.includes('app-apps-add')" class="mr-20" type="primary" @click="openForm()"><template #icon><icon-plus /></template>新建</a-button>
            <a-badge text="推荐" class="mr-20">
                <a-button type="outline" @click="$router.push('/app/store')">应用商店</a-button>
            </a-badge>
            <a-button v-if="clusterInfo.exist && clusterInfo.valid" type="outline" class="mr-20" @click="$router.push('/app/cloudstore')">云端应用商店</a-button>
            <a-popover v-if="clusterInfo.exist && !clusterInfo.valid">
                <a-button disabled type="outline" class="mr-20">云端应用商店</a-button>
                <template #content>
                    <span>控制台授权已过期, 请<span class="cursor c-blue" @click="$router.push('/system/cloud?forcebind=true')">重新绑定</span></span>
                </template>
            </a-popover>
            <a-button type="outline" class="mr-20" @click="dcForm.show=true;">DockerCompose创建</a-button>
            <a-button type="outline" class="mr-20" @click="k8syaml.show=true;">K8sYaml创建</a-button>
            <!-- <a-button type="outline" class="mr-20" @click="codepack.show=true;">代码包创建</a-button> -->
            <a-button type="outline" class="mr-20" @click="helm.show=true;">Helm创建</a-button>
            <a-button v-if="zpk.show" type="outline" class="mr-20" @click="$router.push('/app/store/w7-zpkv2/store')" >制品商店</a-button>
        </div>
        <div class="bg-white padding-20 mt-20">
            <a-table :data="data" class="filetable applisttable" :bordered="false" :pagination="false">
                <template #columns>
                    <a-table-column title="站点域名">
                        <template #cell="{ record }">
                            <div v-if="record.domain_apps && record.domain_apps.length" >
                                <div v-if="record.deployStatus=='deploying'||record.deployStatus=='failed'">

                                    <span v-if="record.domain_apps.length==1" class="c-99">{{record.domain_apps[0]}}</span>
                                    <a-popover v-else position="bottom" content-style="padding:6px 10px 10px;">
                                        <div class="df df-c lh-1 cursor" style="display:inline-flex;">
                                            <span class="c-99">{{record.domain_apps[0]}}</span>
                                            <span class="c-99 fs-12 mt-4">等{{record.domain_apps.length}}个域名</span>
                                        </div>
                                        <template #content>
                                            <div class="df df-c">
                                                <span v-for="domain in record.domain_apps" :key="domain.domain" class="c-99" style="white-space:nowrap;text-decoration:none;">{{domain}}</span>
                                            </div>
                                        </template>
                                    </a-popover>
                                </div>
                                <div v-else>
                                    <a v-if="record.domain_apps.length==1" class="cursor c-blue" target="_blank" :href="record.domain_apps[0]">{{record.domain_apps[0]}}</a>
                                    <a-popover v-else position="bottom" content-style="padding:6px 10px 10px;">
                                        <div class="df df-c lh-1 cursor" style="display:inline-flex;">
                                            <a class="cursor c-blue" target="_blank" :href="record.domain_apps[0]">{{record.domain_apps[0]}}</a>
                                            <span class="c-blue fs-12 mt-4">等{{record.domain_apps.length}}个域名</span>
                                        </div>
                                        <template #content>
                                            <div class="df df-c">
                                                <a v-for="domain in record.domain_apps" :key="domain.domain" :href="domain" class="cursor c-blue" style="white-space:nowrap;text-decoration:none;" target="_blank">{{domain}}</a>
                                            </div>
                                        </template>
                                    </a-popover>
                                </div>
                            </div>
                            <span v-else>-</span>
                        </template>
                    </a-table-column>
                    <a-table-column title="应用名称">
                        <template #cell="{ record }">
                            <!-- 部署中 部署失败 -->
                            <div v-if="record.deployStatus=='deploying'||record.deployStatus=='failed'" class="df df-inline ai-c">
                                <span class="point orange"></span>
                                <!-- icon -->
                                <img v-if="record.icon && !record.iconLoadError" :src="record.icon" alt="" class="icon" @error="record.iconLoadError = true" />
                                <icon-common v-show="!record.icon || record.iconLoadError" class="icon" />
                                <!-- title -->
                                <span v-if="record.childrenApp.length<=1" class="cursor lh-1 c-orange" @click="$router.push('/app/store-install?completeName='+record.groupName)">{{record.title || record.name}}</span>
                                <a-popover v-else position="bottom" content-style="padding:6px 10px 10px;">
                                    <div class="df df-c lh-1 cursor c-orange" style="display:inline-flex;" @click="$router.push('/app/store-install?completeName='+record.groupName)">
                                        <span>{{record.title || record.name}}</span>
                                        <span class="fs-12 mt-4">等{{record.childrenApp.length}}个应用</span>
                                    </div>
                                    <template #content>
                                        <div class="df df-c">
                                            <span v-for="c in record.childrenApp" :key="c.name" class="cursor c-orange" @click="$router.push('/app/store-install?completeName='+record.groupName)">{{c.title}}</span>
                                        </div>
                                    </template>
                                </a-popover>
                            </div>
                            <!-- 部署成功 -->
                            <div v-else class="df df-inline ai-c">
                                <span class="point" :class="{red:record.status==2, gray:record.status==0}"></span>
                                <!-- icon -->
                                <img v-if="record.icon && !record.iconLoadError" :src="record.icon" alt="" class="icon" @error="record.iconLoadError = true" />
                                <icon-common v-show="!record.icon || record.iconLoadError" class="icon" />
                                <!-- title -->
                                <span v-if="record.childrenApp.length<=1" class="cursor lh-1" :class="{'c-blue':!record.deletionTimestamp,'c-99':record.deletionTimestamp}" @click="toDetail(record)">
                                    <span>{{record.title || record.name}}</span>
                                     <!-- :popup-visible="editTitle.appgroup==record.groupName" -->
                                    <a-popover title="修改名称" trigger="click" @popup-visible-change="v=>v?editTitle={title:record.title||record.name,appgroup:record.groupName}:null">
                                        <icon-edit class="ml-6 cursor edittitle" @click.stop />
                                        <template #content>
                                            <a-input v-model="editTitle.title" size="small" style="width:200px;" placeholder="请输入名称"/>
                                            <a-button type="primary" size="small" class="ml-10" @click.stop="submitEditTitle">确定</a-button>
                                            <!-- <a-button size="small" class="ml-4" @click.stop="editTitle.appgroup=''">取消</a-button> -->
                                        </template>
                                    </a-popover>
                                </span>
                                <a-popover v-else position="bottom" content-style="padding:6px 10px 10px;">
                                    <div class="df df-c lh-1 cursor" :class="{'c-blue':!record.deletionTimestamp,'c-99':record.deletionTimestamp}" style="display:inline-flex;" @click="toDetail(record)">
                                        <span>
                                            <span>{{record.title || record.name}}</span>
                                                                 
                                            <a-popover title="修改名称" trigger="click" @popup-visible-change="v=>v?editTitle={title:record.title||record.name,appgroup:record.groupName}:null">
                                                <icon-edit class="ml-6 cursor edittitle" @click.stop />
                                                <template #content>
                                                    <a-input v-model="editTitle.title" size="small" style="width:200px;" placeholder="请输入名称"/>
                                                    <a-button type="primary" size="small" class="ml-10" @click.stop="submitEditTitle">确定</a-button>
                                                    <!-- <a-button size="small" class="ml-4" @click.stop="editTitle.appgroup=''">取消</a-button> -->
                                                </template>
                                            </a-popover>
                                        </span>
                                        <span class="fs-12 mt-4">等{{record.childrenApp.length}}个应用</span>
                                    </div>
                                    <template #content>
                                        <div class="df df-c">
                                            <span v-for="c in record.childrenApp" :key="c.name" class="cursor" :class="{'c-blue':!record.deletionTimestamp,'c-99':record.deletionTimestamp}" @click="toDetail(record)">{{c.title}}</span>
                                        </div>
                                    </template>
                                </a-popover>
                                

                                <span v-if="record.deletionTimestamp" class="c-99 ml-10">删除中...</span>
                            </div>
                            <div v-if="record.upgrade && record.upgrade.canUpgrade" class="df df-inline ai-c">
                                <a-popover position="bottom" trigger="click" content-style="padding:6px 10px 16px;">
                                    <div class="cursor ml-10" style="color:rgb(var(--red-7));">
                                        <icon-exclamation-circle-fill />
                                        <span class="ml-2">新版本</span>
                                    </div>
                                    <template #content>
                                        <div>
                                            <div class="df ai-c" style="color:rgb(var(--red-7));">
                                                <icon-exclamation-circle-fill />
                                                <span class="ml-4 fs-16 b">新版本</span>
                                            </div>
                                            <div class="mt-10 c-00-6 txt-c" >当前应用有新版发布，建议及时更新并查阅版本更新说明</div>
                                            <div class="mt-10 df ai-c jc-a">
                                                <a-button size="small" @click="versionupgrade={show:true,...record.upgrade}">查看更新说明</a-button>
                                                <a-button size="small" type="primary" @click="toUpgrade(record)">立即更新</a-button>
                                            </div>
                                        </div>
                                    </template>
                                </a-popover>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="创建时间">
                        <template #cell="{ record }">
                            {{record.createTime}}
                        </template>
                    </a-table-column>
                    <a-table-column title="操作" width="300">
                        <template #cell="{ record }">
                            <div v-if="record.deployStatus=='deploying'||record.deployStatus=='failed'">
                                <a-popconfirm v-if="(usermode!=='cluster'||!/^w7panel-((offline)|(k3k))(-|$)/.test(record.groupName)) && record.groupName!=='w7panel'" :content="'确认要删除吗'" @ok="del(record)" position="lt">
                                    <span :id="'app-'+record.groupName" class="c-blue cursor operation">删除</span>
                                </a-popconfirm>
                            </div>
                            <div v-else>
                                <span class="c-blue cursor operation" @click="toAppMenu(record,'app-detail-domain')">域名管理</span>
                                 <!-- v-if="permission.includes('app-apps-files')" -->
                                <span v-if="fileeditor" class="c-blue cursor operation ml-10" @click="toAppMenu(record,'app-detail-files')">文件管理</span>
                                <a-popconfirm v-if="(usermode!=='cluster'||!/^w7panel\-((offline)|(k3k))(-|$)/.test(record.groupName)) && record.groupName!=='w7panel' && permission.includes('app-apps-delete') " :content="'确认要删除吗'" @ok="del(record)" position="lt">
                                    <span :id="'app-'+record.groupName" class="c-blue cursor operation ml-10">删除</span>
                                </a-popconfirm>
                            </div>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>
        
        <a-modal v-model:visible="versionupgrade.show" @ok="versionupgrade.show=false" hide-cancel :popup-container="false?'#allmodalbox':'body'">
            <template #title>版本说明</template>
            <div>
                <div class="df ai-c jc-b">
                    <div class="df ai-c">
                        <div class="newversion">新版本</div>
                        <span class="c-00-9 fs-16 ml-10">版本: {{versionupgrade.version}}</span>
                    </div>
                    <div class="c-99">{{versionupgrade.date}}</div>
                </div>
                <div class="mt-20 c-00-6 fs-14" style="line-height:22px;">{{versionupgrade.descript}}</div>
            </div>
        </a-modal>

        <form-drawer :show="form.show" :id="form.id" @close="closeForm"></form-drawer>
        <dcform-drawer :show="dcForm.show" @close="closeForm"></dcform-drawer>
        <addapp-drawer :show="addForm.show" @close="closeForm"></addapp-drawer>
        <k8syaml-drawer :show="k8syaml.show" @close="closeForm" ></k8syaml-drawer>
        <codepack-drawer :show="codepack.show" @close="closeForm" ></codepack-drawer>
        <helm-form :show="helm.show" @close="closeForm" ></helm-form>
        
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import { useNamespaceStore } from '@/store';
import formDrawer from '../pages/form-drawer.vue';
import dcformDrawer from '@/components/dcform-drawer.vue';
import addappDrawer from '@/components/addapp-drawer.vue';
import k8syamlDrawer from '@/components/k8syaml-drawer.vue';
import codepackDrawer from '@/components/codepack-drawer.vue';
import helmForm from '../pages/helm-form.vue';
import { getPermission,getFileEditor,getUserInfo } from '@/utils/auth';

export default {
    data(){
        return {
            namespaceActive: '',
            form: { show: false, id: '' },
            dcForm: { show: false },
            addForm: { show: false },
            k8syaml: { show: false },
            codepack: { show: false },
            data: [],

            versionupgrade: {
                show: false,
                version: '',
                date: '',
                descript: '',
            },

            clusterInfo: {
                exist: false,
                valid: false,
                token: '',
            },

            helm: {
                show: false,
            },

            leavePage: false,

            zpk: {
                show: false,
            },
            permission: [],
            fileeditor: '',
            thirdparty_cd_token: '',

            clusterId: '',
            usermode: '',

            editTitle: {
                title: '',
                appgroup: '',
            },
        }
    },
    created(){
        this.usermode = getUserInfo()?.['w7.cc/user-mode'];
        this.fileeditor = getFileEditor()=='true';
        this.permission = getPermission() || [];
        this.namespaceActive = useNamespaceStore().namespace;
        
        this.getList();
        this.getClusterInfo();
        this.getZpk();
    },
    components: {
        formDrawer,
        dcformDrawer,
        addappDrawer,
        k8syamlDrawer,
        codepackDrawer,
        helmForm,
    },
    unmounted(){
        this.leavePage = true;
    },
    methods: {
        submitEditTitle(){
            k8sproxy.patch('/apis/appgroup.w7.cc/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.editTitle.appgroup,[{
                op: 'replace',
                path: '/spec/title',
                value: this.editTitle.title
            }],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.editTitle.appgroup = '';
                this.refreshList();
            })
        },
        getZpk(){
            // k8sproxy.get('/apis/microapp.w7.cc/v1alpha1/namespaces/'+ this.namespaceActive +'/microapps?labelSelector=w7.cc/identifie=w7-zpkv2',{noAlert:true}).then(res=>{
            //     if(res?.data?.items?.length){ this.zpk.show = true; }
            // })
            panelApi.get('/zpk/local-url').then(res=>{
                this.zpk.show = res?.data?.isHttps;
            })
        },
        toUpgrade(item){
            let domain = item?.defaultDomain || item?.domain_apps?.[0] || '';
            let zpkurl = item?.upgrade?.zpkUrl || item?.zpkurl;
            console.log('zpkurl:',zpkurl)
            if(!zpkurl){ return }
            
            this.$router.push('/app/store-install?path='+encodeURIComponent(zpkurl)+'&releasename='+item.groupName+'&domain='+encodeURIComponent(domain)+'&thirdpartyCDToken='+this.thirdparty_cd_token + '&insClusterId=' + this.clusterId);

        },
        getClusterInfo(){
            panelApi.get("/auth/console/info").then(res=>{
                this.clusterId = res?.data?.cluster_id;
                this.clusterInfo.exist = res?.data?.is_register;
                this.clusterInfo.token = res?.data?.thirdparty_cd_token;
                if(!res?.data?.is_register){return}
                axios.get('https://console.w7.cc/api/thirdparty-cd/userinfo',{customToken:this.clusterInfo.token}).then(res=>{
                    this.clusterInfo.valid = res?.data?.is_valid;
                });
            })
        },
        openForm(v){
            if(v){
                this.form.id = v || '';
                this.form.show = true;
                return;
            }
            this.addForm.show = true;
        },
        closeForm(v){
            this.dcForm.show = false;
            this.form.show = false;
            this.addForm.show = false;
            this.k8syaml.show = false;
            this.codepack.show = false;
            this.helm.show = false;
            if(v){ this.getList(); }
        },
        toDetail(item){
            if(item.deletionTimestamp){return}
            let app = item?.childrenApp?.[0];
            if(item?.frontType?.includes('thirdparty_cd')){
                this.$router.push({path:'/app/appgroup/'+item.groupName+'/micro'});
                return;
            }
            if(item.isHelm){
                this.$router.push({path:'/app/appgroup/'+item.groupName+'/helm/detail'});
                return;
            }
            this.$router.push({name:'app-detail',params:{group:app?.group, id:app?.name, kind:app?.kind}});
        },
        toAppMenu(item,pathName){
            let app = item?.childrenApp?.[0];
            if(!app){return}
            if(item.isHelm && pathName=='app-detail-domain'){
                this.$router.push({name:'group-helm-domain',params:{group:app.group}})
                return;
            }
            this.$router.push({name:pathName,params:{group:app.group, id:app.name, kind:app.kind}})
        },
        async del(item){
            // if(item.childrenApp.length){
            //     for(let i=0; i<item.childrenApp.length; i++){
            //         await this.deleteApp(item.childrenApp[i]);
            //     }
            // }
            // // 删除域名
            // let domains = [];
            // await k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+ this.namespaceActive +'/ingresses?labelSelector=app='+item.name, {loading:true}).then(res=>{
            //     domains = res?.data?.items || [];
            // });
            // for(let i=0; i<domains.length; i++){
            //     let dm = domains[i]?.metadata?.name;
            //     await k8sproxy.delete("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+dm, {noAlert:true, loading: true});
            // }

            k8sproxy.delete('/apis/appgroup.w7.cc/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+item.groupName).then(res=>{
                this.$message.success('删除成功');
                this.getList();
            })
        },
        // deleteApp(item){
        //     // 删除应用
        //     return k8sproxy.delete("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ item.kind +"/"+ item.name).then(async ()=>{
        //         // 删除服务
        //         try{
        //             await k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/services/"+ item.name+'-lb', {noAlert:true})
        //         }catch(e){}
        //         // if(item.releaseName){
        //         //     // 删除helm
        //         //     await k8sproxy.delete("/api/v1/helm/releases/" + item.releaseName, {params:{namespace: item.namespace},noAlert:true});
        //         // }
        //         return;
        //     })
        // },
        refreshList(){
            return k8sproxy.get('/apis/appgroup.w7.cc/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups').then((res)=>{
                let list = res?.data?.items || [];
                list = list.filter(i=>!i?.metadata?.labels?.['w7.cc/parent']).map(i=>{
                    
                    let domain_apps = [];
                    let statusItem = i?.status?.items || [];
                    let childrenApp = statusItem.map(si=>({
                        title: si.title||si.name,
                        name: si.name,
                        kind: si.kind.toLowerCase() + 's',
                        ready: si.ready,
                        group: i.metadata.name,
                    }));
                    let frontType = [];
                    try{
                        domain_apps = JSON.parse(i?.metadata?.annotations?.['w7.cc/domains']);
                        const dedupeDomains = urls => {
                            const seen = new Set();
                            return urls.filter(url => {
                                const parsed = new URL(url);
                                // 提取协议后的完整内容
                                const key = parsed.href.slice(parsed.protocol.length).toLowerCase();
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    return true;
                                }
                                return false;
                            });
                        };
                        domain_apps = dedupeDomains(domain_apps);

                        frontType = JSON.parse(i?.metadata?.annotations?.['w7.cc/front-type']);
                    }catch(e){}
                    return {
                        title: i?.spec?.title || i.metadata.name,
                        deletionTimestamp: i?.metadata?.deletionTimestamp,
                        groupName: i.metadata.name,
                        namespace: this.namespaceActive,
                        icon: i?.spec?.logo,
                        createTime: window.formatDate(i?.metadata?.creationTimestamp),
                        creationTimestamp: new Date(i?.metadata?.creationTimestamp || 0).getTime(),
                        status: i.status?.isZeroReplicas? 0 : (i.status?.ready? 1 : 2),
                        deployStatus: i.status?.deployStatus,
                        zpkurl: i?.metadata?.annotations?.['w7.cc/zpk-url'] || '',
                        isHelm: i?.spec?.isHelm,
                        releaseName: '',
                        defaultDomain: '',
                        frontType,
                        childrenApp,
                        domain_apps,
                    }
                })
                list.sort((a,b)=>(b.creationTimestamp - a.creationTimestamp));
                this.data = list.filter(i=>!i.deletionTimestamp);
            })
        },
        getDomains(){
            return k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses?labelSelector=group&limit=500').then(res=>{
                let list = res?.data?.items || [];
                let domains = [];
                list.map(i=>{
                    let is_auto_ssl = i?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';
                    let domain = i?.spec?.rules?.[0]?.host;
                    
                    i?.spec?.rules?.[0]?.http?.paths?.map((p,index)=>{
                        domains.push({
                            group: i.metadata.labels.group,
                            fullDomain: (is_auto_ssl?'https://':'http://') + domain + p.path,
                        })
                    })
                })
                this.data = this.data.map(i=>{
                    i.domain_apps = domains.filter(d=>d.group==i.groupName).map(d=>d.fullDomain);
                    const set = new Set();
                    // 去重
                    i.domain_apps = i.domain_apps.filter(item => {
                        const key = item.replace(/^https?:\/\//, '');
                        return !set.has(key) && set.add(key);
                    });
                    return i;
                })
            })
        },
        async getList(){
            await this.refreshList();
            this.getDomains();

            let {data} = await panelApi.get('/auth/console/info?code=test');
            this.thirdparty_cd_token = data?.thirdparty_cd_token || '';
            
            // 使用批量请求替代串行请求，提升性能
            if (this.data.length > 0) {
                const batchSize = 10;
                const batches = [];
                for (let i = 0; i < this.data.length; i += batchSize) {
                    batches.push(this.data.slice(i, i + batchSize));
                }
                
                for (const batch of batches) {
                    if (this.leavePage) break;
                    
                    const promises = batch.map(item => {
                        if (!item) return Promise.resolve(null);
                        return axios.get(
                            '/panel-api/v1/zpk/upgrade-info?namespace=' + this.namespaceActive + 
                            '&releaseName=' + item.groupName + 
                            '&thirdpartyCDToken=' + this.thirdparty_cd_token,
                            { noAlert: true }
                        ).then(res => ({
                            index: this.data.findIndex(d => d.groupName === item.groupName),
                            data: res.data
                        })).catch(() => ({
                            index: this.data.findIndex(d => d.groupName === item.groupName),
                            data: null
                        }));
                    });
                    
                    const results = await Promise.all(promises);
                    results.forEach(result => {
                        if (result && result.index !== -1 && result.data) {
                            this.data[result.index].upgrade = { ...result.data };
                        }
                    });
                }
            }

        },
        createName(length){
            let len = length || 8;
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
<style scoped>
.com-table .icon{width:28px; height:28px; margin-right:10px; border-radius:10%;}
.com-table a{text-decoration:none;}
.filetable .icon{width:28px; height:28px; margin-right:10px; border-radius:10%;}
.filetable a{text-decoration:none;}
.point{width:8px; height:8px; border-radius:50%; background:#00A870; margin-right:6px;}
.point.red{background:#D00805;}
.point.gray{background:#999;}
.point.orange{background: rgb(var(--orange-6));}
</style>
<style>
.applisttable .edittitle{opacity:0;}
.applisttable .arco-table-tr:hover .edittitle{opacity:1;}
</style>