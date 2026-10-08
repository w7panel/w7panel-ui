<template>
    <div class="app-direct-page bg-white">
        <a-tabs v-model:active-key="activeTab" hide-content class="app-direct-tabs">
            <a-tab-pane key="login" title="登录设置"></a-tab-pane>
            <a-tab-pane key="common" title="通用设置"></a-tab-pane>
            <a-tab-pane key="filing" title="备案设置"></a-tab-pane>
            <a-tab-pane v-if="showContact" key="contact" title="联系方式"></a-tab-pane>
        </a-tabs>

        <div v-if="activeTab === 'login'" class="app-direct-section">
            <a-form :model="loginForm" auto-label-width>
                <a-form-item label="注册开关">
                    <a-switch v-model="loginForm.registrationEnabled" />
                </a-form-item>
                <a-form-item v-if="showHomepage" label="首页配置">
                    <a-radio-group v-model="loginForm.indexPage">
                        <a-radio value="login">登录页</a-radio>
                        <a-radio value="resource">云资源聚合页</a-radio>
                    </a-radio-group>
                </a-form-item>
                <a-form-item label="协议配置">
                    <div class="df df-c" >
                        <div class="df ai-c ">
                            <span>用户注册协议</span>
                            <a-button class="ml-20" type="text" size="small" @click.stop="openUserAgreement">配置</a-button>
                        </div>
                        <div class="df ai-c mt-6">
                            <span>隐私协议配置</span>
                            <a-button class="ml-20" type="text" size="small" @click.stop="openPrivacyPolicy">配置</a-button>
                        </div>
                    </div>
                </a-form-item>
            </a-form>
        </div>

        <div v-else-if="activeTab === 'common'" class="app-direct-section">
            <a-form :model="commonForm" auto-label-width>
                <a-form-item label="站点名称">
                    <a-input v-model="commonForm.siteName" :spellcheck="false" placeholder="请输入站点名称" style="width:420px;" />
                </a-form-item>
                <a-form-item label="站点LOGO">
                    <div class="logo-preview">
                        <img v-if="commonForm.logo" :src="commonForm.logo" alt="logo" />
                        <div v-else class="logo-placeholder">上传LOGO</div>
                        <input type="file" accept="image/*" @change="handleLogoChange" />
                    </div>
                </a-form-item>
                <a-form-item label="站点描述">
                    <a-input
                        v-model="commonForm.siteDescription"
                        :spellcheck="false"
                        placeholder="请输入登录页标语"
                        style="width:520px;"
                    />
                </a-form-item>
            </a-form>
        </div>

        <div v-else-if="activeTab === 'filing'" class="app-direct-section">
            <a-form :model="icpDrawer.form" auto-label-width>
                <a-form-item label="ICP备案号">
                    <a-input v-model="icpDrawer.form.icp" :spellcheck="false" placeholder="请输入ICP备案号" />
                </a-form-item>
                <a-form-item label="公安联网备案号">
                    <a-input v-model="icpDrawer.form.publicSecurityNetworkFiling" :spellcheck="false" placeholder="请输入公安联网备案号" />
                </a-form-item>
                <a-form-item label="电子营业执照信息">
                    <a-input v-model="icpDrawer.form.electronicBusinessLicense" :spellcheck="false" placeholder="请输入电子营业执照信息" />
                </a-form-item>
                <a-form-item label="增值电信业务经营许可证">
                    <a-input v-model="icpDrawer.form.valueAddedTelecomBusinessLicense" :spellcheck="false" placeholder="请输入增值电信业务经营许可证" />
                </a-form-item>
            </a-form>
        </div>

        <div v-else-if="activeTab === 'contact' && showContact" class="app-direct-contact-section">
            <contact-us v-model="contactList" embedded @change="submitSetting" />
        </div>

        <div class="app-direct-actions">
            <a-button
                type="primary"
                :loading="saveInProgress"
                :disabled="!canSubmitSetting"
                @click="submitSetting"
            >保存设置</a-button>
        </div>

        <a-drawer
            :width="920"
            :visible="protocolDrawer.show"
            @ok="submitProtocol"
            @cancel="protocolDrawer.show=false"
            class="protocol-drawer"
            unmount-on-close
            :popup-container="$popupContainer"
        >
            <template #title>{{ protocolDrawer.title }}</template>
            <rich-editor
                v-if="protocolDrawer.show"
                v-model="protocolDrawer.form.content"
                placeholder="请输入协议内容"
                class="protocol-rich-editor"
            />
        </a-drawer>

    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import { isCurrentAppGroupRequest } from '@/utils/w7panel-resource';
import richEditor from './rich-editor.vue';
import ContactUs from '@/views/system/system/contact-us.vue';

export default {
    props: {
        roles: Array,
        info: Object,
        settingName: String,
        fallbackSettingName: {
            type: String,
            default: 'default',
        },
        globalMode: {
            type: Boolean,
            default: false,
        },
        showContact: {
            type: Boolean,
            default: false,
        },
        showHomepage: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['open'],
    components: {
        richEditor,
        ContactUs,
    },
    data(){
        return {
            namespaceActive: 'default',
            settingData: null,
            globalSettingData: null,
            protocolRefs: {
                user: null,
                privacy: null,
            },
            logoRef: null,
            configMapCache: {},
            initRequestId: 0,
            saveRequestId: 0,
            loadedAppgroup: '',
            settingsLoading: false,
            saveInProgress: false,
            activeTab: 'login',
            loginForm: {
                loginType: 'password',
                registrationEnabled: false,
                indexPage: 'login',
            },
            commonForm: {
                siteName: '',
                logo: '',
                siteDescription: '',
            },
            protocols: {
                user: {
                    title: '用户注册协议',
                    content: '',
                },
                privacy: {
                    title: '隐私协议配置',
                    content: '',
                },
            },
            protocolDrawer: {
                show: false,
                key: '',
                title: '',
                form: {
                    content: '',
                },
            },
            icpDrawer: {
                show: false,
                form: {
                    icp: '',
                    publicSecurityNetworkFiling: '',
                    electronicBusinessLicense: '',
                    valueAddedTelecomBusinessLicense: '',
                },
            },
            contactList: [],
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.initData();
    },
    watch: {
        'info.appgroup'(){
            this.initData();
        },
        settingName(){
            this.initData();
        },
    },
    beforeUnmount(){
        this.initRequestId += 1;
        this.saveRequestId += 1;
    },
    computed: {
        canSubmitSetting(){
            const appgroup = this.getAppgroup();
            return Boolean(
                appgroup
                && !this.settingsLoading
                && !this.saveInProgress
                && this.loadedAppgroup === appgroup
            );
        },
    },
    methods: {
        getAppgroup(){
            const resolved = this.settingName || this.info?.appgroup;
            if(resolved || this.$route.name === 'topapp-direct'){
                return resolved || '';
            }
            return this.$route.params.group;
        },
        async initData(){
            const requestId = ++this.initRequestId;
            const appgroup = this.getAppgroup();
            if(this.loadedAppgroup && this.loadedAppgroup !== appgroup){
                this.saveRequestId += 1;
                this.saveInProgress = false;
            }
            this.loadedAppgroup = '';
            this.settingsLoading = Boolean(appgroup);
            this.configMapCache = {};
            this.settingData = null;
            this.globalSettingData = null;
            this.applySetting(null, null);
            if(!appgroup){ return; }
            try{
                const requests = [
                    k8sproxy.get(
                        `/apis/w7panel.w7.com/v1alpha1/namespaces/${this.namespaceActive}/microappsettings/${appgroup}`,
                        { noAlert: true }
                    ).catch(()=>null),
                ];
                if(!this.globalMode && this.fallbackSettingName && this.fallbackSettingName !== appgroup){
                    requests.push(k8sproxy.get(
                        `/apis/w7panel.w7.com/v1alpha1/namespaces/${this.namespaceActive}/microappsettings/${this.fallbackSettingName}`,
                        { noAlert: true }
                    ).catch(()=>null));
                }
                const [res, globalRes] = await Promise.all(requests);
                if(!this.isCurrentInitRequest(requestId, appgroup)){ return; }
                this.settingData = res?.data || null;
                this.globalSettingData = globalRes?.data || null;
                this.applySetting(this.settingData, this.globalSettingData);
                await this.loadReferencedConfigMaps(requestId, appgroup);
                if(!this.isCurrentInitRequest(requestId, appgroup)){ return; }
                this.loadedAppgroup = appgroup;
            }catch(e){
                if(!this.isCurrentInitRequest(requestId, appgroup)){ return; }
                this.settingData = null;
                this.globalSettingData = null;
                this.applySetting(null, null);
                this.loadedAppgroup = appgroup;
            }finally{
                if(this.isCurrentInitRequest(requestId, appgroup)){
                    this.settingsLoading = false;
                }
            }
        },
        isCurrentInitRequest(requestId, appgroup){
            return isCurrentAppGroupRequest(
                requestId,
                this.initRequestId,
                appgroup,
                this.getAppgroup(),
            );
        },
        applySetting(data, fallbackData){
            const spec = data?.spec || {};
            const fallbackSpec = fallbackData?.spec || {};
            const login = spec.login || {};
            const fallbackLogin = fallbackSpec.login || {};
            const general = spec.general || {};
            const fallbackGeneral = fallbackSpec.general || {};
            const protocolConfig = login.protocolConfig || {};
            const fallbackProtocolConfig = fallbackLogin.protocolConfig || {};

            this.loginForm = {
                ...this.loginForm,
                loginType: login.loginMode || fallbackLogin.loginMode || 'password',
                registrationEnabled: data ? !!login.registrationEnabled : !!fallbackLogin.registrationEnabled,
                indexPage: this.showHomepage ? (login.indexPage || fallbackLogin.indexPage || 'login') : 'login',
            };
            this.protocolRefs = {
                user: protocolConfig.userAgreement || fallbackProtocolConfig.userAgreement || null,
                privacy: protocolConfig.privacyPolicy || fallbackProtocolConfig.privacyPolicy || null,
            };
            this.protocols = {
                user: {
                    ...this.protocols.user,
                    content: '',
                },
                privacy: {
                    ...this.protocols.privacy,
                    content: '',
                },
            };

            this.commonForm = {
                ...this.commonForm,
                siteName: general.siteName || fallbackGeneral.siteName || '',
                logo: '',
                siteDescription: general.siteDescription || fallbackGeneral.siteDescription || '',
            };
            this.logoRef = general.siteLogo || fallbackGeneral.siteLogo || null;
            this.icpDrawer.form = {
                icp: '',
                publicSecurityNetworkFiling: '',
                electronicBusinessLicense: '',
                valueAddedTelecomBusinessLicense: '',
                ...(fallbackGeneral.filing || {}),
                ...(general.filing || {}),
            };
            this.contactList = JSON.parse(JSON.stringify(general.contactConfigs || fallbackGeneral.contactConfigs || []));
        },
        async loadReferencedConfigMaps(requestId, appgroup){
            await Promise.all([
                this.loadProtocolContent('user', requestId, appgroup),
                this.loadProtocolContent('privacy', requestId, appgroup),
                this.loadLogoContent(requestId, appgroup),
            ]);
        },
        async getConfigMap(ref){
            if(!ref?.name){ return null; }
            const namespace = ref.namespace || this.settingData?.metadata?.namespace || this.namespaceActive;
            const cacheKey = `${namespace}/${ref.name}`;
            if(!this.configMapCache[cacheKey]){
                this.configMapCache[cacheKey] = k8sproxy.get(
                    `/api/v1/namespaces/${namespace}/configmaps/${ref.name}`,
                    { noAlert: true }
                ).then(res=>res?.data || null).catch(e=>{
                    delete this.configMapCache[cacheKey];
                    throw e;
                });
            }
            return this.configMapCache[cacheKey];
        },
        async getConfigMapForSave(name, namespace){
            try{
                return await this.getConfigMap({ name, namespace });
            }catch(e){
                return null;
            }
        },
        async loadProtocolContent(key, requestId, appgroup){
            const ref = this.protocolRefs[key];
            if(!ref?.name || !ref?.key){ return; }
            try{
                const configMap = await this.getConfigMap(ref);
                if(!this.isCurrentInitRequest(requestId, appgroup)){ return; }
                this.protocols[key] = {
                    ...this.protocols[key],
                    content: configMap?.data?.[ref.key] || '',
                };
            }catch(e){}
        },
        async loadLogoContent(requestId, appgroup){
            const ref = this.logoRef;
            if(!ref?.name || !ref?.key){ return; }
            try{
                const configMap = await this.getConfigMap(ref);
                if(!this.isCurrentInitRequest(requestId, appgroup)){ return; }
                const content = configMap?.data?.[ref.key];
                const binaryContent = configMap?.binaryData?.[ref.key];
                if(binaryContent){
                    this.commonForm.logo = (configMap?.metadata?.annotations?.['w7.cc/logo-imagetype'] || `data:${this.getMimeType(ref.key)};base64,`) + binaryContent;
                }else if(content){
                    this.commonForm.logo = this.normalizeLogoContent(content, ref.key);
                }
            }catch(e){}
        },
        getMimeType(key = ''){
            const ext = String(key).split('.').pop()?.toLowerCase();
            return {
                png: 'image/png',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                gif: 'image/gif',
                webp: 'image/webp',
                svg: 'image/svg+xml',
            }[ext] || 'image/png';
        },
        normalizeLogoContent(content, key){
            if(/^data:/.test(content) || /^https?:\/\//.test(content) || content.startsWith('/')){
                return content;
            }
            if(String(key).toLowerCase().endsWith('.svg') || /^\s*<svg[\s>]/.test(content)){
                return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;
            }
            return `data:${this.getMimeType(key)};base64,${content}`;
        },
        openUserAgreement(){
            this.openProtocol('user');
        },
        openPrivacyPolicy(){
            this.openProtocol('privacy');
        },
        openProtocol(key){
            const protocol = this.protocols[key];
            if(!protocol){ return; }
            this.protocolDrawer = {
                show: true,
                key,
                title: protocol.title,
                form: {
                    content: protocol.content,
                },
            };
        },
        submitProtocol(){
            if(this.protocolDrawer.key){
                this.protocols[this.protocolDrawer.key] = {
                    ...this.protocols[this.protocolDrawer.key],
                    ...this.protocolDrawer.form,
                };
            }
            this.protocolDrawer.show = false;
        },
        handleLogoChange(event){
            const file = event.target.files?.[0];
            if(!file){ return; }
            const reader = new FileReader();
            reader.onload = ()=>{
                this.commonForm.logo = reader.result;
                this.uploadLogo(file);
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        },
        uploadLogo(file){
            // TODO: 接入站点 LOGO 上传
        },
        createSettingSnapshot(){
            return JSON.parse(JSON.stringify({
                settingData: this.settingData,
                protocolRefs: this.protocolRefs,
                logoRef: this.logoRef,
                loginForm: this.loginForm,
                commonForm: this.commonForm,
                protocols: this.protocols,
                filing: this.icpDrawer.form,
                contactList: this.contactList,
                globalMode: this.globalMode,
                showHomepage: this.showHomepage,
            }));
        },
        getSettingNamespace(settingData = this.settingData){
            return settingData?.metadata?.namespace || this.namespaceActive;
        },
        getSharedConfigMapName(appgroup = this.getAppgroup(), snapshot = null){
            if(snapshot?.globalMode ?? this.globalMode){
                return 'default-settings';
            }
            const protocolRefs = snapshot?.protocolRefs || this.protocolRefs;
            const refs = [
                protocolRefs.user,
                protocolRefs.privacy,
                snapshot ? snapshot.logoRef : this.logoRef,
            ].filter(i=>i?.name);
            return refs?.[0]?.name || `${appgroup}-settings`;
        },
        parseDataUrl(value){
            const match = String(value || '').match(/^data:([^,]+),(.*)$/);
            if(!match){ return null; }
            const meta = match[1] || '';
            const body = match[2] || '';
            const mimeType = meta.split(';')[0] || 'image/png';
            const isBase64 = meta.includes(';base64');
            return {
                mimeType,
                base64: isBase64 ? body : btoa(unescape(encodeURIComponent(decodeURIComponent(body)))),
                prefix: `data:${meta},`,
            };
        },
        buildConfigMap(name, namespace, existing, snapshot = null){
            const protocols = snapshot?.protocols || this.protocols;
            const commonForm = snapshot?.commonForm || this.commonForm;
            const data = {
                ...(existing?.data || {}),
                'user-agreement.html': protocols.user.content || '',
                'privacy-policy.html': protocols.privacy.content || '',
            };
            const binaryData = {
                ...(existing?.binaryData || {}),
            };
            const annotations = {
                ...(existing?.metadata?.annotations || {}),
            };
            const logoData = this.parseDataUrl(commonForm.logo);
            if(logoData){
                binaryData['logo.png'] = logoData.base64;
                annotations['w7.cc/logo-imagetype'] = logoData.prefix;
            }

            const configMap = {
                apiVersion: 'v1',
                kind: 'ConfigMap',
                metadata: {
                    ...(existing?.metadata || {}),
                    name,
                    namespace,
                    labels: {
                        ...(existing?.metadata?.labels || {}),
                        'w7.cc/noauth': 'true',
                    },
                    annotations,
                },
                data,
            };
            if(Object.keys(binaryData).length){
                configMap.binaryData = binaryData;
            }
            return configMap;
        },
        async upsertConfigMap(name, namespace, snapshot, requestId, appgroup){
            const existing = await this.getConfigMapForSave(name, namespace);
            if(!this.isCurrentInitRequest(requestId, appgroup)){ return false; }
            const configMap = this.buildConfigMap(name, namespace, existing, snapshot);
            if(existing){
                await k8sproxy.put(`/api/v1/namespaces/${namespace}/configmaps/${name}`, configMap, { loading: true });
            }else{
                await k8sproxy.post(`/api/v1/namespaces/${namespace}/configmaps`, configMap, { loading: true });
            }
            if(this.isCurrentInitRequest(requestId, appgroup)){
                this.configMapCache[`${namespace}/${name}`] = Promise.resolve(configMap);
            }
            return true;
        },
        buildSetting(configMapName, namespace, appgroup = this.getAppgroup(), snapshot = null){
            const settingData = snapshot ? snapshot.settingData : this.settingData;
            const loginForm = snapshot?.loginForm || this.loginForm;
            const commonForm = snapshot?.commonForm || this.commonForm;
            const filing = snapshot?.filing || this.icpDrawer.form;
            const contactList = snapshot?.contactList || this.contactList;
            const showHomepage = snapshot?.showHomepage ?? this.showHomepage;
            return {
                apiVersion: 'w7panel.w7.com/v1alpha1',
                kind: 'MicroAppSetting',
                metadata: {
                    ...(settingData?.metadata || {}),
                    name: appgroup,
                    namespace,
                },
                spec: {
                    login: {
                        loginMode: loginForm.loginType || 'password',
                        registrationEnabled: !!loginForm.registrationEnabled,
                        indexPage: showHomepage ? (loginForm.indexPage || 'login') : 'login',
                        protocolConfig: {
                            userAgreement: {
                                name: configMapName,
                                key: 'user-agreement.html',
                            },
                            privacyPolicy: {
                                name: configMapName,
                                key: 'privacy-policy.html',
                            },
                        },
                    },
                    general: {
                        siteName: commonForm.siteName || '',
                        siteLogo: {
                            name: configMapName,
                            key: 'logo.png',
                        },
                        siteDescription: commonForm.siteDescription || '',
                        filing: {
                            ...filing,
                        },
                        contactConfigs: JSON.parse(JSON.stringify(contactList || [])),
                    },
                },
            };
        },
        async upsertSetting(data, namespace, appgroup, hasSetting){
            if(hasSetting){
                await k8sproxy.put(`/apis/w7panel.w7.com/v1alpha1/namespaces/${namespace}/microappsettings/${appgroup}`, data, { loading: true });
            }else{
                await k8sproxy.post(`/apis/w7panel.w7.com/v1alpha1/namespaces/${namespace}/microappsettings`, data, { loading: true });
            }
        },
        async submitSetting(){
            const appgroup = this.getAppgroup();
            if(!this.canSubmitSetting || this.loadedAppgroup !== appgroup){ return; }
            const requestId = this.initRequestId;
            const saveRequestId = ++this.saveRequestId;
            const snapshot = this.createSettingSnapshot();
            const hasSetting = Boolean(snapshot.settingData);
            const namespace = this.getSettingNamespace(snapshot.settingData);
            const configMapName = this.getSharedConfigMapName(appgroup, snapshot);
            this.saveInProgress = true;
            try{
                const configMapSaved = await this.upsertConfigMap(
                    configMapName,
                    namespace,
                    snapshot,
                    requestId,
                    appgroup,
                );
                if(!configMapSaved || !this.isCurrentInitRequest(requestId, appgroup)){ return; }
                const setting = this.buildSetting(configMapName, namespace, appgroup, snapshot);
                await this.upsertSetting(setting, namespace, appgroup, hasSetting);
                if(
                    saveRequestId === this.saveRequestId
                    && this.isCurrentInitRequest(requestId, appgroup)
                ){
                    this.$message.success('操作成功');
                    await this.initData();
                }
            }catch(e){}finally{
                if(saveRequestId === this.saveRequestId){
                    this.saveInProgress = false;
                }
            }
        },
    },
}
</script>

<style scoped>
.app-direct-page{
    min-height:100%;
    padding:20px 24px;
    box-sizing:border-box;
}
.app-direct-tabs{
    margin-bottom:20px;
}
.app-direct-section{
    max-width:760px;
}
.app-direct-contact-section{
    max-width:1120px;
}
.app-direct-actions{
    margin-top:24px;
    padding-left:86px;
}
.logo-preview{
    position:relative;
    display:flex;
    align-items:center;
    justify-content:center;
    width:96px;
    height:96px;
    border:1px solid var(--color-border-2);
    border-radius:6px;
    background:var(--color-fill-1);
    color:var(--color-text-3);
    overflow:hidden;
    cursor:pointer;
    transition:border-color .15s ease, background .15s ease;
}
.logo-preview:hover{
    border-color:rgb(var(--primary-6));
    background:var(--color-fill-2);
}
.logo-preview img{
    max-width:100%;
    max-height:100%;
    object-fit:contain;
}
.logo-preview input{
    position:absolute;
    inset:0;
    z-index:1;
    opacity:0;
    cursor:pointer;
}
.logo-placeholder{
    font-size:13px;
    color:var(--color-text-3);
    user-select:none;
}
.protocol-rich-editor{
    height:100%;
}
:deep(.protocol-drawer .arco-drawer-body){
    height:calc(100vh - 109px);
}
</style>
