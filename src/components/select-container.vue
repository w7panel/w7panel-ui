<template>
    <div class="select-container-wrap">
        <a-select
            v-model="selectedGroup"
            placeholder="选择应用组"
            allow-search
            allow-clear
            :loading="groupLoading"
            style="width: 200px;"
            @change="onGroupChange"
        >
            <a-option v-for="item in groupList" :key="item.groupName" :value="item.groupName" :label="item.title" />
        </a-select>
        <a-select
            v-model="selectedApp"
            placeholder="选择应用"
            allow-search
            allow-clear
            :loading="appLoading"
            :disabled="!selectedGroup"
            style="width: 200px; margin-left: 10px;"
            @change="onAppChange"
        >
            <a-option v-for="item in appList" :key="item.key" :value="item.key" :label="item.title" />
        </a-select>
        <a-select
            v-model="selectedContainer"
            placeholder="选择容器"
            allow-search
            allow-clear
            :loading="containerLoading"
            :disabled="!selectedApp"
            style="width: 200px; margin-left: 10px;"
            @change="onContainerChange"
        >
            <a-option v-for="item in containerList" :key="item.name" :value="item.name" :label="item.name" />
        </a-select>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';

export default {
    data() {
        return {
            namespaceActive: '',
            groupList: [],
            appList: [],
            containerList: [],
            selectedGroup: '',
            selectedApp: '',
            selectedContainer: '',
            groupLoading: false,
            appLoading: false,
            containerLoading: false,
        }
    },
    created() {
        this.namespaceActive = useNamespaceStore().namespace;
        this.getGroupList();
    },
    methods: {
        getGroupList() {
            this.groupLoading = true;
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/' + this.namespaceActive + '/appgroups').then(res => {
                let list = res?.data?.items || [];
                this.groupList = list.filter(i => !i?.metadata?.labels?.['w7.cc/parent']).map(i => ({
                    title: i?.spec?.title || i.metadata.name,
                    groupName: i.metadata.name,
                }));
            }).catch(() => {
                this.groupList = [];
            }).finally(() => {
                this.groupLoading = false;
            });
        },
        onGroupChange(val) {
            this.selectedApp = '';
            this.selectedContainer = '';
            this.appList = [];
            this.containerList = [];

            this.$emit('change', {
                group: val || '',
                app: '',
                kind: '',
                container: '',
                containerObj: {},
            });

            if (!val) return;
            this.getAppList(val);
        },
        getAppList(groupName) {
            this.appLoading = true;
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/' + this.namespaceActive + '/appgroups/' + groupName, { noAlert: true }).then(async res => {
                let items = res?.data?.status?.items || [];
                this.appList = items.map(i => ({
                    key: (i.kind?.toLowerCase() + 's') + i.name,
                    name: i.name,
                    kind: i.kind?.toLowerCase() + 's',
                    title: i.title || i.name,
                }));
            }).catch(() => {
                this.appList = [];
            }).finally(() => {
                this.appLoading = false;
            });
        },
        onAppChange(val) {
            this.selectedContainer = '';
            this.containerList = [];
            let app = this.appList.find(i => i.key === val);

            this.$emit('change', {
                group: this.selectedGroup,
                app: app?.name || '',
                kind: app?.kind || '',
                container: '',
                containerObj: {},
            });

            if (!val) return;
            if (app) {
                this.getContainerList(app.kind, app.name);
            }
        },
        getContainerList(kind, name) {
            this.containerLoading = true;
            k8sproxy.get('/apis/apps/v1/namespaces/' + this.namespaceActive + '/' + kind + '/' + name, { noAlert: true }).then(res => {
                let spec = res?.data?.spec?.template?.spec || {};
                let containers = spec.containers || [];
                let initContainers = spec.initContainers || [];
                let podMatchLabels = res?.data?.spec?.selector?.matchLabels || {};
                let podLabels = res?.data?.spec?.template?.metadata?.labels || {};

                let volumes = spec?.volumes || [];
                let arr = [
                    ...containers,
                    ...initContainers,
                ];
                arr.podMatchLabels = podMatchLabels;
                arr.podLabels = podLabels;
                arr.volumes = volumes;
                this.containerList = arr;
            }).catch(() => {
                this.containerList = [];
            }).finally(() => {
                this.containerLoading = false;
            });
        },
        onContainerChange(val) {
            if (!val || !this.selectedApp) return;
            let app = this.appList.find(i => i.key === this.selectedApp);
            let containerObj = this.containerList.find(i => i.name === val);
            let obj = {
                group: this.selectedGroup,
                app: app?.name || '',
                kind: app?.kind || '',
                container: val,
                containerObj: containerObj || {},
                podMatchLabels: this.containerList?.podMatchLabels || '',
                podLabels: this.containerList?.podLabels || '',
                volumes: this.containerList?.volumes || '',
            }
            this.$emit('change', obj);
            this.$emit('complete', obj);
        },
    }
}
</script>

<style scoped>
.select-container-wrap {
    display: inline-flex;
    align-items: center;
}
</style>
