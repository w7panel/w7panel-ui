<template>
    <div class="app-direct-page bg-white">
        <a-tabs v-model:active-key="activeTab" hide-content class="app-direct-tabs">
            <a-tab-pane key="login" title="登录设置"></a-tab-pane>
            <a-tab-pane key="common" title="通用设置"></a-tab-pane>
        </a-tabs>

        <div v-if="activeTab === 'login'" class="app-direct-section">
            <a-form :model="loginForm" auto-label-width>
                <a-form-item label="登录方式">
                    <a-select v-model="loginForm.loginType" placeholder="请选择登录方式" style="width:300px;">
                        <a-option value="password" label="密码登录"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="注册开关">
                    <a-switch v-model="loginForm.registrationEnabled" />
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

        <div v-else class="app-direct-section">
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
                <a-form-item label="备案设置">
                    <a-button type="text" size="small" @click.stop="openIcpSetting">配置</a-button> 
                </a-form-item>
            </a-form>
        </div>

        <div class="app-direct-actions">
            <a-button type="primary" @click="submitSetting">保存设置</a-button>
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

        <a-drawer
            :width="720"
            :visible="icpDrawer.show"
            @ok="submitIcp"
            @cancel="icpDrawer.show=false"
            :popup-container="$popupContainer"
        >
            <template #title>备案设置</template>
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
        </a-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import richEditor from './rich-editor.vue';

export default {
    props: ['roles', 'info'],
    emits: ['open'],
    components: {
        richEditor,
    },
    data(){
        return {
            namespaceActive: 'default',
            settingData: null,
            protocolRefs: {
                user: null,
                privacy: null,
            },
            logoRef: null,
            configMapCache: {},
            activeTab: 'login',
            loginForm: {
                loginType: 'password',
                registrationEnabled: false,
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
    },
    methods: {
        getAppgroup(){
            return this.info?.appgroup || this.$route.params.group;
        },
        async initData(){
            const appgroup = this.getAppgroup();
            if(!appgroup){ return; }
            this.configMapCache = {};
            try{
                const res = await k8sproxy.get(
                    `/apis/w7panel.w7.com/v1alpha1/namespaces/${this.namespaceActive}/microappsettings/${appgroup}`,
                    { noAlert: true }
                );
                this.settingData = res?.data || null;
                this.applySetting(this.settingData);
                await this.loadReferencedConfigMaps();
            }catch(e){
                this.settingData = null;
            }
        },
        applySetting(data){
            const spec = data?.spec || {};
            const login = spec.login || {};
            const general = spec.general || {};

            this.loginForm = {
                ...this.loginForm,
                loginType: login.loginMode || 'password',
                registrationEnabled: !!login.registrationEnabled,
            };
            this.protocolRefs = {
                user: login.protocolConfig?.userAgreement || null,
                privacy: login.protocolConfig?.privacyPolicy || null,
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
                siteName: general.siteName || '',
                logo: '',
                siteDescription: general.siteDescription || '',
            };
            this.logoRef = general.siteLogo || null;
            this.icpDrawer.form = {
                ...this.icpDrawer.form,
                ...(general.filing || {}),
            };
        },
        async loadReferencedConfigMaps(){
            await Promise.all([
                this.loadProtocolContent('user'),
                this.loadProtocolContent('privacy'),
                this.loadLogoContent(),
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
        async loadProtocolContent(key){
            const ref = this.protocolRefs[key];
            if(!ref?.name || !ref?.key){ return; }
            try{
                const configMap = await this.getConfigMap(ref);
                this.protocols[key] = {
                    ...this.protocols[key],
                    content: configMap?.data?.[ref.key] || '',
                };
            }catch(e){}
        },
        async loadLogoContent(){
            const ref = this.logoRef;
            if(!ref?.name || !ref?.key){ return; }
            try{
                const configMap = await this.getConfigMap(ref);
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
        openIcpSetting(){
            this.icpDrawer.show = true;
        },
        submitIcp(){
            // TODO: 接入备案设置保存
            this.icpDrawer.show = false;
        },
        getSettingNamespace(){
            return this.settingData?.metadata?.namespace || this.namespaceActive;
        },
        getSharedConfigMapName(){
            const refs = [
                this.protocolRefs.user,
                this.protocolRefs.privacy,
                this.logoRef,
            ].filter(i=>i?.name);
            return refs?.[0]?.name || `${this.getAppgroup()}-settings`;
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
        buildConfigMap(name, namespace, existing){
            const data = {
                ...(existing?.data || {}),
                'user-agreement.html': this.protocols.user.content || '',
                'privacy-policy.html': this.protocols.privacy.content || '',
            };
            const binaryData = {
                ...(existing?.binaryData || {}),
            };
            const annotations = {
                ...(existing?.metadata?.annotations || {}),
            };
            const logoData = this.parseDataUrl(this.commonForm.logo);
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
        async upsertConfigMap(name, namespace){
            const existing = await this.getConfigMapForSave(name, namespace);
            const configMap = this.buildConfigMap(name, namespace, existing);
            if(existing){
                await k8sproxy.put(`/api/v1/namespaces/${namespace}/configmaps/${name}`, configMap, { loading: true });
            }else{
                await k8sproxy.post(`/api/v1/namespaces/${namespace}/configmaps`, configMap, { loading: true });
            }
            this.configMapCache[`${namespace}/${name}`] = Promise.resolve(configMap);
            return configMap;
        },
        buildSetting(configMapName, namespace){
            const appgroup = this.getAppgroup();
            return {
                apiVersion: 'w7panel.w7.com/v1alpha1',
                kind: 'MicroAppSetting',
                metadata: {
                    ...(this.settingData?.metadata || {}),
                    name: appgroup,
                    namespace,
                },
                spec: {
                    login: {
                        loginMode: this.loginForm.loginType || 'password',
                        registrationEnabled: !!this.loginForm.registrationEnabled,
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
                        siteName: this.commonForm.siteName || '',
                        siteLogo: {
                            name: configMapName,
                            key: 'logo.png',
                        },
                        siteDescription: this.commonForm.siteDescription || '',
                        filing: {
                            ...this.icpDrawer.form,
                        },
                    },
                },
            };
        },
        async upsertSetting(data, namespace){
            const appgroup = this.getAppgroup();
            if(this.settingData){
                await k8sproxy.put(`/apis/w7panel.w7.com/v1alpha1/namespaces/${namespace}/microappsettings/${appgroup}`, data, { loading: true });
            }else{
                await k8sproxy.post(`/apis/w7panel.w7.com/v1alpha1/namespaces/${namespace}/microappsettings`, data, { loading: true });
            }
        },
        async submitSetting(){
            const appgroup = this.getAppgroup();
            if(!appgroup){ return; }
            const namespace = this.getSettingNamespace();
            const configMapName = this.getSharedConfigMapName();
            try{
                await this.upsertConfigMap(configMapName, namespace);
                const setting = this.buildSetting(configMapName, namespace);
                await this.upsertSetting(setting, namespace);
                this.$message.success('操作成功');
                await this.initData();
            }catch(e){}
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
