<template>
    <div class="df df-c ai-c">
        <a-result v-if="clusterInstallUnsupported" status="warning"
            title="当前集群不支持安装该应用"
            :subtitle="clusterInstallUnsupportedDescription">
            <template #extra>
                <a-button type="primary" @click="goBackMarket">返回上一页</a-button>
            </template>
        </a-result>
        <div v-else class="toptitle df jc-c" :style="{width:is_component?'800px':'1000px'}">
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
        <div v-if="!clusterInstallUnsupported" class="df ai-c progress c-00-6">
            <template v-if="registryLogin.required">
                <div class="df ai-c" :class="{'c-blue': step !== 0}">
                    <div v-if="step === 0" class="no">1</div>
                    <div v-else class="over df ai-c jc-c"><icon-check /></div>
                    <div class="fs-14 lh-1">仓库登录</div>
                </div>
                <div class="line" :class="{active: step !== 0}"></div>
            </template>
            <div class="df ai-c" :class="{'c-blue':step>=2}">
                <div v-if="step<=2" class="no">{{ registryLogin.required ? 2 : 1 }}</div>
                <div v-if="step>2" class="over df ai-c jc-c"><icon-check /></div>
                <div class="fs-14 lh-1">环境变量配置</div>
            </div>
            <div class="line" :class="{active:step>2}"></div>
            <div class="df ai-c" :class="{'c-blue':step==3}">
                <div class="no">{{ registryLogin.required ? 3 : 2 }}</div>
                <div class="fs-14 lh-1">{{ isCaptureMode ? '保存配置' : '安装' }}</div>
            </div>
        </div>

        <div v-if="!clusterInstallUnsupported" class="mt-40" style="width:720px;">
            <div v-if="step === 0">
                <a-alert class="mb-20">该制品为私有，需要使用源仓库账号登录并取得拉取权限。</a-alert>
                <a-form :model="registryLogin" layout="vertical">
                    <a-form-item label="源仓库"><a-input :model-value="registryLogin.registry" readonly /></a-form-item>
                    <a-form-item v-if="registryLogin.secrets.length" label="登录配置">
                        <a-select v-model="registryLogin.secret" @change="selectSourceRegistrySecret">
                            <a-option v-for="item in registryLogin.secrets" :key="item.key" :value="item.key">{{ item.name }}</a-option>
                            <a-option value="">使用其他账号</a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item v-if="!registryLogin.secret" label="用户名"><a-input v-model="registryLogin.username" autocomplete="username" /></a-form-item>
                    <a-form-item v-if="!registryLogin.secret" label="密码"><a-input-password v-model="registryLogin.password" autocomplete="current-password" /></a-form-item>
                    <a-form-item v-if="!registryLogin.secret"><a-checkbox v-model="registryLogin.save">保存为镜像仓库登录配置</a-checkbox></a-form-item>
                    <a-alert v-if="registryLogin.error" type="error" class="mb-20">{{ registryLogin.error }}</a-alert>
                    <div class="df jc-c"><a-button type="primary" :loading="registryLogin.loading" @click="loginSourceRegistry">登录并继续</a-button></div>
                </a-form>
            </div>
            <div v-else-if="step==2">
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
                                        <span :class="isCaptureMode||(!item.releaseNameConflict&&(item.isInstall||item.allReplace))?'c-green':'c-red'" class="va-middle">检测到{{item.title || item.name}}，</span>
                                        <span>
                                            <span v-if="isCaptureMode" class="va-middle c-green">将在初始化时按依赖顺序安装</span>
                                            <span v-else-if="item.releaseNameConflict" class="va-middle c-red">安装名称冲突，请重新加载安装配置</span>
                                            <span v-else-if="item.isInstall" class="va-middle c-green">已安装</span>
                                            <span v-else-if="item.allReplace" class="va-middle c-green">无需安装</span>
                                            <span v-else class="va-middle c-red">未安装</span>
                                            <icon-check-circle-fill v-if="isCaptureMode||(!item.releaseNameConflict&&(item.isInstall||item.allReplace))" class="va-middle ml-4 c-green fs-14" />
                                            <icon-close-circle-fill v-else class="va-middle ml-4 c-red fs-14" />
                                            
                                            <a-button v-if="!isCaptureMode&&item.releaseNameConflict" size="mini" class="ml-10 super-mini-btn" type="outline" @click="reloadInstallConfig">
                                                重新加载
                                            </a-button>
                                            <a-tooltip v-else-if="!isCaptureMode&&!item.isInstall" :content="item.required?'强制安装，必须先安装该应用后才可进行下一步操作':'不强制安装，可通过自定义填写对应的配置项来取消安装'">
                                                <a-button size="mini" class="ml-10 super-mini-btn" type="outline" @click="$emit('needInstall',item,reloadInstallConfig);">
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
                                    <a-button v-if="!isCaptureMode" size="mini" class="ml-10 super-mini-btn" type="outline" @click="$emit('needInstall',item.parentIdentifie,reloadInstallConfig);">
                                        <template #icon><icon-download /></template>
                                        <span>去安装</span>
                                    </a-button>
                                </div>
                            </a-alert>
                            <domain-parse-alert v-if="item.identifie==form.forms[0].identifie && form.requireDomain" class="install-domain-hint" />
                            <a-form :ref="'form-'+item.identifie" :model="item" auto-label-width >
                                <a-form-item v-if="!configConsole.isConsole && item.domainGroups?.[0]?.param === 'default' && configIngress.length > 1 && item.index === 0" label="域名规则">
                                    <a-select v-model="form.ingressSeletorName" :disabled="form.ingressDisabled || item.domainGroups[0].hostLocked">
                                        <a-option v-for="config in configIngress" :key="config.name" :value="config.name">{{config.name}}</a-option>
                                    </a-select>
                                </a-form-item>
                                <a-form-item v-if="configConsole.isConsole && item.index === 0 && configConsole.domains.length && configConsole.isSelect" label="选择部署域名">
                                    <a-select v-model="form.fullDomain" placeholder="请选择" @change="selectDomain">
                                        <a-option v-for="dm in configConsole.domains" :key="dm.deployItemId" :disabled="dm.enabled===false" :label="dm.siteUrl" :value="dm.deployItemId" />
                                    </a-select>
                                    <a-button v-if="configConsole.canInput" class="ml-10" type="primary" @click="configConsole.isSelect=false;item.domainGroups[0].hostLocked=form.ingressDisabled">解锁</a-button>
                                </a-form-item>
                                <a-form-item v-if="configConsole.isConsole && item.index === 0 && configConsole.domains.length && !configConsole.isSelect && configConsole.canInput">
                                    <a-button type="primary" @click="configConsole.isSelect=true;selectDomain()">锁定</a-button>
                                </a-form-item>
                                <install-domain-groups v-if="item.domainGroups?.length" :ref="'domains-'+item.identifie" v-model="item.domainGroups" @update:model-value="syncInheritedDomainGroups" :namespace="namespaceActive" :white-list="whiteList" :primary-locked="configConsole.isConsole && configConsole.isSelect && item.index === 0" />
                                <div v-if="item.identifie==form.forms[0].identifie">
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
                                    <span v-if="!rpList[item.parentIdentifie]||!rpList[item.parentIdentifie].length" class="ml-20 c-blue cursor" style="flex-shrink:0;" @click="$emit('needInstall',item.parentIdentifie,reloadInstallConfig);">去安装</span>
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
                                            <span v-if="!isCaptureMode" @click="sdShow=true;" class="ml-10 c-blue cursor" style="flex-shrink:0;">新建</span>
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

                                <a-form-item v-if="item.startParams.some(sp => isResourceParam(sp) && !sp.hidden)" label="资源配置">
                                    <div class="install-resource-fields">
                                        <div class="df ai-c install-resource-toggle">
                                            <a-switch v-model="item.resourceNoLimit" />
                                            <span class="ml-10">不限制资源</span>
                                        </div>
                                        <div class="install-resource-hint">开启时不应用资源限制；关闭后可填写，留空的项目仍不限制。</div>
                                        <template v-for="(sp,index) in item.startParams" :key="sp.name">
                                            <a-form-item v-if="isResourceParam(sp) && !sp.hidden" :label="sp.title" :field="'startParams['+index+'].value'"
                                                label-align="left" :label-col-props="{flex:'0 0 64px'}" :wrapper-col-props="{flex:'1'}"
                                                :rules="[{validator: (value, callback) => callback(resourceParamError(sp, item.resourceNoLimit) || undefined)}]">
                                                <a-input v-model="sp.value" :disabled="item.resourceNoLimit || sp.lock" placeholder="不限制">
                                                    <template v-if="sp.unit" #append>{{ sp.unit }}</template>
                                                </a-input>
                                            </a-form-item>
                                        </template>
                                    </div>
                                </a-form-item>
                                <div v-for="(sp,index) in item.startParams" :key="sp.name">
                                    <a-form-item v-if="!isResourceParam(sp) && !sp.hidden && sp.values_text!='%DOMAIN_HOST%' && sp.values_text!='%DOMAIN_URL%' && sp.values_text!='%DOMAIN_SSL_URL%'" @change="testInstallStatus" :label="sp.title" :field="'startParams['+index+'].value'" :rules="[{required:sp.required,message:'内容不能为空'}, validator(sp)]">
                                        <template #label>
                                            <span class="form-label">{{sp.title}}</span>
                                        </template>
                                        <div class="fc df df-c">
                                            <div class="df" style="align-items:center;gap:8px">
                                                <a-input v-if="sp.type=='text'" v-model="sp.value" :disabled="sp.lock" :spellcheck="false" placeholder="请输入" />
                                                <a-select v-if="sp.type=='pvc'" v-model="sp.value" :disabled="sp.lock" :allow-clear="!sp.required" placeholder="请选择存储分区">
                                                    <a-option v-for="storage in storages" :key="storage.name" :label="storage.name" :value="storage.name" />
                                                </a-select>
                                                <a-textarea v-if="sp.type=='textarea'" v-model="sp.value" :disabled="sp.lock" placeholder="请输入" />
                                                <a-select v-if="sp.type=='multiselect'" :model-value="sp.value ? String(sp.value).split(',') : []" multiple :disabled="sp.lock" placeholder="请选择" @update:model-value="value => { sp.value = value.join(','); testInstallStatus(); }">
                                                    <a-option v-for="opt in sp.options" :key="opt" :label="opt" :value="opt" />
                                                </a-select>
                                                <a-select v-if="sp.type=='select'" v-model="sp.value" :disabled="sp.lock" :spellcheck="false" placeholder="请选择">
                                                    <a-option v-for="opt in sp.options" :key="opt" :label="opt" :value="opt" />
                                                </a-select>
                                                <span v-if="sp.unit" style="flex-shrink:0">{{ sp.unit }}</span>
                                            </div>
                                            <div v-if="sp.type=='storage'" class="df">
                                                <a-select v-if="sp.form&&sp.form.storageClassName" v-model="sp.form.storageClassName.value" :disabled="sp.form.storageClassName.lock" @change="sp.value=sp.form.storageClassName.value+sp.form.storageSize.value" placeholder="请选择">
                                                    <a-option v-for="opt in storageClassNames" :key="opt" :label="opt" :value="opt"></a-option>
                                                </a-select>
                                                <a-input v-if="sp.form&&sp.form.storageSize" v-model="sp.form.storageSize.value" :disabled="sp.form.storageSize.lock" type="number" :spellcheck="false" placeholder="请填写存储大小" class="ml-20">
                                                    <template #append>Gi</template>
                                                </a-input>
                                                <custom-checkbox v-if="sp.form&&sp.form.storageRwMode" v-model="sp.form.storageRwMode.value" :disabled="sp.form.storageRwMode.lock" checked-value="ReadWriteMany" unchecked-value="ReadWriteOnce" class="ml-20 df-s0">多写</custom-checkbox>
                                            </div>
                                            <div v-if="sp.description" class="mt-4 c-aa">{{sp.description}}</div>
                                        </div>
                                    </a-form-item>
                                </div>
                                <a-empty v-if="(!item.startParams||!item.startParams.some(sp=>!sp.hidden)) && !item.requirePvc && !item.requireBuild && !item.requireParentReleaseName" description="没有配置项" />
                            </a-form>
                        </div>
                    </a-tab-pane>
                </a-tabs>
                <div class="df ai-c jc-b mt-30">
                    <a-button @click="prevStep">上一步</a-button>
                    <a-button type="primary" @click="nextStep">{{ isCaptureMode && form.activeIdentifie==form.installForm?.[form.installForm.length-1] ? '保存配置' : '下一步' }}</a-button>
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
                                        
                                        <span v-if="diItem.kind=='Job'" class="fc ml-20 c-99 txt-overhidden cursor" :title="[diItem.jobState?.text, diItem.jobState?.reason, diItem.log].filter(Boolean).join(' · ')" @click="openLog(diItem)">
                                            <span :class="{'c-red':diItem.jobState?.error}">{{ diItem.jobState?.text || (diItem.status==1 ? '已完成' : diItem.status==2 ? '任务失败' : '等待任务启动') }}</span>
                                            <span v-if="diItem.jobState?.reason && (diItem.jobState.error || !diItem.log)"> · {{ diItem.jobState.reason }}</span>
                                            <span v-if="diItem.log"> · {{ diItem.log }}</span>
                                        </span>
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
                                        <span v-if="diItem.status==2 && diItem.kind!='Ingress'" class="ml-6">失败</span>
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
        <jobLog installation title="安装日志" :show-tabs="false" :namespace="namespaceActive" :show="logs.show" :name="logs.name" @close="logs.show=false"></jobLog>
        <imageform-drawer :show="imgShow" @close="closeIMG"></imageform-drawer>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { isResourceParam, resourceParamValue, resourceParamError } from '@/utils/app-install-resources';
import { Modal } from '@arco-design/web-vue';
import { k8sproxy } from '@/utils/api';
import {
    getAppGroupApplicationType,
    getAppGroupListRouteName,
} from '@/utils/appgroup';

import axios from 'axios';
import { showRepoHtmlNotice } from '@/utils/app-install-notice';
import { useNamespaceStore,useLoadingStore } from '@/store';
import zoneDrawer from '@/views/storage/zone-drawer.vue';
import imageformDrawer from '@/views/config/sercet/imageform-drawer.vue';
import jobLog from '@/components/job-log.vue';
import customCheckbox from './custom-checkbox.vue';
import { getK8sinfo, getUserInfo } from '@/utils/auth';
import { loadDomainWhiteList } from '@/utils/domain-white-list';
import shortuuid from 'short-uuid';
import domainParseAlert from '@/components/domain-parse-alert.vue';
import InstallDomainGroups from '@/components/install-domain-groups.vue';
import { createDomainGroups, domainBindings, domainGroupEnvs, domainGroupError, domainHost, syncDefaultDomainGroups } from '@/utils/app-install-domain-group-values';

// 安装进度摘要：启动阶段来自 Pod 状态，终态优先使用 Job 条件。
function installJobStatus(job, pod, events = []) {
    const condition = job?.status?.conditions?.find(c => c.status === 'True' && ['Failed', 'Complete'].includes(c.type));
    if (condition) return { text: condition.type === 'Complete' ? '已完成' : '任务失败', error: condition.type === 'Failed', reason: condition.message || condition.reason || '' };
    const latest = [...events].sort((a, b) => new Date(b.lastTimestamp || b.eventTime || b.metadata?.creationTimestamp || 0) - new Date(a.lastTimestamp || a.eventTime || a.metadata?.creationTimestamp || 0));
    if (!pod) {
        const warning = latest.find(e => e.type === 'Warning');
        return { text: warning ? '安装任务启动受阻' : '正在准备安装任务', error: Boolean(warning), reason: warning?.message || '' };
    }
    const status = pod.status || {};
    if (status.phase === 'Succeeded') return { text: '已完成', error: false, reason: '' };
    const states = [...(status.initContainerStatuses || []), ...(status.containerStatuses || [])];
    const waiting = states.find(c => c.state?.waiting && !['ContainerCreating', 'PodInitializing'].includes(c.state.waiting.reason));
    if (waiting) {
        const state = waiting.state.waiting;
        const imageError = ['ErrImagePull', 'ImagePullBackOff', 'InvalidImageName'].includes(state.reason);
        return { text: imageError ? '镜像拉取失败' : '安装任务启动异常', error: true, reason: state.message || state.reason };
    }
    const terminated = states.find(c => c.state?.terminated?.exitCode > 0);
    if (terminated || status.phase === 'Failed') return { text: '安装任务执行失败', error: true, reason: terminated?.state.terminated.message || terminated?.state.terminated.reason || status.message || status.reason || '' };
    const scheduled = status.conditions?.find(c => c.type === 'PodScheduled' && c.status === 'False');
    if (scheduled) return { text: '等待分配安装资源', error: scheduled.reason === 'Unschedulable', reason: scheduled.message || scheduled.reason || '' };
    const initializing = status.conditions?.some(c => c.type === 'Initialized' && c.status === 'False');
    if (status.phase === 'Running' && !initializing && !states.some(c => c.state?.waiting)) return { text: '运行中', error: false, reason: '' };
    const event = latest[0];
    return { text: event?.reason === 'Pulling' ? '正在准备安装环境' : '正在启动安装任务', error: event?.type === 'Warning', reason: event?.message || '' };
}

export default {
    props: ['is_component','path_identifie','version','release_name','start_params','install_params'],
    emits: [ 'complete', 'configured', 'manifestTypeChange' ],
    data(){
        return {
            registryAuthorization: '',
            registryCredentialHost: '',
            registryLogin: {autoLoginTarget:'',required:false, registry:'', repository:'', secrets:[], secret:'', username:'', password:'', save:false, error:'', loading:false},
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
            dependencyReleaseBindings: {},
            appGroup: '',
            appManifestType: '',
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

            volumesTypes: {
                nfs: 'NFS',
                emptyDir: '临时目录',
                hostPath: '主机目录',
                pvc: 'PVC',
                configmap: 'ConfigMap',
                secret: 'Secret',
            },

            thirdparty_cd_token: '',
			reinstallConfirmed: false,
			clusterInstallUnsupported: false,
        }
    },
    async created(){
        this.namespaceActive = this.isCaptureMode && this.installInputParams.namespace
            ? this.installInputParams.namespace
            : useNamespaceStore().namespace;
        this.init();
    },
    components: {
        domainParseAlert,
        jobLog,
        zoneDrawer,
        InstallDomainGroups,
        imageformDrawer,
        customCheckbox,
    },
    unmounted(){
        clearInterval(this.interval);
    },
    computed: {
        installIngressHost(){
            const groups = this.form.forms?.[0]?.domainGroups;
            return groups?.find(group=>group.host)?.host || '';
        },
        installInputParams(){
            return this.is_component ? (this.install_params || {}) : (this.$route.query || {});
        },
        isCaptureMode(){
            return this.installInputParams.mode === 'capture';
        },
        clusterLevel(){
            return String(getK8sinfo()?.['w7.cc/is-ckm-req']) === 'true' ? 'sub' : 'main';
        },
        clusterInstallUnsupportedDescription(){
            return this.clusterLevel === 'sub'
                ? '该应用分类未开放子集群安装，请选择其他应用或切换集群。'
                : '该应用分类未开放主集群安装，请选择其他应用或切换集群。';
        },
    },
    methods: {
        async resolveSourceRegistryLogin(error, reinstall){
            const login = this.registryLogin;
            const detail = error.response.data.data || {};
            login.registry = detail.registry || '';
            login.repository = detail.repository || '';
            const target = login.registry + '/' + login.repository;
            // Retry once with the matched Secret; a rejected retry must show the login form.
            if(!this.registryAuthorization && login.autoLoginTarget !== target){
                login.autoLoginTarget = target;
                login.loading = true;
                try{
                    await this.loadSourceRegistrySecrets();
                    if(login.secret && login.username && login.password){
                        this.setSourceRegistryAuthorization();
                        if(await this.getInfo(reinstall)){
                            login.required = false;
                            login.error = '';
                            return true;
                        }
                        login.required = true;
                        login.error ||= '无法验证已有仓库登录配置，请重试或使用其他账号';
                        this.step = 0;
                        return false;
                    }
                }finally{login.loading = false}
            }
            login.required = true;
            if(this.registryAuthorization){login.error = error.response.data.error || '账号没有拉取权限'}
            this.step = 0;
            return false;
        },
        setSourceRegistryAuthorization(){
            const login = this.registryLogin;
            this.registryAuthorization = 'Basic '+btoa(String.fromCharCode(...new TextEncoder().encode(login.username+':'+login.password)));
            this.registryCredentialHost = login.registry;
        },
        async loadSourceRegistrySecrets(){
            try{
                const {data} = await k8sproxy.get('/api/v1/namespaces/'+this.namespaceActive+'/secrets?fieldSelector=type=kubernetes.io/dockerconfigjson');
                const matches = [];
                const registry = this.registryLogin.registry;
                const namespace = this.registryLogin.repository.split('/')[0];
                for(const secret of data?.items || []){
                    let config;
                    try{config = JSON.parse(atob(secret.data?.['.dockerconfigjson'] || ''))}catch{continue}
                    let storedNamespace = '';
                    try{storedNamespace=atob(secret.data?.namespace || '')}catch{continue}
                    if(storedNamespace && storedNamespace !== namespace){continue}
                    for(const [address, account] of Object.entries(config.auths || {})){
                        let source;
                        try{source = new URL(address.includes('://') ? address : 'https://'+address)}catch{continue}
                        if(source.host !== registry){continue}
                        const scope = source.pathname.replace(/^\/+|\/+$/g,'');
                        if(scope && scope !== 'v1' && scope !== namespace){continue}
                        let username = account.username || '', password = account.password || '';
                        if(!username && account.auth){
                            try{const decoded=atob(account.auth); const colon=decoded.indexOf(':'); if(colon<0){continue} username=decoded.slice(0,colon);password=decoded.slice(colon+1)}catch{continue}
                        }
                        matches.push({key:secret.metadata.name+'@'+address,name:secret.metadata.name,username,password});
                    }
                }
                this.registryLogin.secrets = matches;
                if(matches.length){this.registryLogin.secret=matches[0].key;this.selectSourceRegistrySecret(matches[0].key)}
            }catch(error){this.registryLogin.error='读取镜像仓库登录配置失败，请手动输入账号密码'}
        },
        selectSourceRegistrySecret(key){
            const account=this.registryLogin.secrets.find(item=>item.key===key);
            this.registryLogin.username=account?.username || '';
            this.registryLogin.password=account?.password || '';
        },
        async loginSourceRegistry(){
            const login=this.registryLogin;
            if(!login.username || !login.password){login.error='请输入用户名和密码';return}
            login.loading=true;login.error='';
            try{
                this.setSourceRegistryAuthorization();
                this.step=1;
                if(!await this.init()){this.step=0;return}
                login.required=false;
                if(login.save && !login.secret){
                    const name='zpk-source-'+this.createName();
                    const config={auths:{[login.registry]:{username:login.username,password:login.password,auth:this.registryAuthorization.slice(6)}}};
                    const encode=value=>btoa(String.fromCharCode(...new TextEncoder().encode(value)));
                    await k8sproxy.post('/api/v1/namespaces/'+this.namespaceActive+'/secrets',{
                        apiVersion:'v1',kind:'Secret',metadata:{name},type:'kubernetes.io/dockerconfigjson',
                        data:{'.dockerconfigjson':encode(JSON.stringify(config)),namespace:encode(login.repository.split('/')[0])},
                    });
                    login.save=false;
                }
            }catch(error){login.required=true;login.error=error?.response?.data?.error || '仓库登录配置保存失败';this.step=0}
            finally{login.loading=false}
        },
        isResourceParam,
        resourceParamError,
        hasOwn(object, key){
            return Object.prototype.hasOwnProperty.call(object || {}, key);
        },
        decodeInstallParam(value){
            let result = String(value ?? '');
            try{
                result = decodeURIComponent(result);
            }catch{}
            return result;
        },
        setAppManifestType(appGroupOrApplicationType){
            const applicationType = typeof appGroupOrApplicationType === 'string'
                ? appGroupOrApplicationType
                : getAppGroupApplicationType(appGroupOrApplicationType);
            if(this.appManifestType === applicationType){return}
            this.appManifestType = applicationType;
            this.$emit('manifestTypeChange', applicationType);
        },
        parseModuleInstallParams(value){
            if(value && typeof value === 'object' && !Array.isArray(value)){
                return value;
            }
            if(typeof value !== 'string' || !value){return {}}
            try{
                return JSON.parse(this.decodeInstallParam(value));
            }catch{
                return {};
            }
        },
        capturedInstallOption(identifie){
            if(!this.isCaptureMode){return null}
            return (this.installInputParams.installOptions || []).find(item=>{
                return this.normalizeDependencyIdentifie(item?.identifie) === this.normalizeDependencyIdentifie(identifie);
            }) || null;
        },
        capturedStartParamValues(identifie){
            const option = this.capturedInstallOption(identifie);
            return Object.fromEntries((option?.envKv || option?.envkv || []).map(item=>[item.name,item.value]));
        },
        moduleInstallParams(identifie, index){
            const input = this.installInputParams || {};
            const modules = input.modules && typeof input.modules === 'object' ? input.modules : {};
            const capturedOption = this.capturedInstallOption(identifie);
            const captured = capturedOption ? {
                enabled: Number(capturedOption.replicas || 0) > 0,
                pvcName: capturedOption.pvcname || '',
                parentReleaseName: capturedOption.parentReleaseName || '',
                dockerRegistrySecretName: capturedOption.dockerRegistrySecretName || '',
                preSubPath: capturedOption.preSubPath,
                volumes: capturedOption.volumes,
                volumesMounts: capturedOption.volumesMounts,
                annotations: capturedOption.annotations,
            } : {};
            const hasDirect = this.hasOwn(input, identifie);
            const hasModule = this.hasOwn(modules, identifie);
            const direct = this.parseModuleInstallParams(hasDirect ? input[identifie] : null);
            const module = this.parseModuleInstallParams(hasModule ? modules[identifie] : null);
            const values = {...captured, ...direct, ...module};
            let provided = Boolean(capturedOption) || (this.is_component ? hasDirect : Boolean(input[identifie])) || hasModule;
            if(Number(index) === 0){
                ['pvcName','preSubPath'].forEach(key=>{
                    if(this.hasOwn(input, key)){
                        values[key] = input[key];
                        provided = true;
                    }
                });
            }
            return {
                provided,
                enabled: capturedOption ? Boolean(values.enabled) : values.enabled !== false,
                values,
            };
        },
        startParamOverrides(identifie, index){
            const input = this.installInputParams || {};
            const moduleParams = this.moduleInstallParams(identifie, index).values;
            const inputStartParams = input.startParams || input.start_params || {};
            const moduleStartParams = moduleParams.startParams || moduleParams.start_params || {};
            return {
                ...(this.start_params || {}),
                ...(inputStartParams && typeof inputStartParams === 'object' ? inputStartParams : {}),
                ...(moduleStartParams && typeof moduleStartParams === 'object' ? moduleStartParams : {}),
            };
        },
        applyStartParamOverrides(form, index){
            const overrides = this.startParamOverrides(form.identifie, index);
            form.startParams?.forEach(param=>{
                if(param.type === 'storage'){
                    Object.values(param.form || {}).forEach(storageParam=>{
                        if(!this.hasOwn(overrides, storageParam.name)){return}
                        storageParam.value = String(overrides[storageParam.name] ?? '');
                        storageParam.lock = true;
                    });
                    return;
                }
                if(!this.hasOwn(overrides, param.name)){return}
                param.value = String(overrides[param.name] ?? '');
                param.lock = true;
            });
        },
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
            this.syncConsoleDomainGroup();
        },
        async init(reinstall = false){
			if(!reinstall){
				this.reinstallConfirmed = false;
			}
            if(this.is_component){
                this.path = this.path_identifie;
                this.releaseName = this.release_name || this.installInputParams.releaseName || this.installInputParams.releasename || '';
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
            if(this.registryAuthorization){
                let source;
                try{source=new URL(this.path)}catch{}
                if(source?.host!==this.registryCredentialHost){
                    this.registryAuthorization='';this.registryCredentialHost='';
                    Object.assign(this.registryLogin,{autoLoginTarget:'',required:false,username:'',password:'',secrets:[],secret:''});
                }
            }
            // 放前面
            await this.getToken();
            await this.getStorage();
            await this.getWhiteList();
			if(!await this.getInfo(reinstall)){return false}
            await this.getMirror();
            await this.getIngressclassList();
            // 第一步域名
            const configuredDomain = this.installInputParams.domain || this.installInputParams.ingressHost;
            this.form.dnsProfileId = this.installInputParams.dnsProfileId || '';
            this.form.autoResolve = this.installInputParams.autoResolve || false;
            if(configuredDomain){
                let domain = this.decodeInstallParam(configuredDomain);
                let match = domain.match(/^(http(s)?:\/\/)(.*)$/)
                if(match){
                    this.form.ingressHostPre = match[1];
                    this.form.ingressHost = match[3];
                    this.form.auto_ssl = this.form.ingressHostPre == 'https://';
                }else{
                    this.form.ingressHost = domain;
                    this.form.ingressHostPre = this.installInputParams.ingressForceHttps ? 'https://' : 'http://';
                    this.form.auto_ssl = Boolean(this.installInputParams.ingressForceHttps);
                }
                this.whiteList = [];
                this.form.ingressDisabled = !this.isCaptureMode;
                this.configConsole.isSelect = false;
            }else{
                if(this.form.requireDomain && this.whiteList?.length && this.whiteList?.[this.form.whiteDomain]?.prefixRandom && !this.form.ingressHost){
                    this.form.ingressHost = this.createShortUuid();
                }
            }
            if(this.installInputParams.ingressSeletorName){
                this.form.ingressSeletorName = this.installInputParams.ingressSeletorName;
            }
            if(this.installInputParams.ingressClass){
                this.form.ingressclass = this.installInputParams.ingressClass;
            }
            const defaultGroup = this.form.forms?.[0]?.domainGroups?.find(group=>group.param === 'default');
            if(defaultGroup && (configuredDomain || this.form.ingressHost)){
                const zone = !configuredDomain && !this.configConsole.isConsole && this.whiteList[this.form.whiteDomain]?.domain;
                Object.assign(defaultGroup, {host: domainHost(this.form.ingressHost + (zone ? '.' + zone : '')), autoSSL: defaultGroup.forceSSL || this.form.auto_ssl, dnsProfileId: this.form.dnsProfileId, autoResolve: !!this.form.autoResolve, hostLocked: this.form.ingressDisabled});
            }
            this.nextStep();
            return true;
        },
        
        getToken(){
            return panelApi.get("/auth/console/info",{noAlert:true}).then(res=>{
                let thirdparty_cd_token = res?.data?.thirdparty_cd_token;
                this.thirdparty_cd_token = thirdparty_cd_token;
            }).catch(()=>{});
        },
        async getWhiteList(){
            try { this.whiteList = await loadDomainWhiteList(); }
            catch (error) { this.$message.error('域名白名单加载失败'); throw error; }
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
        normalizeDependencyIdentifie(value){
            return String(value || '').trim().toLowerCase().replaceAll('_','-');
        },
        normalizeDependencyParamName(value){
            return String(value || '').trim();
        },
        isDependencyPVCName(value){
            return this.normalizeDependencyParamName(value).toUpperCase()=='PVC_NAME';
        },
        getFormStartParamFields(form){
            let result = [];
            (form?.startParams || []).forEach(param=>{
                if(param?.type=='storage' && param.form){
                    result.push(...Object.values(param.form));
                    return;
                }
                result.push(param);
            });
            return result;
        },
        getModuleStartParamValue(form,name){
            const sourceName = this.normalizeDependencyParamName(name);
            const fields = this.getFormStartParamFields(form);
            const param = fields.find(item=>{
                return this.normalizeDependencyParamName(item?.name)==sourceName;
            }) || fields.find(item=>item?.values_text===`%${sourceName}%`);
            if(!param){return this.isDependencyPVCName(sourceName) ? form?.pvcname : undefined}
            if(param.values_text=='%STORAGE_SIZE%'){
                return param.value ? String(param.value).replace(/Gi$/i,'') : param.value;
            }
            return param.value;
        },
        findConfigModuleForm(moduleName,currentForm = null){
            const normalizedModuleName = this.normalizeDependencyIdentifie(moduleName);
            if(!normalizedModuleName){return null}
            return (this.form.forms || []).find(item=>{
                return item!==currentForm
                    && this.normalizeDependencyIdentifie(item?.identifie)==normalizedModuleName;
            }) || null;
        },
        syncModuleStartParams(showMessage = true, endIndex = null){
            const forms = this.form.forms || [];
            const lastIndex = endIndex===null ? forms.length-1 : endIndex;
            for(let index=0; index<=lastIndex; index++){
                const current = forms[index];
                if(!current || (!current.requireInstall && !current.isInstall)){continue}
                for(const param of this.getFormStartParamFields(current)){
                    if(!param?.module_name){continue}
                    const sourceForm = this.findConfigModuleForm(param.module_name,current);
                    if(!sourceForm){continue}
                    const valuesText = String(param.values_text || '');
                    const template = /%([^%]+)%/.test(valuesText) ? valuesText : (param.name ? `%${param.name}%` : '');
                    const placeholders = [...template.matchAll(/%([^%]+)%/g)];
                    if(!placeholders.length){continue}
                    let message = '';
                    if(!sourceForm.requireInstall && !sourceForm.isInstall){
                        message = `${current.name || current.identifie} 依赖的 ${sourceForm.name || sourceForm.identifie} 尚未启用`;
                    }
                    let missingName = '';
                    const value = template.replace(/%([^%]+)%/g,(match,name)=>{
                        const sourceValue = this.getModuleStartParamValue(sourceForm,name);
                        if(sourceValue===undefined || sourceValue===null || sourceValue===''){
                            missingName = name;
                            return match;
                        }
                        return String(sourceValue);
                    });
                    if(!message && missingName){
                        message = `${sourceForm.name || sourceForm.identifie} 未提供启动参数 ${missingName}`;
                    }
                    if(message){
                        if(showMessage){this.$message.warning(message)}
                        return false;
                    }
                    param.value = value;
                    param.lock = true;
                    if(this.isDependencyPVCName(param.name)){
                        current.pvcname = value;
                        current.pvcDisabled = true;
                    }
                }
            }
            return true;
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
                this.setAppManifestType(data);
                this.path = data.spec.zpkUrl;
                this.releaseName = this.$route.query.completeName;
                return true;
            }
            return panelApi.get('/zpk/config',{headers: this.registryAuthorization ? {'X-Registry-Authorization':this.registryAuthorization} : {}, params:{
                repoUrl: this.path,
                thirdpartyCDToken: this.installInputParams.thirdpartyCDToken,
                // Configuration capture describes a future installation. Do
                // not let a same-named application in the management panel
                // turn this request into an upgrade or conflict check.
                releaseName: this.isCaptureMode ? '' : this.releaseName,
                reinstall,
            },noAlert:true}).then(async res=>{
                if(!res?.data){return true}
				if(!this.isClusterInstallSupported(res.data)){
					this.clusterInstallUnsupported = true;
					return false;
				}
				this.clusterInstallUnsupported = false;

                this.applyDependencyReleaseBindings(res.data);

                if(res?.data?.[0]){
                    let i = res.data?.[0];
                    this.info = {
                        title: i.name,
                        icon: i.icon,
                    }
                    this.identifie = i.identifie;
                    this.setAppManifestType(i.packageType);

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
                    }
                    const overrides = this.startParamOverrides(i.identifie, index);
                    const capturedValues = this.capturedStartParamValues(i.identifie);
                    let startParams = [];
                    i?.startParams?.map(j=>{
                        let options = Array.isArray(j.options) ? j.options : [];
                        let value = j.values_text || '';
                        // TODO: 临时兼容旧制品用 | 分隔候选项并默认选中第一项，下个版本移除。
                        if(!Array.isArray(j.options) && (!j.type || ['text', 'select'].includes(j.type)) && /^([^\|]+\|)+[^\|]+$/.test(j.values_text)){
                            options = j.values_text.split('|');
                            value = options?.[0] || '';
                            j.type = 'select';
                        }
                        const hasOverride = this.hasOwn(overrides, j.name);
                        const hasCapturedValue = this.hasOwn(capturedValues, j.name);
                        if(hasOverride){
                            value = String(overrides[j.name] ?? '');
                        }else if(hasCapturedValue){
                            value = String(capturedValues[j.name] ?? '');
                            if(j.values_text === '%STORAGE_SIZE%'){
                                value = value.replace(/Gi$/i,'');
                            }
                        }
                        // Render the supplied PVC selector parameter without changing the parameter list.
                        if(j.values_text=='%PVC_NAME%' && !j.module_name){
                            startParams.push({
                                ...j,
                                type: 'pvc',
                                value: hasOverride || hasCapturedValue ? value : (j.required ? (this.storages?.find(storage=>storage.isDefault)?.name || this.storages?.[0]?.name || '') : ''),
                                lock: j.lock || hasOverride,
                            });
                            return;
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
                                    value: hasOverride || hasCapturedValue ? value : defaultVal[j.values_text],
                                    values_text: j.values_text,
                                    lock: j.lock || hasOverride,
                                    module_name: j.module_name,
                                }
                                find.value = find.form?.storageClassName?.value + find.form?.storageSize?.value;
                            }else{
                                let form = {};
                                form[names[j.values_text]] = {
                                    name: j.name,
                                    value: hasOverride || hasCapturedValue ? value : defaultVal[j.values_text],
                                    values_text: j.values_text,
                                    lock: j.lock || hasOverride,
                                    module_name: j.module_name,
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
                            type: j.type || 'text',
                            options: options,
                            required: j.required || false,
                            value: value,
                            values_text: j.values_text || '',
                            module_name: j.module_name, // 模块名称
                            description: j.description,
                            lock: j.lock || hasOverride,
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
                    const moduleParams = this.moduleInstallParams(i.identifie, index);
                    let isInstall = moduleParams.provided && moduleParams.enabled;
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
                        supportCluster: i.supportCluster || 'all',
                        
                        name: i.name, // 名称
                        identifie: i.identifie, // 标识
                        isInstall: isInstall, // 是否安装
                        domainGroups: createDomainGroups(i.ingress, {...capturedValues, ...overrides}, this.capturedInstallOption(i.identifie)?.domainGroups || this.moduleInstallParams(i.identifie,index).values.domainGroups || [], this.whiteList, {...i, inheritDefault: index > 0}),
                        startParams: startParams, // 启动参数
                        resourceNoLimit: !startParams.some(param => isResourceParam(param) && this.hasOwn(capturedValues, param.name) && capturedValues[param.name] !== ''),
                        outModuleNames: i.outModuleNames || [], // 依赖应用
                        dependsOnes: i.dependsOnes || [],
                    };
                }) || [];
                this.form.forms = forms;
                this.syncConsoleDomainGroup();
                syncDefaultDomainGroups(forms);
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
                        f.domainGroups = f.domainGroups.map(group=>{
                            const param = group.valueParam || (group.param === 'default' ? (this.hasOwn(envs,'DOMAIN_URL') ? 'DOMAIN_URL' : 'DOMAIN_SSL_URL') : group.param);
                            if(!this.hasOwn(envs,param)) return group;
                            const value = String(envs[param] ?? '');
                            const autoSSL = envs['domainGroups.'+group.param+'.autoSSL'];
                            return {...group, host: domainHost(value), hostLocked: true, inheritDefault: false, autoSSL: group.forceSSL || (autoSSL != null ? String(autoSSL) === 'true' : /^https:\/\//i.test(value)), dnsProfileId: envs['domainGroups.'+group.param+'.dnsProfileId'] || group.dnsProfileId};
                        });
    
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
                        
                        if(i=='0' && this.configConsole.isConsole && this.form?.requireDomain && envs?.DOMAIN_URL){
                            let url = envs.DOMAIN_URL;
                            const domainGroup = f.domainGroups.find(group => group.param === 'DOMAIN_URL' || group.param === 'default');
                            this.form.auto_ssl = domainGroup ? !!domainGroup.autoSSL : /^https:\/\//i.test(url);
                            this.form.ingressHostPre = this.form.auto_ssl ? 'https://' : 'http://';
                            this.form.ingressHost = domainHost(url);
                            this.form.ingressDisabled = true;
                        }
                    }
                    
                    // 从参数获取 pvcname , presubpath
                    const moduleParams = this.moduleInstallParams(identifie, i).values;
                    if(Object.keys(moduleParams).length){
                        let querys = moduleParams;
                        if(this.hasOwn(querys,'pvcName')){
                            f.pvcname = querys.pvcName;
                            f.pvcDisabled = !this.isCaptureMode;
                        }
                        if(this.hasOwn(querys,'parentReleaseName')){
                            f.parentReleaseName = querys.parentReleaseName;
                        }
                        if(this.hasOwn(querys,'dockerRegistrySecretName')){
                            f.registry = querys.dockerRegistrySecretName;
                        }
                        if(this.hasOwn(querys,'preSubPath')){
                            f.preSubPath = querys.preSubPath;
                        }
                        if(Array.isArray(querys.volumes)){
                            f.volumes = querys.volumes;
                        }
                        if(Array.isArray(querys.volumesMounts)){
                            f.volumesMounts = querys.volumesMounts;
                        }
                        if(querys.annotations && typeof querys.annotations === 'object'){
                            this.svAnnotations[identifie] = querys.annotations;
                        }
                    }
                    this.applyStartParamOverrides(f, i);
                }
                this.syncModuleStartParams(false);
                // 更新应用，替换env
                if(!this.releaseName && res?.data?.[0]?.releaseName){ this.releaseName = res.data[0].releaseName; }
				return true;
            }).catch(async error=>{
                if(error?.response?.data?.code === 'ZPK_REGISTRY_AUTH_REQUIRED'){
                    return this.resolveSourceRegistryLogin(error, reinstall);
                }
                if(this.handleRepoNotice(error, null, true)){return false}
				this.$message.error(error?.response?.data?.error || error?.message || '获取安装配置失败');
				return false;
            })
        },
        goBackList(){
            if(this.is_component){this.$emit('close'); return;}
            this.$router.push({name: getAppGroupListRouteName(this.appManifestType)});
        },
        goBackMarket(){
            if(this.is_component){this.$emit('close'); return;}
            if(window.history.length > 1){
                this.$router.back();
                return;
            }
            this.$router.push({name:'app-product-market'});
        },
		isClusterConfigSupported(config){
			const supportCluster = String(config?.supportCluster || 'all').trim();
			return supportCluster === 'all' || supportCluster === this.clusterLevel;
		},
		isClusterInstallSupported(configs){
			if(!Array.isArray(configs) || configs?.[0]?.isUpgrade){return true}
			return configs.every((item,index)=>{
				const moduleParams = this.moduleInstallParams(item?.identifie, index);
				const optionalEnabled = moduleParams.provided && moduleParams.enabled;
				if(index > 0 && !item?.requireInstall && !optionalEnabled){return true}
				return this.isClusterConfigSupported(item);
			});
		},
        closeIMG(v){
            this.imgShow = false;
            v && this.getMirror();
        },
        closeSD(v, name){
            this.sdShow = false;
            v && this.getStorage(name);
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
			const item = this.form.forms.find(i=>i.identifie==identifie);
			if(item?.isInstall && !this.isClusterConfigSupported(item)){
				item.isInstall = false;
				this.$message.warning(`依赖应用“${item.title || item.name || identifie}”不支持当前集群等级，无法启用安装`);
			}
            this.form.installForm = this.form.forms.filter(i=>i.requireInstall || i.isInstall).map(i=>i.identifie);
			let isInstall = item?.isInstall;
            if(this.form.activeIdentifie==identifie && !isInstall){
                this.filterInstall();
            }
            this.syncModuleStartParams(false);
        },
        async startParamsFocus(sp){
            if(!sp.module_name||!/%\w+%/.test(sp.value)){return}
            if(sp.module_name!='w7_mysql5' && sp.module_name!='w7_mysql' && sp.module_name!='w7_redis'){return}
            let result = await this.testRely({identifie:sp.module_name, name:sp.module_name});
            if(result.installed===false){
                this.$emit('needInstall',{identifie:sp.module_name, name:sp.module_name},this.reloadInstallConfig);
            }
        },
        // 检测依赖
        async testModuleNames(){
            this.installAlert = {};
            
            for(let index in this.form.forms){
                let i = this.form.forms[index];
                this.installAlert[i.identifie] = [];
                const declaredDependencyNames = new Set();
                (i.dependsOnes || []).forEach(item=>{
                    [
                        item.identifie,
                        item.subidentifie,
                        item.subidentifie ? `${item.identifie}/${item.subidentifie}` : '',
                    ].filter(Boolean).forEach(name=>{
                        declaredDependencyNames.add(this.normalizeDependencyIdentifie(name));
                    });
                });
                for(let m in i.outModuleNames){
                    let name = i.outModuleNames[m];
                    if(/\./.test(name)){continue}
                    if(declaredDependencyNames.has(this.normalizeDependencyIdentifie(name))){continue}
                    let dependency = {identifie:name, name:name, required:false};
                    let result = await this.testRely(dependency);
                    let title = await this.getTitleByMn(name);
                    this.installAlert[i.identifie].push({
                        ...dependency,
                        name: name,
                        title: title,
                        isInstall: result.installed,
                        releaseNameConflict: result.releaseNameConflict,
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
                    let result = await this.testRely(item);
                    this.installAlert[i.identifie].push({
                        ...item,
                        name: name,
                        title: title,
                        isInstall: result.installed,
                        releaseNameConflict: result.releaseNameConflict,
                        required: item.required,
                    });
                }
            }
        },
        dependencyReleaseBindingKey(form, dependency){
            return [
                form?.identifie || '',
                dependency?.identifie || '',
                dependency?.subidentifie || '',
                dependency?.from || '',
            ].join('\n');
        },
        applyDependencyReleaseBindings(configs){
            (configs || []).forEach(form => {
                (form?.dependsOnes || []).forEach(dependency => {
                    if(!dependency?.releaseName){return}
                    const key = this.dependencyReleaseBindingKey(form, dependency);
                    const cached = this.dependencyReleaseBindings[key];
                    if(dependency.releaseNameFixed || !cached){
                        this.dependencyReleaseBindings[key] = {
                            releaseName: dependency.releaseName,
                            releaseNameFixed: Boolean(dependency.releaseNameFixed),
                        };
                        return;
                    }
                    dependency.releaseName = cached.releaseName;
                    dependency.releaseNameFixed = cached.releaseNameFixed;
                });
            });
        },
        collectDependencyBindings(){
            const result = new Map();
            (this.form.forms || []).forEach(form=>{
                if(!form || (!form.requireInstall && !form.isInstall)){return}
                (form.dependsOnes || []).forEach(dependency=>{
                    const releaseName = String(dependency?.releaseName || '').trim();
                    if(!releaseName){return}
                    const identifie = dependency?.subidentifie || dependency?.identifie || '';
                    const key = `${this.namespaceActive}\n${releaseName}`;
                    result.set(key, {
                        namespace: this.namespaceActive,
                        releaseName,
                        identifie,
                    });
                });
            });
            return [...result.values()];
        },
        // 获取模块名称
        async getTitleByMn(name){
            const configModule = this.findConfigModuleForm(name);
            if(configModule){
                return configModule.name || configModule.identifie || name;
            }
            return panelApi.get('/zpk/config',{params:{
                repoUrl: 'https://zpk.w7.cc/zpk/respo/info/'+name,
                thirdpartyCDToken: this.installInputParams.thirdpartyCDToken,
            },noAlert:true}).then(res=>{
                return res.data?.[0]?.name;
				}).catch(error=>{
					if(this.handleRepoNotice(error)){return name}
					this.$message.error(error?.response?.data?.error || error?.message || '获取依赖应用信息失败');
				return name;
            })
        },
        validator(sp){
            if(this.isCaptureMode){return {}}
            let find = this.installAlert[this.form.activeIdentifie]?.find(i=>i.name==sp.module_name);
            if(!find || find.isInstall || ((!find.required)&&find.replaceAll)){return {}}
            return {
                validator: (value,cb)=>{
                    if(find.releaseNameConflict){
                        cb('依赖安装名称冲突，请重新加载安装配置');
                        return;
                    }
                    if(!find.required){
                        value == sp.values_text? cb('请安装'+ (find.title || find.name) +'或输入正确的值') : cb();
                    }else{
                        cb('请安装'+ (find.title || find.name))
                    }
                }
            }
        },
        // 检测依赖
        testRely(dependency){
            dependency = typeof dependency === 'string'
                ? {identifie:dependency, name:dependency}
                : (dependency || {});
            const identify = dependency.subidentifie || dependency.identifie || dependency.name;
            if(!String(dependency.releaseName || '').trim()){
                const configModule = this.findConfigModuleForm(identify);
                if(configModule){
                    const installed = Boolean(configModule.requireInstall || configModule.isInstall);
                    if(installed){this.syncModuleStartParams(false)}
                    return Promise.resolve({installed, releaseNameConflict:false});
                }
            }
            return panelApi.get('/zpk/out-depends/env',{
                params:{
                    identifie: identify,
                    releaseName: dependency.releaseName || '',
                    namespace: this.namespaceActive,
                },
                noAlert: true,
            }).then(res=>{
                const releaseNameConflict = Boolean(
                    res.data?.installed
                    && dependency.releaseName
                    && dependency.releaseNameFixed === false
                );
                if(res.data?.installed && !releaseNameConflict){
                    // 如果安装，替换
                    let envs = res.data?.envs || {};
                    const dependencyModuleNames = new Set([
                        dependency.identifie,
                        identify,
                    ].filter(Boolean).map(name=>this.normalizeDependencyIdentifie(name)));
                    this.form.forms.forEach(i=>{
                        i.startParams?.forEach(sp=>{
                            const moduleName = this.normalizeDependencyIdentifie(sp.module_name);
                            if(!dependencyModuleNames.has(moduleName)){return}
                            const template = String(sp.values_text || sp.value || '');
                            sp.value = template.replace(/%([^%]+)%/g, (match, p1) => {
                                return envs[p1] ?? match;
                            });
                        })
                    })
                }
                return {
                    installed: Boolean(res?.data?.installed) && !releaseNameConflict,
                    releaseNameConflict,
                };
            })
        },
        reloadInstallConfig(){
            this.step = 1;
            this.init();
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
                    if(this.registryLogin.required){this.step = 0}
                }else{
                    let index = this.form.installForm.findIndex(i=>i==this.form.activeIdentifie);
                    this.form.activeIdentifie = this.form.installForm[index-1];
                }
            }else if(this.step==3){
                this.step = 2;
            }
        },
        syncConsoleDomainGroup(){
            const root = this.form.forms?.[0];
            if(!this.configConsole.isConsole || !this.configConsole.isSelect || !this.form.fullDomain || !root?.domainGroups?.length) return;
            root.domainGroups[0] = {...root.domainGroups[0],host:domainHost(this.form.ingressHost),autoSSL:root.domainGroups[0].forceSSL || this.form.auto_ssl,dnsProfileId:this.form.dnsProfileId || root.domainGroups[0].dnsProfileId,autoResolve:!!this.form.autoResolve};
        },
        syncInheritedDomainGroups(){
            this.syncConsoleDomainGroup();
            syncDefaultDomainGroups(this.form.forms);
        },
        validateDomainGroups(activeOnly=false){
            this.syncInheritedDomainGroups();
            const forms = this.form.forms.filter(item=>(item.requireInstall || item.isInstall || item.index === 0) && (!activeOnly || item.identifie === this.form.activeIdentifie));
            for(const item of forms){
                if(!(item.domainGroups || []).some(group=>domainGroupError(group))) continue;
                this.form.activeIdentifie = item.identifie;
                this.$nextTick(()=>{
                    const ref = this.$refs['domains-'+item.identifie];
                    (Array.isArray(ref) ? ref[0] : ref)?.validate();
                });
                return false;
            }
            return true;
        },
        nextStep(){
            if(this.step==1){
                this.syncInheritedDomainGroups();
                this.step = 2;
                this.form.activeIdentifie = this.form.installForm?.[0];
            }else if(this.step==2){
                const activeIndex = this.form.forms.findIndex(item=>item.identifie==this.form.activeIdentifie);
                if(!this.validateDomainGroups(true)){return}
                if(!this.syncModuleStartParams(true,activeIndex)){return}
                this.$refs['form-'+this.form.activeIdentifie][0].validate((valid)=>{
                    if(valid){return}
                    if(this.form.activeIdentifie==this.form.installForm?.[this.form.installForm.length-1]){
                        if(!this.isCaptureMode){
                            for(let i in this.installAlert[this.form.activeIdentifie]){
                                let item = this.installAlert[this.form.activeIdentifie][i];
                                if(item.releaseNameConflict || (!item.isInstall && item.required)){
                                    this.$message.warning('请安装'+item.title);
                                    return;
                                }
                            }
                        }
                        this.install();
                    }else{
                        let index = this.form.installForm.findIndex(i=>i==this.form.activeIdentifie);
                        const nextIdentifie = this.form.installForm[index+1];
                        const nextIndex = this.form.forms.findIndex(item=>item.identifie==nextIdentifie);
                        if(!this.syncModuleStartParams(true,nextIndex)){return}
                        this.form.activeIdentifie = nextIdentifie;
                    }
                });
            }
        },
        // 安装
        async install(){
            for (const item of this.form.forms.filter(item => item.requireInstall || item.isInstall)) {
                const error = item.startParams.map(param => isResourceParam(param) ? resourceParamError(param, item.resourceNoLimit) : '').find(Boolean);
                if (error) { this.$message.error(error); return; }
            }
            if(!this.validateDomainGroups()){return}
            if(!this.syncModuleStartParams(true)){return}
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
                                value: fi.values_text=='%STORAGE_SIZE%'
                                    ? (String(fi.value || '').replace(/Gi$/i,'') + 'Gi')
                                    : fi.value,
                            })
                        }
                        return;
                    }
                    envKv.push({ name: j.name, value: isResourceParam(j) ? resourceParamValue(j, i.resourceNoLimit) : j.value,});
                })

                let volumesMounts = i.volumesMounts?.map?.(i=>{
                    delete i.type;
                    return i;
                }) || []
                let o = {
                    replicas: (i.requireInstall||i.isInstall)? 1 : 0,
                    identifie: i.identifie,
                    envKv: [...envKv.filter(env=>!i.domainGroups.some(group=>group.param===env.name)), ...domainGroupEnvs(i.domainGroups)],
                    ...(i.domainGroups.length ? {domainGroups:domainBindings(i.domainGroups)} : {}),
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
            const primaryGroup = this.form.forms?.[0]?.domainGroups?.find(group=>group.host);
            let ingressHost = this.installIngressHost;
            let params = {
                repoUrl: repoUrl || this.path,
                registryAuth: this.registryAuthorization || undefined,
                namespace: this.namespaceActive,
                releaseName: releaseName || this.releaseName || (this.identifie.replaceAll('_','-') + '-' +this.createName()),
                ingressHost: ingressHost,
                ingressForceHttps: primaryGroup ? Boolean(primaryGroup.autoSSL || primaryGroup.forceSSL) : this.form.auto_ssl,
                dnsProfileId: primaryGroup ? (primaryGroup.dnsProfileId || '') : (this.form.dnsProfileId || ''),
                autoResolve: primaryGroup ? !!primaryGroup.autoResolve : !!this.form.autoResolve,
                ingressClass: this.form.ingressclass,
                ingressSeletorName: this.form.ingressSeletorName,
                installOptions: installOptions,
                dependencies: this.collectDependencyBindings(),
                clusterId: this.installInputParams.insClusterId || this.installInputParams.clusterId || '',
                thirdpartyCDToken: this.installInputParams.thirdpartyCDToken || this.thirdparty_cd_token,
                panelUrl: window.location.origin,
            }

            if(this.installInputParams.isTrandition){
                params.isTrandition = true;
                params.zipUrl = this.decodeInstallParam(this.installInputParams.zipUrl);
            }
			if(this.reinstallConfirmed){
				params.reinstall = true;
			}

            if(this.isCaptureMode){
                const allowedKeys = ['repoUrl','namespace','releaseName','ingressHost','ingressForceHttps','dnsProfileId','autoResolve','ingressClass','ingressSeletorName','isTrandition','zipUrl','dependencies'];
                const spec = Object.fromEntries(allowedKeys.filter(key=>params[key]!==undefined).map(key=>[key,params[key]]));
                spec.installOptions = params.installOptions.map(option=>{
                    const captured = {...option};
                    delete captured.registry;
                    return captured;
                });
                this.$emit('configured', {spec});
                return;
            }
			if(this.form.forms.some(item=>item.isUpgrade)){
				try{
					const response = await panelApi.post('/zpk/crds/upgrade-check', params, {loading:true,noAlert:true});
					const { names = [], digest = '' } = response?.data || {};
					if(names.length){
						const confirmed = await new Promise(resolve=>Modal.confirm({
							title: '更新应用 CRD',
							content: `以下 CRD 的定义将先于应用更新：${names.join('、')}。请确认继续。`,
							okText: '确认更新',
							onOk: ()=>resolve(true),
							onCancel: ()=>resolve(false),
						}));
						if(!confirmed){return}
					}
					params.crdApprovalDigest = digest;
				}catch(error){
					this.$message.error(error?.response?.data?.error || error?.message || 'CRD 检测失败');
					return;
				}
			}

            panelApi.put('/zpk/install',params,{loading:true,noAlert:true}).then(res=>{
                if(res?.data?.dnsResolveError) this.$message.error(`应用已安装，自动解析失败：${res.data.dnsResolveError}`);
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
				if(this.handleRepoNotice(error, {...params})){return}
				this.$message.error(error?.response?.data?.error || error?.message || '安装失败');
			});
        },
        handleRepoNotice(error, params = null, retryConfig = false){
            const canReinstall = !this.isCaptureMode && Boolean(params || retryConfig);
            return showRepoHtmlNotice(error, {
                onReinstall: canReinstall ? () => this.forceReinstall(params, retryConfig) : undefined,
            });
        },
		forceReinstall(params = null, retryConfig = false){
			if(this.isCaptureMode){return}
			if(retryConfig){
				this.reinstallConfirmed = true;
				return this.init(true);
			}
			if(!params){return}
			return panelApi.put('/zpk/install', {...params, reinstall:true}, {loading:true,noAlert:true}).then(res=>{
				if(res?.data?.dnsResolveError) this.$message.error(`应用已安装，自动解析失败：${res.data.dnsResolveError}`);
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
					if(this.handleRepoNotice(error, {...params, reinstall:true})){return}
				this.$message.error(error?.response?.data?.error || error?.message || '强制安装失败');
			});
		},
        // 安装状态
        getStatus(name){
            this.appGroup = name;
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+name).then(res=>{
                this.setAppManifestType(res?.data);
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
                await panelApi.get('/domain-parse',{noAlert:true}).then(res=>{
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

            const releaseName = this.appGroup;
            let getBuild = async (item,i,j)=>{
                const update = values => {
                    if (this.appGroup !== releaseName) return;
                    const target = this.complete.items[i]?.resourcesList?.[j];
                    if (target?.name === item.name) Object.assign(target, values);
                };
                try {
                    const [jobResult, podsResult] = await Promise.all([
                        k8sproxy.get(`/apis/batch/v1/namespaces/${this.namespaceActive}/jobs/${item.name}`, { noAlert: true }),
                        k8sproxy.get(`/api/v1/namespaces/${this.namespaceActive}/pods`, { params: { labelSelector: 'job-name='+item.name }, noAlert: true }),
                    ]);
                    const job = jobResult?.data;
                    const pod = [...(podsResult?.data?.items || [])].sort((a,b) => new Date(b.metadata?.creationTimestamp || 0) - new Date(a.metadata?.creationTimestamp || 0))[0];
                    update({ jobState: installJobStatus(job, pod) });
                    // 容器未启动时查询事件，补充资源不足、创建失败等具体原因。
                    const states = [...(pod?.status?.initContainerStatuses || []), ...(pod?.status?.containerStatuses || [])];
                    if (!pod || pod.status?.phase === 'Pending' || states.some(c => c.state?.waiting)) {
                        const resources = [job, pod].filter(r => r?.metadata?.uid);
                        const results = await Promise.all(resources.map(resource => k8sproxy.get(`/api/v1/namespaces/${this.namespaceActive}/events`, {
                            params: { fieldSelector: `involvedObject.uid=${resource.metadata.uid}` }, noAlert: true,
                        }).catch(() => null)));
                        update({ jobState: installJobStatus(job, pod, results.flatMap(r => r?.data?.items || [])) });
                    }
                    if (!pod) { update({ log: '' }); return; }
                    const containers = [...(pod.spec?.containers || []), ...(pod.spec?.initContainers || [])];
                    for (const container of containers) {
                        const state = states.find(c => c.name === container.name)?.state;
                        if (!state?.running && !state?.terminated) continue;
                        try {
                            const res = await k8sproxy.get(`/api/v1/namespaces/${this.namespaceActive}/pods/${pod.metadata.name}/log`, {
                                params: { container: container.name, tailLines: 50 }, noAlert: true,
                            });
                            const lines = String(res.data || '').split('\n').filter(line => line.trim());
                            update({ log: (lines[lines.length-1] || '').replace(/\u001b\[\d{1,3}(;1)?m/g, '') });
                            return;
                        } catch { /* 当前容器日志不可用时继续尝试其他容器。 */ }
                    }
                    update({ log: '' });
                } catch {
                    update({ jobState: { text: '状态获取失败', error: true, reason: '请点击任务查看详情，稍后自动重试' } });
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
        getStorage(selectedName){
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
                if(selectedName && !list.some(i=>i.name==selectedName)) list.unshift({name:selectedName});
                this.storages = list;

                if(this.form.forms?.length){
                    this.form.forms.forEach(i=>{
                        if(i.requirePvc){
                            i.pvcname = selectedName || this.storages?.find(i=>i.isDefault)?.name || this.storages?.[0]?.name;
                        }
                    })
                    this.syncModuleStartParams(false);
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
.form-label{display:inline-block;white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;line-height:1.5;max-width:160px;vertical-align:middle;}
.install-domain-hint :deep(.arco-alert){margin:0 0 20px;}
.install-resource-fields{width:100%;}
.install-resource-toggle{min-height:32px;}
.install-resource-hint{margin:4px 0 16px;color:var(--color-text-3);font-size:12px;line-height:20px;}
.install-resource-fields :deep(.arco-form-item){margin-bottom:12px;}
.install-resource-fields :deep(.arco-form-item:last-child){margin-bottom:0;}
</style>
<style>
.zpkinstalltabs .arco-tabs-tab-disabled{color:var(--color-text-2);}
.zpkinstalltabs .arco-tabs-tab-active.arco-tabs-tab-disabled{color:rgb(var(--primary-6));}
.super-mini-btn{height:20px; padding:0 4px;}
.super-mini-btn .arco-btn-icon{line-height:20px;}
</style>
