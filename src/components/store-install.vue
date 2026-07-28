<template>
    <div class="df df-c ai-c">
		<a-modal v-model:visible="installConflict.show" title="制品安装冲突" :footer="false" :mask-closable="false">
			<div v-if="installConflict.reason==='domain_mismatch'">
				<div>当前域名与订单原绑定域名不一致。</div>
				<div class="mt-10">原绑定域名：<strong>{{ installConflict.domain || '未知' }}</strong></div>
				<div class="mt-20 txt-r"><a-button type="primary" @click="installConflict.show=false">知道了</a-button></div>
			</div>
			<div v-else-if="installConflict.reason==='app_identify_exists'">
				<a-alert v-if="installConflict.params || installConflict.retryConfig" type="warning">该订单已有应用安装记录，请先卸载原应用，或强制清除旧记录后重新安装。</a-alert>
				<a-alert v-else type="warning">该订单已有应用安装记录，请先卸载原应用后重试。</a-alert>
				<div class="mt-10">原面板地址：<strong>{{ installConflict.panelUrl || '未知' }}</strong></div>
				<div class="mt-20 df jc-e">
					<a-button class="mr-10" @click="installConflict.show=false">取消</a-button>
					<a-button class="mr-10" :disabled="!installConflict.panelUrl" @click="openOriginalPanel">前往原面板卸载</a-button>
					<a-popconfirm v-if="installConflict.params || installConflict.retryConfig" content="强制清除会覆盖旧应用的安装记录，可能导致老应用状态丢失、无法继续升级。确定继续吗？" type="warning" position="bottom" @ok="forceReinstall">
						<a-button status="danger">强制清除并安装</a-button>
					</a-popconfirm>
				</div>
			</div>
		</a-modal>
        <div class="toptitle df jc-c" :style="{width:is_component?'800px':'1000px'}">
            <img v-if="info.icon" :src="info.icon" alt="" class="icon" @error="info.icon=''" />
            <icon-common v-else class="icon"  />
            <div class="df df-c jc-b" style="padding:0px 10px 0px;">
                <div class="fs-24 c-ee">{{ info.title }}</div>
                <div>
                    <div class="fs-14 c-99">标识：{{ identifie }}</div>
                    <div v-if="infoversion" class="fs-14 c-99 mt-4">版本：{{ infoversion }}</div>
                </div>
            </div>
        </div>
        <div class="df ai-c progress c-00-6">
            <div class="df ai-c" :class="{'c-blue':step>=2}">
                <div v-if="step<=2" class="no">1</div>
                <div v-if="step>2" class="over df ai-c jc-c"><icon-check /></div>
                <div class="fs-14 lh-1">环境变量配置</div>
            </div>
            <div class="line" :class="{active:step>2}"></div>
            <div class="df ai-c" :class="{'c-blue':step==3}">
                <div class="no">2</div>
                <div class="fs-14 lh-1">安装</div>
            </div>
        </div>

        <div class="mt-40" style="width:720px;">
            <div v-if="step==2">
                <a-tabs v-model:active-key="form.activeIdentifie" type="card-gutter" class="zpkinstalltabs">
                    <a-tab-pane v-for="item in form.forms" :disabled="true" :key="item.identifie">
                        <template #title>
                            <span>{{item.name}}</span>
                            <!-- item.isInstall 选择是否安装 -->
                            <a-switch v-if="!item.requireInstall" v-model="item.isInstall" @click.stop size="small" class="ml-10" @change="switchChange(item.identifie)" ></a-switch>
                        </template>
                        <div style="padding:20px 30px;">
                            <a-alert v-if="installAlert[form.activeIdentifie] && installAlert[form.activeIdentifie].length" type="warning" class="mb-20">
                                <template #title>依赖安装检测，请及时处理未安装应用</template>
                                <div>
                                    <div v-for="item in installAlert[form.activeIdentifie]" :key="item.name" class="fs-14 c-99 mt-10">
                                        <!-- item.isInstall 是否已经安装某个依赖 -->
                                        <span :class="(item.isInstall||item.allReplace)?'c-green':'c-red'" class="va-middle">检测到{{item.title || item.name}}，</span>
                                        <span>
                                            <span v-if="item.isInstall" class="va-middle c-green">已安装</span>
                                            <span v-else-if="item.allReplace" class="va-middle c-green">无需安装</span>
                                            <span v-else class="va-middle c-red">未安装</span>
                                            <icon-check-circle-fill v-if="(item.isInstall||item.allReplace)" class="va-middle ml-4 c-green fs-14" />
                                            <icon-close-circle-fill v-else class="va-middle ml-4 c-red fs-14" />
                                            
                                            <a-tooltip v-if="!item.isInstall" :content="item.required?'强制安装，必须先安装该应用后才可进行下一步操作':'不强制安装，可通过自定义填写对应的配置项来取消安装'">
                                                <a-button size="mini" class="ml-10 super-mini-btn" type="outline" @click="$emit('needInstall',item.name,testModuleNames);">
                                                    <template #icon><icon-download /></template>
                                                    <span v-if="item.required">必选安装</span>
                                                    <span v-else>可选安装</span>
                                                </a-button>
                                            </a-tooltip>
                                        </span>
                                    </div>
                                </div>
                            </a-alert>
                            <a-alert v-if="item.requireParentReleaseName && (!rpList[item.parentIdentifie]||!rpList[item.parentIdentifie].length)" type="warning" class="mb-20">
                                <template #title>依赖安装检测，请及时处理未安装应用</template>
                                <div class="fs-14 c-99 mt-10">
                                    <span class="c-red va-middle">未安装主应用</span>
                                    <icon-close-circle-fill class="va-middle ml-4 c-red fs-14" />
                                    <a-button size="mini" class="ml-10 super-mini-btn" type="outline" @click="$emit('needInstall',item.parentIdentifie,mainAppTest);">
                                        <template #icon><icon-download /></template>
                                        <span>去安装</span>
                                    </a-button>
                                </div>
                            </a-alert>
                            <a-form :ref="'form-'+item.identifie" :model="item" auto-label-width >
                                <div v-if="item.identifie==form.forms[0].identifie">
                                    <a-form-item v-if="form.requireDomain" label="域名" field="ingressHost" :rules="domainRules">
                                        <template #label>
                                            <span class="form-label">域名</span>
                                        </template>
                                        <div v-if="configConsole.isConsole && configConsole.domains.length && configConsole.isSelect" class="df" style="flex:1;">
                                            <a-select v-model="form.fullDomain" placeholder="请选择" @change="selectDomain">
                                                <a-option v-for="dm in configConsole.domains" :key="dm.deployItemId" :disabled="dm.enabled===false" :label="dm.siteUrl" :value="dm.deployItemId"></a-option>
                                            </a-select>
                                            <a-button v-if="configConsole.canInput" class="ml-10" type="primary" @click="configConsole.isSelect=false;form.ingressHost=form.fullDomain?'':form.ingressHost;">解锁</a-button>
                                        </div>
                                        <div v-else style="flex:1;">
                                            <div>
                                                <a-select v-if="configIngress.length" v-model="form.ingressSeletorName" :disabled="form.ingressDisabled" style="margin-bottom:10px;">
                                                    <a-option v-for="item in configIngress" :key="item.name" :value="item.name">{{item.name}}</a-option>
                                                </a-select>
                                            </div>
                                            <div class="df ai-c">
                                                <a-input v-model="form.ingressHost" :disabled="form.ingressDisabled || (whiteList.length && whiteList[form.whiteDomain].prefixRandom)" :spellcheck="false" :placeholder="'请输入域名'+(whiteList.length?'前缀':'')" style="width:420px;">
                                                    <template #prepend>
                                                        <a-select v-model="form.ingressHostPre" :disabled="true">
                                                            <a-option label="http://" value="http://"></a-option>
                                                            <a-option label="https://" value="https://"></a-option>
                                                        </a-select>
                                                    </template>
                                                    <template v-if="whiteList.length" #append>
                                                        <a-select v-model="form.whiteDomain" @change="whiteList[form.whiteDomain].prefixRandom?form.ingressHost=createShortUuid():null;">
                                                            <a-option v-for="(wd,wdid) in whiteList" :key="wdid" :label="'.'+wd.domain" :value="wdid"></a-option>
                                                        </a-select>
                                                    </template>
                                                </a-input>
                                                <a-checkbox class="df-s0 ml-10" :disabled="form.ingressDisabled || requireDomainHttps || configConsole.isConsole" v-model="form.auto_ssl" @change="v=>form.ingressHostPre=v?'https://':'http://'">自动SSL证书</a-checkbox>
                                                <a-button v-if="configConsole.isConsole && configConsole.domains.length && configConsole.canInput" class="ml-10" type="primary" @click="configConsole.isSelect=true;">锁定</a-button>
                                            </div>
                                        </div>
                                    </a-form-item>
                                    
                                    <!-- <a-form-item v-if="ingressclassList.length > 1" label="ingressClass" field="ingressclass" :rules="[{required:true,validator:(value,cb)=>{!form.ingressclass?cb('请选择ingressclass'):cb()}}]">
                                        <template #label>
                                            <span class="ingressClass">镜像仓库</span>
                                        </template>
                                        <a-select v-model="form.ingressclass" placeholder="请选择ingressClass">
                                            <a-option v-for="i in ingressclassList" :key="i" :label="i" :value="i"></a-option>
                                        </a-select>
                                    </a-form-item> -->
                                </div>

                                <!-- <a-form-item v-if="item.requireParentReleaseName" label="选择主应用" field="parentReleaseName" :rules="[{required:true,message:'请选择主应用'}]">
                                    <template #label>
                                        <span class="form-label">选择主应用</span>
                                    </template>
                                    <a-select v-model="item.parentReleaseName" label="主应用" placeholder="请选择">
                                        <a-option v-for="opt in rpList[item.parentIdentifie]" :key="opt.name" :label="opt.title+'('+opt.name+')'" :value="opt.name"></a-option>
                                    </a-select>
                                    <span v-if="!rpList[item.parentIdentifie]||!rpList[item.parentIdentifie].length" class="ml-20 c-blue cursor" style="flex-shrink:0;" @click="$emit('needInstall',item.parentIdentifie,testModuleNames);">去安装</span>
                                </a-form-item> -->

                                <a-form-item v-if="item.requirePvc" label="存储" field="pvcname" :rules="[{required:true,message:'请选择存储'}]">
                                    <template #label>
                                        <span class="form-label">存储</span>
                                    </template>
                                    <div class="df df-c" style="flex:1;">
                                        <div class="df ai-c">
                                            <a-select v-model="item.pvcname" :disabled="item.pvcDisabled" placeholder="请选择存储">
                                                <a-option v-for="item in storages" :key="item.name" :value="item.name">{{item.name}}</a-option>
                                            </a-select>
                                            <span @click="sdShow=true;" class="ml-10 c-blue cursor" style="flex-shrink:0;">新建</span>
                                        </div>
                                        <table v-if="item.volumesMounts&&item.volumesMounts.length" class="com-table mt-16"><tbody>
                                            <tr>
                                                <td>类型</td>
                                                <td>mountPath</td>
                                                <td>subPath</td>
                                            </tr>
                                            <tr v-for="(itemVm,index) in item.volumesMounts" :key="index">
                                                <td>{{ volumesTypes[itemVm.type] }}</td>
                                                <td>{{ itemVm.mountPath }}</td>
                                                <td>
                                                    <div v-if="item.isUpgrade">{{ itemVm.subPath }}</div>
                                                    <a-input v-else v-model="itemVm.subPath" placeholder="请输入"></a-input>
                                                </td>
                                            </tr>
                                        </tbody></table>
                                    </div>
                                </a-form-item>
                                
                                <!-- <a-form-item v-if="item.requireBuild && !(mirror.length==1 && mirror[0] && mirror[0].value=='registry.local.w7.cc/default')" label="镜像仓库" field="registry" :rules="[{required:true,message:'请选择镜像仓库'}]">
                                    <template #label>
                                        <span class="form-label">镜像仓库</span>
                                    </template>
                                    <a-select v-model="item.registry" placeholder="请选择">
                                        <a-option v-for="mr in mirror" :key="mr.value" :value="mr.value">{{mr.label}}</a-option>
                                    </a-select>
                                    <span @click="imgShow=true;" class="ml-10 c-blue cursor" style="flex-shrink:0;">新建</span>
                                </a-form-item> -->

                                <div v-for="(sp,index) in item.startParams" :key="sp.name">
                                    <a-form-item v-if="sp.values_text!='%DOMAIN_HOST%' && sp.values_text!='%DOMAIN_URL%' && sp.values_text!='%DOMAIN_SSL_URL%'" @change="testInstallStatus" :label="sp.title" :field="'startParams['+index+'].value'" :rules="[{required:sp.required,message:'内容不能为空'}, validator(sp)]">
                                        <template #label>
                                            <span class="form-label">{{sp.title}}</span>
                                        </template>
                                        <div class="fc df df-c">
                                            <a-input v-if="sp.type=='text'" v-model="sp.value" :disabled="sp.lock" :spellcheck="false" placeholder="请输入" />
                                            <a-select v-if="sp.type=='select'" v-model="sp.value" :disabled="sp.lock" :spellcheck="false" placeholder="请选择">
                                                <a-option v-for="opt in sp.options" :key="opt" :label="opt" :value="opt" />
                                            </a-select>
                                            <div v-if="sp.type=='storage'" class="df">
                                                <a-select v-if="sp.form&&sp.form.storageClassName" v-model="sp.form.storageClassName.value" :disabled="sp.lock" @change="sp.value=sp.form.storageClassName.value+sp.form.storageSize.value" placeholder="请选择">
                                                    <a-option v-for="opt in storageClassNames" :key="opt" :label="opt" :value="opt"></a-option>
                                                </a-select>
                                                <a-input v-if="sp.form&&sp.form.storageSize" v-model="sp.form.storageSize.value" :disabled="sp.lock" type="number" :spellcheck="false" placeholder="请填写存储大小" class="ml-20">
                                                    <template #append>Gi</template>
                                                </a-input>
                                                <custom-checkbox v-if="sp.form&&sp.form.storageRwMode" v-model="sp.form.storageRwMode.value" :disabled="sp.lock" checked-value="ReadWriteMany" unchecked-value="ReadWriteOnce" class="ml-20 df-s0">多写</custom-checkbox>
                                            </div>
                                            <div v-if="sp.description" class="mt-4 c-aa">{{sp.description}}</div>
                                        </div>
                                    </a-form-item>
                                </div>
                                <a-empty v-if="(!item.startParams||!item.startParams.length) && !item.requirePvc && !item.requireBuild && !item.requireParentReleaseName" description="没有配置项" />
                            </a-form>
                        </div>
                    </a-tab-pane>
                </a-tabs>
                <div class="df ai-c jc-b mt-30">
                    <a-button @click="prevStep">上一步</a-button>
                    <a-button type="primary" @click="nextStep">下一步</a-button>
                </div>
            </div>
            <div v-else-if="step==3">
                <div>
                    <div class="df df-c ai-c">
                        <icon-check-circle-fill v-if="complete.status==1" style="font-size:80px;color:rgb(var(--green-6));" />
                        <icon-close-circle-fill v-else-if="complete.status==2" class="c-red" style="font-size:80px;" />
                        <img v-else src="@/assets/image/loading.png" style="width:60px; height:auto;" class="loader" alt="" />
                        <div class="fs-18 mt-16 c-99">
                            <div v-if="complete.status==1">任务部署成功</div>
                            <div v-else-if="complete.status==2">任务部署失败</div>
                            <div v-else>任务执行中</div>
                        </div>
                    </div>
                    <a-tabs v-model:active-key="complete.activeKey" type="card-gutter mt-20" class="zpkinstalltabs">
                        <a-tab-pane v-for="item in complete.items" :key="item.identifie" :title="item.title">
                            <div class="task">
                                
                                <div v-for="(diItem,index) in item.resourcesList" :key="index" class="item df ai-c">
                                    <div class="fc df ai-c" style="overflow:hidden;">
                                        <span class="df-s0" @click="openLog(diItem)" :class="{'c-blue':diItem.kind=='Job',cursor:diItem.kind=='Job'||diItem.kind=='Deployment' }">{{diItem.deployTitle}}</span>
                                        
                                        <span v-if="diItem.kind=='Job'" class="fc ml-20 c-99 txt-overhidden cursor" @click="openLog(diItem)">{{diItem.log}}</span>
                                        <span v-if="diItem.kind=='Deployment'" class="fc ml-20 c-99 txt-overhidden">{{diItem.message}}</span>
                                        <span v-if="diItem.kind=='Ingress'" class="fc ml-20 c-99 txt-overhidden">
                                            <a :href="'http://'+diItem.domain" target="_blank" class="c-blue">{{diItem.domain}}</a>
                                            <span v-if="diItem.domainParseType=='A'">，记录类型：A，记录值：{{diItem.ips}}</span>
                                            <span v-if="diItem.domainParseType=='cname'">，记录类型：cname，记录值：{{ diItem.cname }}</span>
                                            <span v-if="!diItem.domainParseType">，记录类型：A，记录值：{{diItem.ip}}</span>
                                            <a-tooltip content="添加域名后，请在您持有域名的DNS解析后台添加对应的域名解析记录">
                                                <IconQuestionCircle class="ml-4 c-orange" />
                                            </a-tooltip>
                                        </span>
                                    </div>
                                    <div class="df-s0 ml-20">
                                        <icon-check-circle-fill v-if="diItem.status==1" class="c-green" />
                                        <span v-if="diItem.status==1" class="ml-6">正常</span>
                                        <icon-close-circle-fill v-if="diItem.status==2" class="c-red" />
                                        <span v-if="diItem.status==2 && diItem.kind!='Ingress'" class="ml-6">启动中</span>
                                        <span v-if="diItem.status==2 && diItem.kind=='Ingress'" class="ml-6">检测失败</span>
                                        <icon-loading v-if="diItem.status==3" />
                                        <span v-if="diItem.status==3" class="ml-6">执行中...</span>
                                    </div>
                                </div>
                            </div>
                        </a-tab-pane>
                    </a-tabs>
                    <div class="mt-20 df ai-c jc-c">
                        <a-button type="outline" @click="$router.push('/app/appgroup/'+appGroup+(isHelm?'/helm/detail':''))">管理应用</a-button>
                        <a-button type="primary" class="ml-20" @click="goBackList" >返回列表</a-button>
                        <a-button v-if="complete.status==2" class="ml-20" type="primary" @click="rebuild">重新部署</a-button>
                    </div>
                </div>
            </div>
        </div>
        <zone-drawer :show="sdShow" @close="closeSD"></zone-drawer>
        <jobLog :show="logs.show" :name="logs.name" @close="logs.show=false"></jobLog>
        <imageform-drawer :show="imgShow" @close="closeIMG"></imageform-drawer>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore,useLoadingStore } from '@/store';
import zoneDrawer from '@/views/storage/zone-drawer.vue';
import imageformDrawer from '@/views/config/sercet/imageform-drawer.vue';
import jobLog from '@/components/job-log.vue';
import customCheckbox from './custom-checkbox.vue';
import { getUserInfo } from '@/utils/auth';
import shortuuid from 'short-uuid';

export default {
    props: ['is_component','path_identifie','version'],
    emits: [ 'complete' ],
    data(){
        return {
            namespaceActive: '',
            infoversion: '',
            mirror: [],
            storages: [],
            whiteList: [],
            identifie: '',
            step: 1,
            info: {},
            path: '',
            releaseName: '',
            domain: '',
            form: {
                fullDomain: '',
                activeIdentifie: '',
                ingressDisabled: false,
                ingressHost: '',
                ingressHostPre: 'http://',
                installForm: [],
                ingressSeletorName: '',
                requireDomain: true,
                requireDomainHttps: false,
                ingressclass: '',
                forms: [],
                whiteDomain: 0,
            },
            configIngress: [],
            rely: {},
            ingressclassList: [],

            complete: {
                activeKey: "",
                items: null,
            },
            interval: null,
            status: 0,
            appname: '',

            svAnnotations: {}, // 暂存更新应用的annotations

            sdShow: false, // 新建存储的抽屉
            imgShow: false, // 新建镜像的抽屉
            logs: {
                show: false,
                name: '',
            },

            installAlert: {},
            appGroup: '',
            isHelm: false,

            rpList: {}, // requireParentReleaseName 列表
            storageClassNames: [],

            configConsole: {
                isConsole: false,
                domains: [],
                deployItems: [],
                canInput: false,
                isSelect: true,
            },
            domainRules: [],

            volumesTypes: {
                nfs: 'NFS',
                emptyDir: '临时目录',
                hostPath: '主机目录',
                pvc: 'PVC',
                configmap: 'ConfigMap',
                secret: 'Secret',
            },

            thirdparty_cd_token: '',
			installConflict: {
				show: false,
				reason: '',
				domain: '',
				panelUrl: '',
				appIdentify: '',
				params: null,
				retryConfig: false,
			},
			reinstallConfirmed: false,
        }
    },
    async created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.init();
    },
    components: {
        jobLog,
        zoneDrawer,
        imageformDrawer,
        customCheckbox,
    },
    unmounted(){
        clearInterval(this.interval);
    },
    methods: {
        async mainAppTest(){
            this.testModuleNames();
            await this.getAppgroups();
            this.form.forms.map(i=>{
                if(i.requireParentReleaseName){
                    i.parentReleaseName = this.rpList?.[i.parentIdentifie]?.[0]?.name || '';
                }
            })
        },
        selectDomain(){
            let url = this.configConsole.domains?.find(i=>i.deployItemId==this.form.fullDomain)?.siteUrl || '';
            // console.log(url)
            this.form.ingressHostPre = url.match(/^https?:\/\//)?.[0] || '';
            this.form.ingressHost = url.replace(/^https?:\/\//,'') || '';
            this.form.auto_ssl = this.form.ingressHostPre == 'https://';
        },
        async init(reinstall = false){
			if(!reinstall){
				this.reinstallConfirmed = false;
			}
            if(this.is_component){
                this.path = this.path_identifie;
            }else{
                this.releaseName = this.$route.query.releasename || '';
                this.path = decodeURIComponent(this.$route.query.path);
                // 跳转到安装完成
                if(this.$route.query.completeName){
                    this.step = 3;
                    this.getStatus(this.$route.query.completeName);
                    this.getInfo();
                    return;
                }
            }
            // 放前面
            await this.getToken();
            await this.getStorage();
            await this.getWhiteList();
			if(!await this.getInfo(reinstall)){return}
            await this.getMirror();
            await this.getIngressclassList();
            // 第一步域名
            if(this.$route.query.domain && !this.is_component){
                let domain = decodeURIComponent(this.$route.query.domain);
                let match = domain.match(/^(http(s)?:\/\/)(.*)$/)
                if(match){
                    this.form.ingressHostPre = match[1];
                    this.form.ingressHost = match[3];
                    this.form.auto_ssl = this.form.ingressHostPre == 'https://';
                }else{
                    this.form.ingressHost = domain;
                }
                this.whiteList = [];
                this.domainRules = [this.domainRules[0]];
                this.form.ingressDisabled = true;
            }else{
                if(this.form.requireDomain && this.whiteList?.length && this.whiteList?.[this.form.whiteDomain]?.prefixRandom && !this.form.ingressHost){
                    this.form.ingressHost = this.createShortUuid();
                }
            }
            this.nextStep();
        },
        
        getToken(){
            return panelApi.get("/auth/console/info",{noAlert:true}).then(res=>{
                let thirdparty_cd_token = res?.data?.thirdparty_cd_token;
                this.thirdparty_cd_token = thirdparty_cd_token;
            }).catch(()=>{});
        },
        async getWhiteList(){
            let userInfo = getUserInfo();
            let wl = userInfo?.['w7.cc/domain-white-list'] || '[]';
            wl = JSON.parse(wl);
            if(wl && wl.length){
                this.whiteList = wl?.filter(i=>!i.disabled);
            }
            return;
            return new Promise((resolve,reject)=>{
                let userInfo = getUserInfo();
                let wl = userInfo['w7.cc/domain-white-list'] || '[]';
                wl = JSON.parse(wl);
                if(wl.length){
                    this.whiteList = wl?.filter(i=>!i.disabled);
                    resolve();
                    return;
                }
                
                k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/domain-white-list',{noAlert:true}).then(res=>{
                    if(!res?.data){return}
                    let list = [];
                    try{
                        list = JSON.parse(res?.data?.data?.whiteList)?.filter(i=>!i.disabled)
// list.map(i=>i.prefixRandom = true)
                    }catch{}
                    this.whiteList = list;
                }).finally(()=>{
                    resolve();
                })
            })
        },
        async rebuild(){
            clearInterval(this.interval);
            this.step = 1;
            let token = '';
            let clusterId = '';
            try{
                let {data} = await panelApi.get('/auth/console/info?code=test');
                token = data.thirdparty_cd_token;
                clusterId = data.cluster_id;
            }catch{}
            this.$router.push({query:{
                path: this.path,
                releasename: this.releaseName,
                domain: this.domain,
                insClusterId: clusterId,
                thirdpartyCDToken: token,
                zipUrl: this.$route.query.zipUrl || '',
            }}).then(()=>{
                this.init();
            })
        },
        testInstallStatus(){
            this.installAlert[this.form.activeIdentifie].map((item,index)=>{
                if(item.required || item.isInstall){return}
                let mn = item.name;
                let arr = this.form.forms?.find(i=>i.identifie==this.form.activeIdentifie)?.startParams?.filter(i=>i.module_name==mn) || [];
                if(!arr.length){return}
                let allReplace = true;
                arr.map(i=>{
                    if(i.values_text==i.value){allReplace = false;}
                });
                this.installAlert[this.form.activeIdentifie][index].allReplace = allReplace;
            });
        },
        openLog(diItem){
            if(diItem.kind=="Deployment"){
                this.$router.push('/app/appgroup/'+ this.appGroup + (this.isHelm?'/helm/detail':''))
            }else if(diItem.kind=='Job'){
                this.logs = {
                    show: true,
                    name: diItem.name,
                }
            }
        },
        getAppgroups(){
            return k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+this.namespaceActive+'/appgroups').then(res=>{
                let items = res?.data?.items || [];
                let o = {};
                items.map(i=>{
                    let identifie = i?.metadata?.annotations?.['w7.cc/identifie']?.replaceAll('-','_');
                    if(!identifie){return}
                    o[identifie] = o[identifie] || [];
                    o[identifie].push({
                        name: i.metadata?.name,
                        title: i.metadata?.annotations?.title || i.metadata?.name,
                    });
                });
                this.rpList = o;
                // console.log('rplist',this.rpList);
            })
        },
        async getInfo(reinstall = false){
            if((!this.path||this.path=='undefined') && this.$route.query.completeName){
                let {data} = await k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+this.namespaceActive+'/appgroups/'+this.$route.query.completeName);
                this.info = {
                    ...this.info,
                    title: data?.spec?.title,
                    icon: data?.spec?.logo,
                }
                if(!this.is_component && !this.$route.query.domain){
                    let domain_apps = [];
                    try{
                        JSON.parse(data?.metadata?.annotations?.['w7.cc/domains'])
                    }catch{}
                    let domain = domain_apps?.[0] || '';
                    this.domain = domain;
                }
                this.identifie = data?.spec?.identifie;
                this.path = data.spec.zpkUrl;
                this.releaseName = this.$route.query.completeName;
                return true;
            }
            return panelApi.get('/zpk/config',{params:{
                repoUrl: this.path,
                thirdpartyCDToken: this.$route.query.thirdpartyCDToken,
                releaseName: this.releaseName,
                reinstall,
            },noAlert:true}).then(async res=>{
                if(!res?.data){return true}

                if(res?.data?.[0]){
                    let i = res.data?.[0];
                    this.info = {
                        title: i.name,
                        icon: i.icon,
                    }
                    this.identifie = i.identifie;

                    this.infoversion = i.version;
                    
                    this.configConsole.isConsole = i?.isConsole || false;
                    this.configConsole.deployItems = i?.deployItems || [];
                    this.configConsole.canInput = this.configConsole.deployItems.filter(i=>i.canDeploy).length > 0;
                    this.configConsole.domains = this.configConsole.deployItems.filter(i=>i.siteUrl).map(i=>{
                        return {
                            deployItemId: i.deployItemId,
                            siteUrl: i.siteUrl,
                            deployUrl: i.deployUrl,
                            releaseName: i.releaseName,
                            enabled: i.enabled,
                        }
                    });
                    if(this.configConsole.isConsole){
                        this.form.auto_ssl = true;
                        this.form.ingressHostPre = 'https://';
                        if(this.configConsole.domains?.length){
                            this.form.fullDomain = this.configConsole?.domains?.[0]?.deployItemId || '';
                            this.selectDomain();
                        }
                    }
                    // console.log(this.configConsole)
                }
                if(this.$route.query.completeName && !this.is_component){ return; }
                
                try{
                    await k8sproxy.get('/apis/storage.k8s.io/v1/storageclasses').then(res=>{
                        let list = res?.data?.items?.filter(i=>(i.metadata?.name!=='longhorn'&&i.metadata?.name!=='longhorn-static')).map(i=>i.metadata?.name);
                        this.storageClassNames = list || [];
                    });
                }catch{}
                
                let forms = res.data?.map((i,index)=>{
                    if(index==0){
                        this.configIngress = i.ingress || [];
                        if(i.ingress?.length){
                            this.form.ingressSeletorName = i.ingress[0].name;
                        }
                        this.form.requireDomain = i.requireDomain;
                        this.form.requireDomainForce = i.requireDomainForce;
                        this.form.requireDomainHttps = i.requireDomainHttps || false;
                        i.requireDomainHttps && (this.form.ingressHostPre = 'https://');
                        this.form.auto_ssl = this.form.ingressHostPre == 'https://';
                        this.domainRules = [{
                            required: this.form.requireDomainForce,
                            validator: (value,cb)=>{
                                (this.form.requireDomainForce && !this.form.ingressHost)? cb('请输入域名') : cb()
                            }
                        }]
                    }
                    let startParams = [];
                    i?.startParams?.map(j=>{
                        let options = [];
                        let value = j.values_text || '';
                        if(/^([^\|]+\|)+[^\|]+$/.test(j.values_text)){
                            options = j.values_text.split('|');
                            value = options?.[0] || '';
                            j.type = 'select';
                        }
                        // 存储设备
                        if(j.values_text=='%STORAGE_SIZE%' || j.values_text=='%STORAGE_CLASS_NAME%' || j.values_text=='%STORAGE_RW_MODE%'){
                            let find = startParams.find(i=>i.type=='storage');
                            let names = {
                                '%STORAGE_SIZE%': 'storageSize',
                                '%STORAGE_CLASS_NAME%': 'storageClassName',
                                '%STORAGE_RW_MODE%': 'storageRwMode',
                            }
                            let defaultVal = {
                                '%STORAGE_SIZE%': '1',
                                '%STORAGE_CLASS_NAME%': this.storageClassNames?.[0],
                                '%STORAGE_RW_MODE%': 'ReadWriteOnce',
                            }
                            if(find){
                                find.form[names[j.values_text]] = {
                                    name: j.name,
                                    value: defaultVal[j.values_text],
                                    values_text: j.values_text,
                                    lock: j.lock,
                                }
                                find.value = find.form?.storageClassName?.value + find.form?.storageSize?.value;
                            }else{
                                let form = {};
                                form[names[j.values_text]] = {
                                    name: j.name,
                                    value: defaultVal[j.values_text],
                                    values_text: j.values_text,
                                    lock: j.lock,
                                }
                                startParams.push({
                                    ...j,
                                    name: 'storage',
                                    title: '存储设备',
                                    type: 'storage',
                                    form: form,
                                    value: form[names[j.values_text]].value,
                                    required: true,
                                    module_name: j.module_name,
                                    description: '',
                                });
                            }
                            return;
                        }
                        startParams.push({
                            ...j,
                            name: j.name,
                            title: j.title,
                            type: j.type,
                            options: options,
                            required: j.required || false,
                            value: value,
                            values_text: j.values_text || '',
                            module_name: j.module_name, // 模块名称
                            description: j.description,
                            lock: j.lock,
                        });
                    })
                    let pvcname = i.requirePvc? (this.storages?.find(i=>i.isDefault)?.name || this.storages?.[0]?.name) : '';
                    let registry = i.requireBuild? this.mirror?.[0]?.value : '';

                    let volumes = i?.volumes || [];
                    let volumesMounts = i?.volumesMounts || [];
                    volumesMounts = volumesMounts.map(i=>{
                        let find = volumes.find(v=>v.name==i.name);
                        let type = '';
                        if(find?.emptyDir){ type = 'emptyDir'; }
                        if(find?.hostPath){type = 'hostPath';}
                        if(find?.persistentVolumeClaim){type = 'pvc';}
                        if(find?.nfs){type = 'nfs';}
                        if(find?.configMap){type = 'configmap';}
                        if(find?.secret){type = 'secret';}

                        i.type = type;
                        return i;
                    })
                    // 勾选可选安装
                    let isInstall = (!this.is_component) && Boolean(this.$route.query[i.identifie]);
                    return {
                        index: index,
                        requireParentReleaseName: i.requireParentReleaseName, // 需要主应用
                        parentReleaseName: '',
                        parentIdentifie: i.parentIdentifie, // 主应用
                        requireInstall: i.requireInstall, // 必须安装
                        requirePvc: i.requirePvc, // 必须有存储
                        requireBuild: i.requireBuild, // 必须有镜像仓库
                        registry: registry, // 镜像仓库
                        pvcname: pvcname, // 存储
                        volumesMounts: volumesMounts,
                        volumes: volumes,
                        isUpgrade: i.isUpgrade,
                        
                        name: i.name, // 名称
                        identifie: i.identifie, // 标识
                        isInstall: isInstall, // 是否安装
                        startParams: startParams, // 启动参数
                        outModuleNames: i.outModuleNames || [], // 依赖应用
                        dependsOnes: i.dependsOnes || [],
                    };
                }) || [];
                this.form.forms = forms;
                console.log('form.forms',this.form.forms)

                if(this.form.forms.find(i=>i.requireParentReleaseName)){
                    await this.getAppgroups();
                    this.form.forms.map(i=>{
                        if(i.requireParentReleaseName){
                            i.parentReleaseName = this.rpList?.[i.parentIdentifie]?.[0]?.name || '';
                        }
                    })
                }
                
                // 检测依赖
                this.testModuleNames();
                // 设置选中tab
                this.filterInstall();

                for(let i in res.data){
                    let deployName = res.data[i]?.deployName;
                    let identifie = res.data[i]?.identifie;
                    
                    let f = this.form.forms.find(form=>form.identifie==identifie);

                    if(deployName){
                        
                        let { data } = await panelApi.get('/zpk/last-version/env',{params:{
                            name: deployName,
                            namespace: this.namespaceActive,
                        }}).catch(()=>({}));

                        f.isInstall = f.isInstall || (data.replicas==1);

                        let envs = data?.envs || {};
    
                        if(data.preSubPath){ f.preSubPath = data.preSubPath; }
                        if(f.requirePvc && data.pvcName){
                            f.pvcname = data.pvcName;
                            f.pvcDisabled = true;
                        }
    
                        f?.startParams?.forEach(sp=>{
                            sp.value = envs?.[sp.name] || sp.value;
                            if(sp.type=='storage' && sp.form){
                                for(let sfIndex in sp.form){
                                    let spf = sp.form[sfIndex];
                                    if(spf.values_text=='%STORAGE_SIZE%' && envs?.[spf.name]){
                                        spf.value = envs?.[spf.name]?.replace(/[a-zA-Z]+$/,'');
                                        continue;
                                    }
                                    spf.value = envs?.[spf.name] || spf.value;
                                }
                            }
                        });
                        
                        if(i=='0' && this.form?.requireDomain && envs?.DOMAIN_URL){
                            let url = envs.DOMAIN_URL;
                            this.form.ingressHostPre = url.match(/^https?:\/\//)?.[0] || 'http://';
                            this.form.ingressHost = url.replace(/^https?:\/\//,'') || '';
                            this.form.auto_ssl = this.form.ingressHostPre == 'https://';
                            this.form.ingressDisabled = true;
                        }
                    }
                    
                    // 从参数获取 pvcname , presubpath
                    if(!this.is_component && this.$route.query?.[identifie] ){
                        let querys = {};
                        try{
                            querys = JSON.parse( decodeURIComponent( this.$route.query?.[identifie] ));
                        }catch{}
                        if(querys.pvcName){
                            f.pvcname = querys.pvcName;
                            f.pvcDisabled = true;
                        }
                        if(querys.preSubPath){
                            f.preSubPath = querys.preSubPath;
                        }
                    }
                }
                // 更新应用，替换env
                if(!this.releaseName && res?.data?.[0]?.releaseName){ this.releaseName = res.data[0].releaseName; }
				return true;
			}).catch(error=>{
				if(this.handleInstallConflict(error, null, true)){return false}
				this.$message.error(error?.response?.data?.error || error?.message || '获取安装配置失败');
				return false;
            })
        },
        goBackList(){
            if(this.is_component){this.$emit('close'); return;}
            this.$router.push('/app');
        },
        closeIMG(v){
            this.imgShow = false;
            v && this.getMirror();
        },
        closeSD(v){
            this.sdShow = false;
            v && this.getStorage();
        },
        // 获取ingressclass列表
        async getIngressclassList(){
            let { data } = await k8sproxy.get('/apis/networking.k8s.io/v1/ingressclasses');
            this.ingressclassList = data?.items?.map(i=>i.metadata.name) || [];
            this.form.ingressclass = this.ingressclassList?.[0] || '';
        },
        // updateRelease(){
        //     k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+this.releaseName,{loading:true}).then(async res=>{
        //         let apps = res?.data?.status?.items || [];
        //         useLoadingStore().loading = true;
        //         for(let i in apps){
        //             let { data } = await k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+app[i].kind.toLowerCase()+'s'+"/"+apps[i].name,{noAlert:true});
        //             let env = data?.spec?.template?.spec?.containers[0]?.env || [];

        //             this.form.forms.forEach(f=>{
        //                 let name = f.item.identifie.replace(/\_/g,'-') + '-' + this.releaseName;
        //                 if(name !== apps[i].name){return};
        //                 f?.startParams?.forEach(sp=>{
        //                     sp.value = env.find(e=>e.name==sp.name)?.value || sp.value;
        //                 });
        //                 this.svAnnotations[f.identifie] = {
        //                     'w7.cc/domains': data?.metadata?.annotations?.['w7.cc/domains'] || '',
        //                     'w7.cc/ingress-domains': data?.metadata?.annotations?.['w7.cc/ingress-domains'] || '',
        //                     'w7.cc/ingress-selector-name': data?.metadata?.annotations?.['w7.cc/ingress-selector-name'] || '',
        //                 }
        //             })
        //         }
        //         useLoadingStore().loading = false;
        //     }).catch(()=>{
        //         useLoadingStore().loading = false;
        //     })
        // },
        switchChange(identifie){
            this.form.installForm = this.form.forms.filter(i=>i.requireInstall || i.isInstall).map(i=>i.identifie);
            let isInstall = this.form.forms.find(i=>i.identifie==identifie).isInstall;
            if(this.form.activeIdentifie==identifie && !isInstall){
                this.filterInstall();
            }
        },
        async startParamsFocus(sp){
            if(!sp.module_name||!/%\w+%/.test(sp.value)){return}
            if(sp.module_name!='w7_mysql5' && sp.module_name!='w7_mysql' && sp.module_name!='w7_redis'){return}
            let install = await this.testRely(sp.module_name);
            if(install===false){
                this.$emit('needInstall',sp.module_name,this.testModuleNames);
            }
        },
        // 检测依赖
        async testModuleNames(){
            this.installAlert = {};
            
            for(let index in this.form.forms){
                let i = this.form.forms[index];
                this.installAlert[i.identifie] = [];
                for(let m in i.outModuleNames){
                    let name = i.outModuleNames[m];
                    if(/\./.test(name)){continue}
                    let title = await this.getTitleByMn(name);
                    let isInstall = await this.testRely(name);
                    this.installAlert[i.identifie].push({
                        name: name,
                        title: title,
                        isInstall: isInstall,
                        required: false,
                    });
                }
                for(let m in i.dependsOnes){
                    let item = i.dependsOnes[m];
                    let name = item.identifie;
                    let title = item.name;
                    if(item.subidentifie){
                        name = name + '/' + item.subidentifie;
                        title = item.subname;
                    }
                    if(/\./.test(name)){continue}
                    let isInstall = await this.testRely(item.subidentifie || item.identifie);
                    this.installAlert[i.identifie].push({
                        name: name,
                        title: title,
                        isInstall: isInstall,
                        required: item.required,
                    });
                }
            }
        },
        // 获取模块名称
        async getTitleByMn(name){
            return panelApi.get('/zpk/config',{params:{
                repoUrl: 'https://zpk.w7.cc/zpk/respo/info/'+name,
                thirdpartyCDToken: this.$route.query.thirdpartyCDToken,
            },noAlert:true}).then(res=>{
                return res.data?.[0]?.name;
			}).catch(error=>{
				if(!this.handleInstallConflict(error)){
					this.$message.error(error?.response?.data?.error || error?.message || '获取依赖应用信息失败');
				}
				return name;
            })
        },
        validator(sp){
            let find = this.installAlert[this.form.activeIdentifie]?.find(i=>i.name==sp.module_name);
            if(!find || find.isInstall || ((!find.required)&&find.replaceAll)){return {}}
            return {
                validator: (value,cb)=>{
                    if(!find.required){
                        value == sp.values_text? cb('请安装'+ (find.title || find.name) +'或输入正确的值') : cb();
                    }else{
                        cb('请安装'+ (find.title || find.name))
                    }
                }
            }
        },
        // 检测依赖
        testRely(name){
            return panelApi.get('/zpk/out-depends/env',{
                params:{
                    identifie: name,
                    namespace: this.namespaceActive,
                },
                noAlert: true,
            }).then(res=>{
                if(res.data?.installed){
                    // 如果安装，替换
                    let envs = res.data?.envs || {};
                    this.form.forms.forEach(i=>{
                        i.startParams?.forEach(sp=>{
                            if(sp.module_name!=name){return}
                            sp.value = sp.value.replace(/%([^%]+)%/g, (match, p1) => (envs[p1] || p1));
                        })
                    })
                }
                return res?.data?.installed;
            })
        },
        // 前一项
        filterInstall(){
            this.form.installForm = this.form.forms.filter(i=>i.requireInstall || i.isInstall).map(i=>i.identifie);
            if(!this.form.activeIdentifie){
                this.form.activeIdentifie = this.form.installForm?.[0]?.identifie;
            }else if(!this.form.installForm.find(i=>i.identifie==this.form.activeIdentifie)){
                let index = this.form.forms.findIndex(i=>i.identifie==this.form.activeIdentifie);
                for(let i = index-1; i>=0; i--){
                    if(this.form.installForm.includes(this.form.forms[i].identifie)){
                        this.form.activeIdentifie = this.form.forms[i].identifie;
                        break;
                    }
                }
            }
        },
        // 上一步
        prevStep(){
            if(this.step==2){
                if(this.form.activeIdentifie==this.form.installForm?.[0]){
                    // this.step = 1;
                }else{
                    let index = this.form.installForm.findIndex(i=>i==this.form.activeIdentifie);
                    this.form.activeIdentifie = this.form.installForm[index-1];
                }
            }else if(this.step==3){
                this.step = 2;
            }
        },
        // 同步域名
        // domainTest(){
        //     let currentform = this.form.forms.find(i=>i.identifie==this.form.activeIdentifie);
        //     currentform && (currentform.ingressHost = this.form.ingressHost);
        // },
        // 下一步
        nextStep(){
            if(this.step==1){
                this.step = 2;
                this.form.activeIdentifie = this.form.installForm?.[0];
            }else if(this.step==2){
                // this.domainTest();
                this.$refs['form-'+this.form.activeIdentifie][0].validate((valid)=>{
                    if(valid){return}
                    if(this.form.activeIdentifie==this.form.installForm?.[this.form.installForm.length-1]){
                        for(let i in this.installAlert[this.form.activeIdentifie]){
                            let item = this.installAlert[this.form.activeIdentifie][i];
                            if(!item.isInstall && item.required){
                                this.$message.warning('请安装'+item.title);
                                return;
                            }
                        }
                        this.install();
                    }else{
                        let index = this.form.installForm.findIndex(i=>i==this.form.activeIdentifie);
                        this.form.activeIdentifie = this.form.installForm[index+1];
                    }
                });
            }
        },
        // 安装
        install(){
            let installOptions = this.form.forms.map(i=>{
                let registry = this.mirror.find(m=>m.value==i.registry)
                registry = {
                    host: registry?.dockerconfigjson?.host || '',
                    username: registry?.dockerconfigjson?.username || '',
                    password: registry?.dockerconfigjson?.password || '',
                    namespace: registry?.namespace || '',
                }
                let envKv = [];
                i.startParams.map(j=>{
                    if(j.type=='storage'){
                        for(let si in j.form){
                            let fi = j.form[si];
                            envKv.push({
                                name: fi.name,
                                value: fi.values_text=='%STORAGE_SIZE%'? (fi.value + 'Gi') : fi.value,
                            })
                        }
                        return;
                    }
                    envKv.push({ name: j.name, value: j.value,});
                })

                let volumesMounts = i.volumesMounts?.map?.(i=>{
                    delete i.type;
                    return i;
                }) || []
                let o = {
                    replicas: (i.requireInstall||i.isInstall)? 1 : 0,
                    identifie: i.identifie,
                    envKv: envKv,
                    pvcname: i.pvcname,
                    dockerRegistrySecretName: i.registry,
                    registry: registry,
                    parentReleaseName: i.parentReleaseName,
                    volumesMounts: volumesMounts,
                    volumes: i.volumes,
                }
                if(this.releaseName && this.svAnnotations[i.identifie]){
                    o.annotations = this.svAnnotations[i.identifie];
                }
                if(i.preSubPath){
                    o.preSubPath = i.preSubPath;
                }
                return o;
            })
// console.log(installOptions); return;
            
            let repoUrl = '';
            let releaseName = '';
            if(this.configConsole.isConsole && this.configConsole.domains.length && this.configConsole.isSelect && this.form.fullDomain){
                let find = this.configConsole.domains?.find(i=>i.deployItemId==this.form.fullDomain);
                repoUrl = find?.deployUrl || '';
                releaseName = find?.releaseName || '';
            };
            let ingressHost = this.form.ingressHost;
            let isSelectDomain = this.configConsole.isConsole && this.configConsole.domains.length && this.configConsole.isSelect;
            if(!isSelectDomain && this.whiteList.length && ingressHost){
                let wd = this.whiteList[this.form.whiteDomain];
                ingressHost = /\.$/.test(ingressHost)? ingressHost : (ingressHost+'.');
                ingressHost = ingressHost + wd.domain;
            }
            let params = {
                repoUrl: repoUrl || this.path,
                namespace: this.namespaceActive,
                releaseName: releaseName || this.releaseName || (this.identifie.replaceAll('_','-') + '-' +this.createName()),
                ingressHost: ingressHost,
                ingressForceHttps: this.form.auto_ssl,
                ingressClass: this.form.ingressclass,
                ingressSeletorName: this.form.ingressSeletorName,
                installOptions: installOptions,
                clusterId: this.$route.query.insClusterId || '',
                thirdpartyCDToken: this.$route.query.thirdpartyCDToken || this.thirdparty_cd_token,
                panelUrl: window.location.origin,
            }

            if(!this.is_component && this.$route.query.isTrandition){
                params.isTrandition = true;
                params.zipUrl = decodeURIComponent(this.$route.query.zipUrl);
            }
			if(this.reinstallConfirmed){
				params.reinstall = true;
			}

            panelApi.put('/zpk/install',params,{loading:true,noAlert:true}).then(res=>{
                this.step = 3;

                let { releaseName } = res?.data || {};
                this.releaseName = releaseName;
                if(this.is_component){
                    this.$emit('installed', this.identifie);
                    this.getStatus(releaseName);
                }else{
                    this.$router.push({query:{
                        ...this.$route.query,
                        completeName: releaseName,
                    }}).then(res=>{
                        this.getStatus(releaseName);
                    });
                }
            }).catch(error=>{
				if(this.handleInstallConflict(error, {...params})){return}
				this.$message.error(error?.response?.data?.error || error?.message || '安装失败');
			});
        },
		handleInstallConflict(error, params = null, retryConfig = false){
			let responseData = error?.response?.data;
			let conflict = responseData?.data;
			let isConflictResponse = error?.response?.status===409 || responseData?.code===409;
			if(!isConflictResponse || !['domain_mismatch','app_identify_exists'].includes(conflict?.conflict_reason)){
				return false;
			}
			this.installConflict = {
				show: true,
				reason: conflict.conflict_reason,
				domain: conflict.domain || '',
				panelUrl: conflict.panel_url || '',
				appIdentify: conflict.app_identify || '',
				params,
				retryConfig,
			};
			return true;
		},
		openOriginalPanel(){
			if(!this.installConflict.panelUrl){return}
			let targetUrl = this.installConflict.panelUrl;
			try{
				let url = new URL(targetUrl, window.location.origin);
				let basePath = url.pathname.replace(/\/+$/, '');
				url.pathname = basePath.endsWith('/app/apps') ? basePath : basePath + '/app/apps';
				if(this.installConflict.appIdentify){
					url.searchParams.set('uninstallApp', this.installConflict.appIdentify);
				}
				targetUrl = url.toString();
			}catch{}
			window.open(targetUrl, '_blank', 'noopener,noreferrer');
			this.installConflict.show = false;
		},
		forceReinstall(){
			if(this.installConflict.retryConfig){
				this.reinstallConfirmed = true;
				this.installConflict.show = false;
				this.init(true);
				return;
			}
			let params = this.installConflict.params;
			if(!params){return}
			this.installConflict.show = false;
			panelApi.put('/zpk/install', {...params, reinstall:true}, {loading:true,noAlert:true}).then(res=>{
				this.step = 3;
				let { releaseName } = res?.data || {};
				this.releaseName = releaseName;
				if(this.is_component){
					this.$emit('installed', this.identifie);
					this.getStatus(releaseName);
				}else{
					this.$router.push({query:{...this.$route.query,completeName:releaseName}}).then(()=>this.getStatus(releaseName));
				}
			}).catch(error=>{
				if(this.handleInstallConflict(error, {...params, reinstall:true})){return}
				this.$message.error(error?.response?.data?.error || error?.message || '强制安装失败');
			});
		},
        // 安装状态
        getStatus(name){
            this.appGroup = name;
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+name).then(res=>{
                this.isHelm = res?.data?.spec?.isHelm;
                let deployInfo = res?.data?.status?.deployInfo || [];
                let deployStatus = res?.data?.status?.deployStatus;

                this.complete.status = deployStatus=='deployed'? 1 : (deployStatus=='failed'?2:3);
                
                if(this.is_component && this.complete.status==1){
                    this.$emit('installedStatusSuccess', this.identifie);
                }
                if(!this.complete.items?.length){
                    this.complete.items = deployInfo;
                }else{
                    for(let i in this.complete.items){
                        for(let j in this.complete.items[i].resourcesList){
                            this.complete.items[i].resourcesList[j] = {
                                ...this.complete.items[i].resourcesList[j],
                                ...deployInfo[i].resourcesList[j],
                            }
                        }
                    }
                }
                this.complete.activeKey = this.complete.activeKey || deployInfo?.[0]?.identifie;

                if(!this.is_component && !this.$route.query.domain){
                    let domain_apps = [];
                    try{
                        JSON.parse(res?.data?.metadata?.annotations?.['w7.cc/domains'])
                    }catch{}
                    let domain = domain_apps?.[0] || '';
                    this.domain = domain;
                }
                // return this.complete.items;
            }).then(data=>{
                this.getStatusApp();
            }).then(()=>{
                this.interval && clearInterval(this.interval);
                if(this.complete.status==1){return}
                this.interval = setTimeout(()=>{
                    this.getStatus(name)
                    if(this.is_component){
                        this.$emit('installed', this.identifie);
                    }
                },6000);
            })
        },
        async getStatusApp(){
            let getDomain = async (item,i,j)=>{
                let { data:d } = await k8sproxy.get(`/apis/networking.k8s.io/v1/namespaces/${this.namespaceActive}/ingresses/${item.name}`).catch(()=>({}));
                let domain = d?.spec?.rules?.[0]?.host || '';
                this.complete.items[i].resourcesList[j].domain = domain;

                let domainParse = {};
                await k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/domainparseconfigs/domain-parse',{noAlert:true}).then(res=>{
                    domainParse = res?.data?.spec || {};
                }).catch(()=>{})

                if(domainParse.type){
                    this.complete.items[i].resourcesList[j].domainParseType = domainParse.type;
                    if(domainParse.type=='A'){
                        this.complete.items[i].resourcesList[j].ips = (domainParse.ips || []).join(',');
                    }
                    if(domainParse.type=='cname'){
                        this.complete.items[i].resourcesList[j].cname = domainParse.cname;
                    }
                }else{
                    let { data:ipData } = await k8sproxy.get('/api/v1/nodes')
                    let ip = ipData?.items?.[0]?.metadata?.labels?.['w7.public-ip'] || '';
                    this.complete.items[i].resourcesList[j].ip = ip;
                    if(!ip){
                        let { data:myip } = await panelApi.get('/myip',{params:{domain:domain},noAlert:true});
                        this.complete.items[i].resourcesList[j].ip = myip?.ip;
                    }
                }

                if(domainParse?.type=='cname'){
                    let {data:checkcname} = await panelApi.get('/dns-cname',{params:{domain:domainParse.cname},noAlert:true}).catch(()=>({}))
                    if(this.complete.items[i].resourcesList[j].cname != checkcname?.[0]){
                        this.complete.items[i].resourcesList[j].status = 2;
                    }
                }else{
                    let item = this.complete.items[i].resourcesList[j];
                    let { data:checkip } = await panelApi.get('/dnsip',{params:{domain:domain},noAlert:true}).catch(()=>({}));
                    if(!domainParse.type && item.ip != checkip?.[0]){
                        this.complete.items[i].resourcesList[j].status = 2;
                    }
                    if(domainParse.type=='A' && !item.ips.split(',').includes(checkip?.[0])){
                        this.complete.items[i].resourcesList[j].status = 2;
                    }
                }
            }

            let getApp = async (item,i,j)=>{
                let { data } = await k8sproxy.get(`/apis/apps/v1/namespaces/${this.namespaceActive}/deployments/${item.name}`);
                let query = `involvedObject.kind=Deployment,involvedObject.uid=${data.metadata.uid},involvedObject.name=${data.metadata.name},involvedObject.namespace=${this.namespaceActive}`;
                await k8sproxy.get(`/api/v1/namespaces/${this.namespaceActive}/events?fieldSelector=${encodeURIComponent(query)}`).then(res=>{
                    this.complete.items[i].resourcesList[j].message = res?.data?.items?.[0]?.message || '';
                })
            }

            let getBuild = async (item,i,j)=>{
                let { data } = await k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods",{params:{
                    labelSelector: 'job-name='+item.name,
                }, noAlert:true });
                let first = data?.items?.[0];
                if(!first){return}
                let pod_name = first?.metadata?.name;
                let containers = (first?.spec?.initContainers || []).concat(first?.spec?.containers || []);
                if(!containers.length){
                    await k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/pods/'+ pod_name +'/log?container=',{noAlert:true}).then(res=>{
                        let podcont = res.data || '';
                        let arr = podcont.split('\n').filter(i=>/\w/.test(i));
                        let log = arr.length? arr[arr.length-1] : '';
                        log = log.replace(/\u001b\[\d{1,3}(;1)?m/g,'');
                        this.complete.items[i].resourcesList[j].log = log;
                    });
                }else{
                    for(let c in containers){
                        let container = containers[c].name;
                        let getLog = false;
                        await k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/pods/'+ pod_name +'/log?container='+container,{noAlert:true}).then(res=>{
                            let podcont = res.data || '';
                            let arr = podcont.split('\n').filter(i=>/\w/.test(i));
                            let log = arr.length? arr[arr.length-1] : '';
                            log = log.replace(/\u001b\[\d{1,3}(;1)?m/g,'');
                            this.complete.items[i].resourcesList[j].log = log;
                            getLog = true;
                        });
                        if(getLog){break;}
                    }
                }
            }

            for(let i in this.complete.items){
                let resourcesList = this.complete.items[i]?.resourcesList || [];
                for(let j in resourcesList){
                    let item = resourcesList[j];
                    this.complete.items[i].resourcesList[j].status = item.deployStatus=='deployed'? 1 : (item.deployStatus=='failed'?2:3);
                    if(item.kind=='Ingress'){
                        item.deployTitle = item?.deployTitle || '域名解析';
                        try{ getDomain(item, i, j); } catch {}
                    }
                    if(item.kind=='Deployment'){
                        try{ getApp(item, i, j); } catch {}
                    }
                    if(item.kind=='Job'){
                        try{ getBuild(item, i, j); } catch {}
                    }
                }
            }
        },
        // 存储
        getStorage(){
            let customs = [];
            let defaultStorage = '';
            return k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/longhorn-volumes-config').then(res=>{
                customs = res?.data?.data?.customs?.split(',') || [];
                defaultStorage = res?.data?.data?.default || '';
            }).then(()=>{
                return k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/persistentvolumeclaims')
            }).then(res=>{
                let data = res?.data || [];
                let list = data.items || [];
                list = list.filter(i=>!i.metadata.deletionTimestamp).map(item=>{
                    item.created_at = window.formatDate(item.metadata.creationTimestamp);
                    return {
                        title: item?.metadata?.annotations?.title,
                        name: item?.metadata?.name,
                        size: item?.spec?.resources?.requests?.storage,
                        storage_class: item?.spec?.storageClassName,
                        created_at: item.created_at,
                        creationTimestamp: new Date(item?.metadata?.creationTimestamp || 0).getTime(),
                    };
                })
                list = list.filter(i=>customs.includes(i.name));
                list.map(i=>{
                    if(i.name==defaultStorage){
                        i.isDefault = true;
                    }
                })
                list.sort((a,b)=>(b.creationTimestamp - a.creationTimestamp));
                this.storages = list;

                if(this.form.forms?.length){
                    this.form.forms.forEach(i=>{
                        if(i.requirePvc){
                            i.pvcname = this.storages?.find(i=>i.isDefault)?.name || this.storages?.[0]?.name;
                        }
                    })
                }
            });
        },
        // 镜像仓库
        getMirror(){
            return k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets?fieldSelector=type=kubernetes.io/dockerconfigjson').then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    let dockerconfigjson = {};
                    if(i?.data['.dockerconfigjson']){
                        let dj = {}
                        try{
                            dj = JSON.parse(atob(i?.data['.dockerconfigjson']));
                        } catch(e){}
                        if(dj?.auths){
                            let o = Object.keys(dj?.auths).map(i=>({
                                host: i,
                                username: dj?.auths[i]?.username || '',
                                password: dj?.auths[i]?.password || '',
                            }));
                            o.length && (dockerconfigjson = o[0]);
                        }
                    }

                    return {
                        label: (dockerconfigjson.host) +'/'+ atob(i?.data?.namespace || ''),
                        namespace: atob(i?.data?.namespace || ''),
                        value: i?.metadata?.name || '',
                        dockerconfigjson: dockerconfigjson,
                    }
                });
                
                this.mirror = [
                    {
                        label: "registry.local.w7.cc/default",
                        namespace: "default",
                        value: 'registry.local.w7.cc',
                        dockerconfigjson: {
                            host: "registry.local.w7.cc",
                            password: "w7-secret",
                            username: "admin",
                        },
                    },
                    ...list,
                ];

                if(this.form.forms?.length){
                    this.form.forms.forEach(i=>{
                        if(i.requireBuild){
                            i.registry = this.mirror?.[0]?.value;
                        }
                    })

                }
            })
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
        createShortUuid(){
            return shortuuid.generate().toLocaleLowerCase();
        },
    },

}
</script>

<style scoped>
.mb-16{margin-bottom:16px;}
.mb-20{margin-bottom:20px;}
.toptitle{padding:10px 0 30px; border-bottom:1px solid #EFEFEF;}
.toptitle .icon{width:80px; height:80px; border-radius:8px;}

.progress{padding:50px 0 10px;}
.progress .over{width:20px; height:20px; margin-right:4px; border-radius:50%; border:1px solid #2D5FFF;}
.progress .no{width:20px; height:20px; line-height:20px; margin-right:4px; border-radius:50%; border:1px solid var(--color-text-3); color:var(--color-text-3); text-align:center;}
.progress .c-blue{color:#2D5FFF;}
.progress .c-blue .no{background:#2D5FFF; border-color:#2D5FFF; color:#ffffff;}
.progress .line{border-top:1px solid #cccccc; width:80px; margin:0 20px;}
.progress .line.active{border-color:#2D5FFF;}

.task .item.title{background:#f0f3fa; font-weight:bold;}
.task .item{padding:20px; border-bottom:1px solid var(--color-neutral-3);}
.task .item:last-child{border-bottom:none;}

.txt-overhidden{overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}

.loader{animation: spin 3s linear infinite; vertical-align:middle;}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
.form-label{display:inline-block;white-space:pre-wrap; word-break:break-all;line-height:1.2;max-width:100px;vertical-align:middle;}
</style>
<style>
.zpkinstalltabs .arco-tabs-tab-disabled{color:var(--color-text-2);}
.zpkinstalltabs .arco-tabs-tab-active.arco-tabs-tab-disabled{color:rgb(var(--primary-6));}
.super-mini-btn{height:20px; padding:0 4px;}
.super-mini-btn .arco-btn-icon{line-height:20px;}
</style>
