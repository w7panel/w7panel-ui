<template>
    <div>
        <div class="mb-20">
            <a-button type="primary" @click="openDrawer()">新建</a-button>
        </div>
        <a-table :data="list" :pagination="false" :bordered="false">
            <template #columns>
                <a-table-column title="编号" width="100">
                    <template #cell="{ record,rowIndex }">
                        <a-input-number
                            v-model="record.index"
                            :min="1"
                            :max="999"
                            style="width:80px;"
                            @change="updateIndex(record)"
                        />
                    </template>
                </a-table-column>
                <a-table-column title="类型">
                    <template #cell="{ record }">{{{link:'链接',qrcode:'二维码',text:'文字'}[record.type]}}</template>
                </a-table-column>
                <a-table-column title="内容">
                    <template #cell="{ record }">
                        <div v-if="record.type=='link'">{{ record.link }}</div>
                        <div v-if="record.type=='text'">{{ record.text }}</div>
                        <img v-if="record.type=='qrcode'" :src="record.qrcode" style="width:100px;height:100px;border-radius:4px;" />
                    </template>
                </a-table-column>
                <a-table-column title="图标">
                    <template #cell="{ record }">
                        <div v-if="!record.customIcon">
                            <component :is="record.icon" style="font-size:32px;" class="c-66"></component>
                        </div>
                        <img v-else :src="record.icon" alt="" style="width:32px;height:32px;border-radius:4px;" />
                    </template>
                </a-table-column>
                <a-table-column title="名称">
                    <template #cell="{ record }">{{ record.name }}</template>
                </a-table-column>
                <a-table-column title="样式">
                    <template #cell="{ record }">
                        <div class="df df-ww style-select">
                            <template v-for="(item,index) in styles" :key="index">
                                <div v-if="Number(record.style)==index" :class="`item item${index}`">
                                    <div>{{ item.txt }}</div>
                                </div>
                            </template>
                        </div>
                    </template>
                </a-table-column>
                <a-table-column title="操作">
                    <template #cell="{ record,rowIndex }">
                        <span class="c-blue cursor mr-10" @click="openDrawer(record)">修改</span>
                        <a-popconfirm :content="'确认要删除吗'" @ok="del(record)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <span :id="'contactus-remove-'+rowIndex" class="c-blue cursor operation">删除</span>
                        </a-popconfirm>
                    </template>
                </a-table-column>
            </template>
        </a-table>
        <a-drawer :width="800" title="联系方式" :visible="form.show" @cancel="form.show=false;" @ok="submit">
            <a-form ref="form" :model="form" auto-label-width :rules="rules">
                <a-form-item label="类型">
                    <a-select v-model="form.type" placeholder="请选择">
                        <a-option label="链接" value="link"></a-option>
                        <a-option label="二维码" value="qrcode"></a-option>
                        <a-option label="文字" value="text"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item v-if="form.type=='link'" label="链接" field="link">
                    <a-input v-model="form.link" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item v-if="form.type=='qrcode'" label="二维码" field="qrcode">
                    <div class="upload">
                        <img v-if="form.qrcode" :src="form.qrcode" alt="二维码" class="img" />
                        <a-button v-else >上传二维码</a-button>
                        <input id="uploadfileinput" type="file" accept="image/*" @change="e=>selectImg(e,v=>form.qrcode=v)" />
                    </div>
                </a-form-item>
                <a-form-item v-if="form.type=='text'" label="联系方式" field="text">
                    <a-input v-model="form.text" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="图标">
                    <component v-if="!form.icon" :is="form.selicon" @click="selIconDialog=true;" class="c-66 mr-20" style="font-size:32px;"></component>
                    <div class="upload">
                        <img v-if="form.icon" :src="form.icon" alt="图标" class="icon" />
                        <a-button v-else >上传图标</a-button>
                        <span v-if="form.icon" class="close df ai-c jc-c cursor c-ff fs-14 b" @click.stop="form.icon=''">&times;</span>
                        <input id="uploadiconinput" type="file" accept="image/*" @change="e=>selectImg(e,v=>form.icon=v)" />
                    </div>
                </a-form-item>
                <a-form-item label="名称">
                    <a-input v-model="form.name" placeholder="请输入" style="flex:1;"></a-input>
                    <a-checkbox v-model="form.showName" style="margin-left:20px; flex-shrink:0;">显示名称</a-checkbox>
                </a-form-item>
                <a-form-item label="样式">
                    <div class="df df-ww style-select">
                        <div
                            v-for="(item,index) in styles"
                            :key="index"
                            :class="`item item${index} ${form.styleIndex==index?'active':''}`"
                            @click="form.styleIndex=index"
                        >
                            <div>{{ item.txt }}</div>
                        </div>
                    </div>
                </a-form-item>
            </a-form>
        </a-drawer>
        <a-modal title="选择图标" :width="460" :visible="selIconDialog" @cancel="selIconDialog=false;" :footer="false">
            <div class="df ai-c jc-c">
                <sel-svg @submit="v=>{form.selicon=v;selIconDialog=false}"></sel-svg>
            </div>
        </a-modal>
    </div>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import SelSvg from './sel-svg.vue';

export default{
    data(){
        return {
            list: [],
            styles: [{
                txt: '浅灰色',
            },{
                txt: '深蓝色',
            },{
                txt: '淡紫色',
            },{
                txt: '灰蓝色',
            },{
                txt: '橙红色',
            },{
                txt: '深绿色',
            },{
                txt: '青蓝色',
            },],
            namespaceActive: 'default',
            form: {
                show: false,
                configmapName: '',
                type: 'link',
                link: '',
                text: '',
                qrcode: '',
                name: '',
                showName: false,
                selicon: 'icon-customer-service',
                icon: '',
                styleIndex: 0,
                file: null,
                index: 1,
            },
            rules: {
                link: [{ required: true, message: '请输入名称', trigger: 'blur' }],
                qrcode: [{ required: true, message: '请输入名称', trigger: 'blur' }],
                text: [{ required: true, message: '请输入名称', trigger: 'blur' }],
            },
            selIconDialog: false,
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
    },
    components: {
        SelSvg,
    },
    methods: {
        openDrawer(row){
            if(!row){
                this.form = {
                    ...this.form,
                    configmapName: '',
                    show: true,
                    type: 'link',
                    link: '',
                    text: '',
                    qrcode: '',
                    name: '',
                    showName: false,
                    selicon: 'icon-customer-service',
                    icon: '',
                    styleIndex: 0,
                    file: null,
                }
            }else{
                this.form = {
                    ...this.form,
                    configmapName: row.configmapName,
                    show: true,
                    type: row.type,
                    link: row.link || '',
                    text: row.text || '',
                    qrcode: row.qrcode || '',
                    name: row.name || '',
                    showName: row.showName,
                    selicon: row.customIcon? 'icon-customer-service' : row.icon,
                    icon: row.customIcon? row.icon : '',
                    styleIndex: Number(row.style),
                    index: row.index || 1,
                    file: null,
                }
            }
        },
        getList(){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps?labelSelector=type=contactus").then(res=>{
                let list = res?.data?.items || [];
                this.list = list.map(i=>{
                    return {
                        type: i.data.type,
                        name: i.data.name,
                        showName: i.data.showName == 'true',
                        configmapName: i.metadata.name,
                        text: i.data.text,
                        link: i.data.link,
                        customIcon: Boolean(i.binaryData.icon),
                        icon: i.binaryData.icon? i.data.iconHeader + i.binaryData.icon : i.data.selicon,
                        qrcode: i.data.qrcodeHeader + i.binaryData.qrcode,
                        style: i.data.style,
                        index: Number(i.data.index) || 1,
                    }
                })
            })
        },
        del(row){
            k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+row.configmapName).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            })
        },
        selectImg(event,callback){
            let files = event.target.files;
            if(!files?.[0]){return}
            this.form.file = files[0];
            
            const reader = new FileReader();
            reader.onload = ()=>{
                let value = reader.result;
                callback?.(value)
            };
            reader.readAsDataURL(this.form.file);
        },
        submit(){
            this.$refs.form.validate(err=>{
                if (err) { this.$refs.form.scrollToField(Object.keys(err)[0]); return; }

                // 创建configmap
                let data = {
                    apiVersion: 'v1',
                    kind: 'ConfigMap',
                    metadata: {
                        name: this.form.configmapName || 'contact-us-' + this.createName(),
                        labels: {
                            type: 'contactus',
                        },
                    },
                    data: {
                        link: this.form.link,
                        text: this.form.text,
                        type: this.form.type,
                        selicon: this.form.selicon,
                        name: this.form.name,
                        showName: this.form.showName? 'true' : 'false',
                        style: String(this.form.styleIndex),
                        index: String(this.form.index || 1),
                        qrcodeHeader: this.form.qrcode?.match?.(/^.*base64,/)?.[0] || '',
                        iconHeader: this.form.icon?.match?.(/^.*base64,/)?.[0] || '',
                    },
                    binaryData: {
                        qrcode: this.form.type=='qrcode'? (this.form.qrcode?.replace?.(/^.*base64,/,'') || '') : '',
                        icon: this.form.icon?.replace?.(/^.*base64,/,'') || '',
                    },
                }
                const callback = ()=>{
                    this.$message.success("操作成功");
                    this.form.show = false;
                    this.getList();
                }
                if(this.form.configmapName){
                    k8sproxy.put("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+this.form.configmapName,data).then(callback)
                }else{
                    k8sproxy.post("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps",data).then(callback)
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
        updateIndex(row){
            // 使用 patch 请求直接更新 index 字段
            k8sproxy.patch(
                "/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+row.configmapName,
                {
                    data: {
                        index: String(row.index || 1)
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/strategic-merge-patch+json'
                    }
                }
            ).then(()=>{
                this.$message.success('排序更新成功');
            }).catch(err=>{
                console.error(err);
                this.$message.error('排序更新失败');
            })
        },
    }
}
</script>
<style scoped>

.upload{position:relative;}
.upload .close{position:absolute; width:20px; height:20px; line-height:20px; top:-10px; right:-10px; border-radius:50%; background-color:rgb(var(--red-6));}
.upload .img{width:120px; height:120px; display:block; border:1px solid var(--color-neutral-3); border-radius:4px;}
.upload .icon{width:32px; height:32px; display:block; border:1px solid var(--color-neutral-3); border-radius:4px;}
.upload input[type='file']{min-width:0; position:absolute; top:0; left:0; right:0; bottom:0; z-index:1; opacity:0; cursor:pointer;}

.style-select{width:100%; gap:8px;}
.style-select .item{width:120px; border:2px solid #fff; padding:2px; cursor:pointer; height:40px; border-radius:6px;}
.style-select .item.active{border-color:rgb(var(--primary-6));}
.style-select .item div{height:100%; width:100%; display:flex; align-items:center; justify-content:center; border-radius:4px;}
.style-select .item.item0 div{
    background: linear-gradient(0deg, #ffffff 0%, #f3f5f8 100%);
    color: rgb(var(--primary-6));
}
.style-select .item.item1 div{
    background: linear-gradient(180deg, #0E42D2 0%, #4080FF 100%);
    color: #FFF;
}
.style-select .item.item2 div{
    background: linear-gradient(180deg, #5A4BFF 0%, #BC8CF2 100%);
    color: #FFF;
}
.style-select .item.item3 div{
    background: linear-gradient(180deg, #2D3748 0%, #64748B 100%);
    color: #FFF;
}
.style-select .item.item4 div{
    background: linear-gradient(180deg, #ff3b3b 0%, #ffa45a 100%);
    color: #FFF;
}
.style-select .item.item5 div{
    background: linear-gradient(180deg, #2F5233 0%, #8BC34A 100%);
    color: #FFF;
}
.style-select .item.item6 div{
    background: linear-gradient(180deg, #0E7490 0%, #5EEAD4 100%);
    color: #FFF;
}
</style>