<template>
    <div>
        <a-tabs v-if="showif" v-model:active-key="activeIndex" type="card-gutter" class="a-form-container-tabs" :editable="true" @add="handleAdd" @delete="v=>deleteTab(v)" show-add-button auto-switch>
            <a-tab-pane v-for="(form, index) of fl" :key="form.keyid" :title="form.name" :closable="index!==0" style="padding:10px 16px 10px;">
                <template #title>
                    <span v-if="form.isInitContainers" class="c-red">
                        <icon-swap />
                        <span class="ml-4">{{ form.name }}（init）</span>
                    </span>
                    <span v-else>{{ form.name }}</span>
                </template>
                
                <a-form-item
                    label="容器名称"
                    field="customName"
                    :help="testName(form.customName)?'':'最长63个字符，只能包含小写字母、数字及分隔符(-)，且不能以分隔符开头或结尾'"
                    :validate-status="testName(form.customName)?'':'error'"
                >
                    <a-input v-model="form.customName" placeholder='最长63个字符，只能包含小写字母、数字及分隔符(-)，且不能以分隔符开头或结尾' @change="form.name = (testName(form.customName)?form.customName:form.name)"></a-input>
                </a-form-item>

                <a-form-item label="CPU/内存限制">
                    <a-space direction="vertical" style="padding:20px;width:500px;background:var(--color-neutral-1);" fill :size="0">
                        <a-form-item label="CPU内核" :label-col-style="subItemStyle">
                            <a-input type="number" v-model="form.cpu" @blur="testLimitCpuMemory(form)" @change="testLimitCpuMemory(form)" size="large" placeholder="cpu内核">
                                <template #append>
                                    <a-select v-model="form.cpuDw" @blur="testLimitCpuMemory(form)" @change="testLimitCpuMemory(form)" style="width:80px;">
                                        <a-option value="m" label="毫核"></a-option>
                                        <a-option value="" label="核"></a-option>
                                    </a-select>
                                </template>
                            </a-input>
                        </a-form-item>
                        <a-form-item label="内存大小" :label-col-style="subItemStyle" style="margin-bottom:0;">
                            <a-input type="number" v-model="form.memory" @blur="testLimitCpuMemory(form)" @change="testLimitCpuMemory(form)" size="large" placeholder="内存大小">
                                <template #append>
                                    <a-select v-model="form.memoryDw" @blur="testLimitCpuMemory(form)" @change="testLimitCpuMemory(form)" style="width:80px;">
                                        <a-option value="Mi" label="Mi"></a-option>
                                        <a-option value="Gi" label="Gi"></a-option>
                                    </a-select>
                                </template>
                            </a-input>
                        </a-form-item>
                    </a-space>
                </a-form-item>

                <a-form-item v-if="gpuSupport || isPlugin" label="GPU限制">
                    <a-space direction="vertical" fill :size="0">
                        <a-form-item label="GPU支持状态" :label-col-style="subItemStyle" :style="form.gpuEnabled?'margin-bottom:10px;':'margin-bottom:0;'">
                            <a-switch v-model="form.gpuEnabled"></a-switch>
                        </a-form-item>
                        <div v-if="form.gpuEnabled" style="padding:20px;width:500px;background:var(--color-neutral-1);" >
                            <a-form-item label="GPU数量" :label-col-style="subItemStyle">
                                <template #label>
                                    <span>GPU数量</span>
                                    <a-tooltip content="表示当前Pod需要挂载几张物理卡，输入值必须为整数且小于等于宿主机上的卡数量。">
                                        <icon-question-circle-fill class="ml-4 fs-14 c-99 cursor" />
                                    </a-tooltip>
                                </template>
                                <a-input v-model="form.gpuNumber" type="number" size="large" placeholder="请输入">
                                    <template #append>个</template>
                                </a-input>
                            </a-form-item>
                            <a-form-item label="GPU算力" :label-col-style="subItemStyle">
                                <template #label>
                                    <span>GPU算力</span>
                                    <a-tooltip content="表示每张卡占用的GPU算力，值范围为0-100；如果配置为0，则认为不强制隔离；配置为100，则认为独占整张卡。">
                                        <icon-question-circle-fill class="ml-4 fs-14 c-99 cursor" />
                                    </a-tooltip>
                                </template>
                                <a-input v-model="form.gpuCompute" type="number" size="large" placeholder="请输入">
                                    <template #append>%</template>
                                </a-input>
                            </a-form-item>
                            <a-form-item label="GPU显存" :label-col-style="subItemStyle" style="margin-bottom:0;">
                                <template #label>
                                    <span>GPU显存</span>
                                    <a-tooltip content="表示每张卡占用的GPU显存，值单位为MB，最小值为1，最大值为整卡的显存值。">
                                        <icon-question-circle-fill class="ml-4 fs-14 c-99 cursor" />
                                    </a-tooltip>
                                </template>
                                <a-input v-model="form.gpuVm" type="number" size="large" placeholder="请输入">
                                    <template #append>MB</template>
                                </a-input>
                            </a-form-item>
                        </div>
                    </a-space>
                </a-form-item>
                
                <a-form-item label="应用镜像" field="image">
                    <a-input type="text" size="large" v-model="form.image" @input="testImage(index)" :spellcheck="false" style="width:500px;" placeholder="应用镜像"></a-input>
                </a-form-item>

                <a-form-item label="镜像仓库">
                    <a-select v-model="form.imagePullSecrets" :options="mirror" placeholder="请选择" style="width:500px;">
                        <template #label="{ data }">
                            <span>{{data?.label+(data.namespace?'/':'')+data.namespace}}</span>
                        </template>
                        <template #option="{data}">
                            <div class="df ai-c jc-b">
                                <span class="custom-label" :class="{'lh-1':data.value}">{{ data.label+(data.namespace?'/':'')+data.namespace }}</span>
                                <span>
                                    <span v-if="data.value" class="df-s0 ml-10 c-blue cursor"  @click.stop="$emit('editMirror',data.value)">编辑</span>
                                    <span v-if="data.value" class="df-s0 ml-10 c-blue cursor" @click.stop="$emit('delMirror',data.value);(form.imagePullSecrets==data.value) && (form.imagePullSecrets='');">删除</span>
                                </span>
                            </div>
                        </template>
                    </a-select>
                    <span class="ml-20 cursor c-blue" @click="$emit('editMirror','')">新建</span>
                </a-form-item>

                <a-form-item label="镜像拉取策略">
                    <a-select v-model="form.imagePullPolicy" size="large" placeholder="请选择" style="width:500px;">
                        <a-option label="总是拉取镜像" value="Always"></a-option>
                        <a-option label="本地有不拉取" value="IfNotPresent"></a-option>
                        <a-option label="不拉取" value="Never"></a-option>
                    </a-select>
                </a-form-item>

                
                <a-form-item label="挂载点">
                    <div style="flex:1;">
                        <table class="com-table ftable mt-10"><tbody>
                            <tr class="thead">
                                <td style="width:200px;">数据卷</td>
                                <td>目标路径</td>
                                <td>数据卷子路径</td>
                                <td>权限</td>
                                <td>操作</td>
                            </tr>
                            <tr><td colspan="5" style="box-sizing:border-box; cursor:pointer;background:var(--color-neutral-1);" @click="form.volumeMounts.push({name:'',mountPath:'',subPath:'',readOnly:false})">
                                <div class="df ai-c jc-c">
                                    <icon-plus :size="14" class="c-99" />
                                    <span class="c-99 lh-1" style="margin-left:6px;">添加挂载点</span>
                                </div>
                            </td></tr>
                            <tr v-for="(item,index) in form.volumeMounts" :key="index" style="background:var(--color-neutral-1);">
                                <td>
                                    <a-select v-model="item.name" placeholder="请选择">
                                        <a-option v-for="(v,vid) in volumes" :key="vid" :label="v.name" :value="v.name"></a-option>
                                        <a-option v-for="(v,vid) in volumeClaimTemplates" :key="vid+volumes.length" :label="v.metadata.name" :value="v.metadata.name"></a-option>
                                    </a-select>
                                </td>
                                <td>
                                    <a-input v-model="item.mountPath" placeholder="容器内路径，如 /mnt" @focus="item.mpFocus=true" @blur="item.mpFocus=false"></a-input>
                                    <span v-if="item.mpFocus" class="fs-12 c-red">目标路径不能为空</span>
                                </td>
                                <td>
                                    <a-input v-model="item.subPath" placeholder="数据卷的子路径（选填）" @focus="item.spFocus=true" @blur="item.spFocus=false"></a-input>
                                    <span v-if="item.spFocus" class="fs-12 c-red">仅挂载选中数据卷中的子路径或单一文件</span>
                                </td>
                                <td>
                                    <a-select v-model="item.readOnly">
                                        <a-option label="只读" :value="true"></a-option>
                                        <a-option label="读写" :value="false"></a-option>
                                    </a-select>
                                </td>
                                <td>
                                    <span class="c-blue cursor" @click="form.volumeMounts.splice(index,1);" style="text-wrap:nowrap;">删除</span>
                                </td>
                            </tr>
                        </tbody></table>
                    </div>
                </a-form-item>
                
                <!-- 高级设置 -->
                 <div class="df jc-c">
                     <a-button type="text" @click="showExtra=!showExtra">
                         <span>高级设置</span>
                         <icon-up v-if="showExtra" class="fs-16 ml-4" />
                         <icon-down v-else class="fs-16 ml-4" />
                     </a-button>
                 </div>

                
                <div v-show="showExtra" class="mt-20">
                    
                    <a-form-item label="环境变量" prop="env">
                        <div class="df df-c ai-s" style="flex:1;">
                            <a-button type="primary" @click="openEnvEdit(form)">批量编辑</a-button>
                            <table class="com-table mt-10 ftable" ><tbody>
                                <tr class="thead"><td>类型</td><td>名称</td><td>默认值</td><td>基数单位</td><td>操作</td></tr>
                                <tr><td colspan="5" style="box-sizing:border-box; cursor:pointer;background:var(--color-neutral-1);" @click="form.env.push({name:'',value:'', type:'custom'})">
                                    <div class="df ai-c jc-c">
                                        <icon-plus :size="14" class="c-99" />
                                        <span class="c-99 lh-1" style="margin-left:6px;">添加环境变量</span>
                                    </div>
                                </td></tr>
                                <tr v-for="(item,index) in form.env" :key="index" style="background:var(--color-neutral-1);">
                                    <td>
                                        <a-select v-model="item.type" :disabled="item.disabled" style="width:120px" size="large" @change="item.value=''">
                                            <a-option label="自定义" value="custom"></a-option>
                                            <a-option label="Field" value="field"></a-option>
                                            <a-option label="ResourceField" value="resource_field"></a-option>
                                        </a-select>
                                    </td>
                                    <td>
                                        <a-input v-model="item.name" :disabled="item.disabled" @paste="envPaste($event,index)" size="large" style="width:170px;" placeholder="变量名" />
                                    </td>
                                    <td>
                                        <a-input v-if="item.type=='custom'" :disabled="item.disabled" v-model="item.value" size="large" style="width:170px;" placeholder="变量值" />
                                        
                                        <!-- <a-select v-if="item.type=='field'" :disabled="item.disabled" v-model="item.value" size="large" placeholder="请选择" style="width:170px;">
                                            <a-option value="metadata.name" label="metadata.name"></a-option>
                                            <a-option value="metadata.namespace" label="metadata.namespace"></a-option>
                                            <a-option value="spec.serviceAccountName" label="spec.serviceAccountName"></a-option>
                                            <a-option value="status.hostIP" label="status.hostIP"></a-option>
                                            <a-option value="status.podIP" label="status.podIP"></a-option>
                                            <a-option value="status.podIPs" label="status.podIPs"></a-option>
                                            <a-option value="spec.nodeName" label="spec.nodeName"></a-option>
                                        </a-select> -->
                                        <a-auto-complete
                                            v-if="item.type=='field'"
                                            :disabled="item.disabled"
                                            :data="fieldData"
                                            v-model="item.value"
                                            size="large"
                                            placeholder="请输入"
                                            style="width:170px;"
                                            @search="v=>fieldData=v?fieldList.filter(i=>i.startsWith(v)):fieldList"
                                        />

                                        <a-select v-if="item.type=='resource_field'" :disabled="item.disabled" v-model="item.value" placeholder="请选择" size="large" style="width:170px;">
                                            <a-option value="limits.cpu" label="limits.cpu"></a-option>
                                            <a-option value="limits.memory" label="limits.memory"></a-option>
                                            <a-option value="limits.ephemeral-storage" label="limits.ephemeral-storage"></a-option>
                                            <a-option value="requests.cpu" label="requests.cpu"></a-option>
                                            <a-option value="requests.memory" label="requests.memory"></a-option>
                                        </a-select>
                                    </td>
                                    <td>
                                        <span v-if="item.type!=='resource_field'">-</span>
                                        <a-input v-else v-model="item.divisor" style="width:170px;" placeholder="请输入">
                                            <template #prepend>divisor</template>
                                        </a-input>
                                    </td>
                                    <td>
                                        <span v-if="!item.disabled" class="c-blue cursor lh-1" style="text-wrap:nowrap;" @click="form.env.splice(index,1);">删除</span>
                                    </td>
                                </tr>
                            </tbody></table>
                            <div class="fs-12 mt-10 df ai-c jc-b">
                                <span style="color:#bbbbbb;">变量名为空时，在变量名称中粘贴一行或多行 key=value 的键值对可以实现快速批量输入</span>
                            </div>
                        </div>
                    </a-form-item>
                    
                    <a-form-item label="暴露端口" prop="ports">
                        <div style="flex:1;">
                            <a-checkbox v-if="form.kind=='statefulsets'" disabled v-model="form.headless" class="mt-6">支持无头服务</a-checkbox>
                            <table class="com-table ftable mt-10"><tbody>
                                <tr class="thead">
                                    <td>端口</td>
                                    <td>协议</td>
                                    <td>主机端口</td>
                                    <td>操作</td>
                                </tr>
                                <tr><td colspan="4" style="box-sizing:border-box; cursor:pointer;background:var(--color-neutral-1);" @click="form.ports.push({containerPort:'',hostPort:'0', nodePort:'', protocol:'TCP'})">
                                    <div class="df ai-c jc-c">
                                        <icon-plus :size="14" class="c-99" />
                                        <span class="c-99 lh-1" style="margin-left:6px;">添加端口</span>
                                    </div>
                                </td></tr>
                                <tr v-for="(item,index) in form.ports" :key="index" style="background:var(--color-neutral-1);">
                                    <td>
                                        <a-input v-model="item.containerPort" size="large" type="number" style="width:180px;" placeholder="端口号" />
                                    </td>
                                    <td>
                                        <a-select v-model="item.protocol" size="large" style="width:180px;" placeholder="请选择协议">
                                            <a-option label="TCP" value="TCP"></a-option>
                                            <a-option label="UDP" value="UDP"></a-option>
                                        </a-select>
                                    </td>
                                    <td>
                                        <a-input v-model="item.hostPort" size="large" type="number" style="width:180px;" placeholder="端口号" />
                                    </td>
                                    <td>
                                        <span class="c-blue cursor" @click="form.ports.splice(index,1);">删除</span>
                                    </td>
                                </tr>
                            </tbody></table>
                        </div>
                    </a-form-item>

                    <a-form-item label="运行命令">
                        <div class="df df-c ftable " style="flex:1;">
                            <div class="df ai-c mb-10" style="height:32px;">
                                <span class="mr-10">简易模式</span>
                                
                                <a-popover v-if="!testEasyCmd(form).pass" position="top">
                                    <a-switch :disabled="true"></a-switch>
                                    <template #content>{{testEasyCmd(form).reason}}</template>
                                </a-popover>
                                <a-switch v-else v-model="form.easyCmd" @change="form.command.length==1?form.command=['sh','-c'].concat(form.command):null;"></a-switch>
                            </div>
                            <div v-if="form.easyCmd">
                                <a-textarea v-model="form.command[2]" placeholder="请输入命令" style="height:80px;width:760px;" :spellcheck="false" allow-clear/>
                            </div>
                            <div v-else style="width:760px;">
                                <div v-for="(item,index) in form.command" :key="index" class="df ai-c" style="margin-bottom:10px;">
                                    <a-textarea v-model="form.command[index]" placeholder="请输入命令" style="height:80px;" :spellcheck="false" allow-clear/>
                                    <icon-close class="ml-20 cursor fs-20" @click="form.command.splice(index,1)" />
                                </div>
                                <a-button type="outline" style="width:100%;margin-top:10px;" @click="form.command.push('')">新增</a-button>
                            </div>
                        </div>
                    </a-form-item>

                    <a-form-item v-if="!form.easyCmd" label="运行参数">
                        <div class="df df-c ftable">
                            <div v-for="(item,index) in form.args" :key="index" class="df ai-c" style="margin-bottom:10px;">
                                <a-textarea v-model="form.args[index]" placeholder="请输入命令" style="height:80px;" :spellcheck="false" allow-clear/>
                                <icon-close class="ml-20 cursor fs-20"  @click="form.args.splice(index,1)" />
                            </div>
                            <a-button type="outline" style="width:760px;margin-top:10px;" @click="form.args.push('')">新增</a-button>
                        </div>
                    </a-form-item>
                    
                    <a-form-item v-if="!form.isInitContainers" label="生命周期" prop="">
                        <div style=" padding: 20px; background: var(--color-neutral-1);flex:1;">
                            <div class="df">
                                <div class="" style="width:100px;line-height:32px;">启动后执行</div>
                                <div class="df df-c">
                                    <div v-for="(item,index) in form.post_start" :key="index" class="df ai-c" style="margin-bottom:10px;">
                                        <a-input v-model="form.post_start[index]" placeholder="请输入" size="large" style="width:400px;"></a-input>
                                        <div>
                                            <span @click="form.post_start.length<=1?form.post_start=['']:form.post_start.splice(index,1)" class="ml-10 cursor c-blue">删除</span>
                                            <span v-if="index+1==form.post_start.length" @click="form.post_start.push('')" class="ml-10 cursor c-blue">添加</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="df mt-10">
                                <div class="" style="width:100px;line-height:32px;">关闭前执行</div>
                                <div class="df df-c">
                                    <div v-for="(item,index) in form.pre_stop" :key="index" class="df" style="margin-bottom:10px;">
                                        <a-input v-model="form.pre_stop[index]" placeholder="请输入" size="large" style="width:400px;"></a-input>
                                        <div>
                                            <span @click="form.pre_stop.length<=1?form.pre_stop=['']:form.pre_stop.splice(index,1)" class="ml-10 cursor c-blue">删除</span>
                                            <span v-if="index+1==form.pre_stop.length" @click="form.pre_stop.push('')" class="ml-10 cursor c-blue">添加</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </a-form-item>

                    <a-form-item v-if="!form.isInitContainers" label="容器健康检查" prop="">
                        <health-probe :data="form.defaultHealthProbeInit" @returnData="v=>form.healthProbeInit = v"></health-probe>
                    </a-form-item>

                    <!-- v-if="!fl.find(i=>i.isInitContainers) || form.isInitContainers" -->
                    <a-form-item label="初始化容器">
                        <a-switch v-model="form.isInitContainers" @change="sortFormByInitcontoiner" />
                        <span class="fs-12 c-99 ml-20 lh-1">容器标识为init containers</span>
                    </a-form-item>

                    <a-form-item label="特权容器" prop="">
                        <a-switch v-model="form.privileged" />
                        <span class="fs-12 c-99 ml-20 lh-1">容器开启特权级，将拥有宿主机的root权限</span>
                    </a-form-item>

                    <a-form-item v-if="!form.privileged" label="容器权限细化" prop="">
                        <div style=" padding: 20px; background: var(--color-neutral-1);flex:1;">
                            <div class="df">
                                <div class="" style="width:100px;line-height:32px;">drop</div>
                                <div class="df df-c">
                                    <div v-for="(item,index) in form.capabilities_drop" :key="index" class="df ai-c" style="margin-bottom:10px;">
                                        <a-input v-model="form.capabilities_drop[index]" placeholder="请输入" size="large" style="width:400px;"></a-input>
                                        <div>
                                            <span @click="form.capabilities_drop.length<=1?form.capabilities_drop=['']:form.capabilities_drop.splice(index,1)" class="ml-10 cursor c-blue">删除</span>
                                            <span v-if="index+1==form.capabilities_drop.length" @click="form.capabilities_drop.push('')" class="ml-10 cursor c-blue">添加</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="df">
                                <div class="" style="width:100px;line-height:32px;">add</div>
                                <div class="df df-c">
                                    <div v-for="(item,index) in form.capabilities_add" :key="index" class="df ai-c" style="margin-bottom:10px;">
                                        <a-input v-model="form.capabilities_add[index]" placeholder="请输入" size="large" style="width:400px;"></a-input>
                                        <div>
                                            <span @click="form.capabilities_add.length<=1?form.capabilities_add=['']:form.capabilities_add.splice(index,1)" class="ml-10 cursor c-blue">删除</span>
                                            <span v-if="index+1==form.capabilities_add.length" @click="form.capabilities_add.push('')" class="ml-10 cursor c-blue">添加</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </a-form-item>

                    <!-- <a-form-item label="挂载文件用户">
                        <a-input v-model="form.fsGroup" placeholder="文件组ID"></a-input>
                    </a-form-item> -->

                    <a-form-item label="运行用户">
                        <!-- <a-checkbox v-model="form.allowPrivilegeEscalation" :disabled="form.privileged" >特权升级</a-checkbox> -->
                         <a-checkbox v-model="form.runAsNonRoot">禁用root用户</a-checkbox>
                        <a-input v-model="form.runAsUser" type="number" class="ml-10" style="width:200px;" placeholder="用户id" />
                        <a-input v-model="form.runAsGroup" type="number" class="ml-10" style="width:200px;" placeholder="用户组id（选填）" />
                    </a-form-item>
                </div>

            </a-tab-pane>
        </a-tabs>
        
        <a-modal width="700px" v-model:visible="envedit.show" @ok="submitEnvEdit" @cancel="envedit.show=false;" :popup-container="false?'#allmodalbox':'body'">
            <template #title>环境变量</template>
            <span class="c-66">格式：键=值</span>
            <a-textarea
                v-model="envedit.values"
                class="mt-10"
                style="height:160px;"
                :spellcheck="false"
                placeholder="格式：名称=值"
                :rows="12"
                :input-style="{lineHeight:'24px'}"
            />
        </a-modal>
    </div>
</template>
<script>
import { panelApi } from '@/utils/api';
import { getToken, getUserInfo } from '@/utils/auth';
import { useNamespaceStore } from '@/store';
import axios from 'axios';
import imageformDrawer from '@/views/config/sercet/imageform-drawer.vue';
import healthProbe from '@/components/health-probe.vue';
import Sortable from 'sortablejs';

export default{
    props: ['data','volumes','volumeClaimTemplates','mirror','isPlugin'],
    data(){
        return {
            namespaceActive: 'default',
            activeIndex: '',
            userInfo: {},
            subItemStyle: "flex:0;width:100px;min-width:100px;",
            showExtra: false,
            fieldData: [],
            fieldList: [
                "metadata.name",
                "metadata.namespace",
                "spec.serviceAccountName",
                "status.hostIP",
                "status.podIP",
                "status.podIPs",
                "spec.nodeName",
            ],
            
            envedit:{ show: false, values: '', },
            createImage: {show: false, name: '', submit: ()=>{ this.$emit('getMirror') } },

            gpuSupport: false,
            
            icl: [],
            cl: [],
            fl: [],

            sortable: null,

            showif: true,
            token: '',
        }
    },
    async created(){
        if(window.__POWERED_BY_WUJIE__ && window?.$wujie?.props?.paneltoken){
            this.token = window.$wujie.props.paneltoken;
        }else{
            this.token = getToken();
        }
        this.namespaceActive = useNamespaceStore().namespace;
        this.userInfo = getUserInfo();
        this.init();
    },
    watch: {
        data: 'init',
        showExtra(v){
            this.$emit('showExtra',v)
        }
    },
    components: {
        imageformDrawer,
        healthProbe,
    },
    unmounted(){
        if(this.sortable){
            this.sortable?.destory?.();
        }
    },
    methods: {
        startDrag(){
            let el = document.querySelector('.a-form-container-tabs .arco-tabs-nav-tab-list');
            if(!el){return}
            
            if(this.sortable){
                try{
                    Object.getPrototypeOf(this.sortable).destroy.call(this.sortable);
                }catch{console.log('destory sortable error')}
            }
            let _this = this;
            this.sortable = new Sortable(el, {
                // 核心配置项
                animation: 150, // 拖拽排序时的动画时长（毫秒）
                ghostClass: 'sortable-ghost', // 拖拽时占位元素的类名
                chosenClass: 'sortable-chosen', // 选中元素的类名
                onEnd: function (evt) {
                    let newArr = _this.moveArrayElement(_this.fl, evt.oldIndex, evt.newIndex)
                    _this.fl = newArr;
                    _this.sortFormByInitcontoiner();
                }
            });
        },
        moveArrayElement(arr, fromIndex, toIndex) {
            const newArr = [...arr];
            const [item] = newArr.splice(fromIndex, 1);
            newArr.splice(toIndex, 0, item);
            return newArr;
        },
        sortFormByInitcontoiner() {
            const wrapArr = [...this.fl];
            wrapArr.sort((a, b) => Boolean(b.isInitContainers) - Boolean(a.isInitContainers));
            this.fl = wrapArr;
            this.showif = false;
            this.$nextTick(()=>{
                this.showif=true;
                this.$nextTick(()=>{
                    this.startDrag()
                })
            })
        },
        getConfigmap(){
            panelApi.get('/gpu/config',{
                noAlert:true,
                customToken: this.token,
            }).then(res=>{
                this.gpuSupport = res.data?.gpuEnabled;
            });
        },
        testEasyCmd(form){
            let c = form?.command || [];
            let a = form?.args || [];
            let tc = c.length<=1 || (c.length==3 && c[0]=='sh' && c[1]=='-c');
            let ta = a.filter(i=>i).length == 0;
            if(tc && ta){return {pass:true}}
            return {
                pass: false,
                reason: tc?'运行参数不为空，请删减后开启！':'运行命令大于1个，请删减后开启！',
            }
        },
        testImage(index){
            let mirror = this.mirror || [];
            let form = this.fl[index]
            let host = form.image.replace(/\/.*$/,'')?.trim();
            let ns = form.image.match(/^([^/]+)\/([^\/]+)/)?.[2];
            let find = mirror.find(i=>{
                return i.label==host && i.namespace==ns;
            });
            if(find){ this.fl[index].imagePullSecrets = find.value; }
            else{ this.fl[index].imagePullSecrets = ''; }
        },

        init(){
            this.icl = JSON.parse(JSON.stringify(this?.data?.spec?.template?.spec?.initContainers||[]))
            this.cl = JSON.parse(JSON.stringify(this?.data?.spec?.template?.spec?.containers||[]))
            this.dataToForm();
            this.getConfigmap();
            this.$nextTick(()=>{
                this.startDrag();
            })
        },
        deleteTab(v){
            let index = this.fl.findIndex(i=>i.keyid==v);
            this.fl.splice(index,1);
            if(this.activeIndex==v){
                this.activeIndex = this.fl[index-1].keyid;
            }
        },
        handleAdd(){
            let name = 'container-' + this.createName();
            this.fl.push({
                keyid: name + this.createName(),
                name: name,
                customName: name,
                cpu: '0',
                cpuDw: '',
                memory: '0',
                memoryDw: 'Gi',
                headless: this.data?.metadata?.annotations?.['w7.cc/create-headless-svc'] == 'true',
                ports: [],
                env: [],
                image: '',
                healthProbeInit: null,
                imagePullPolicy: 'Always',
                volumeMounts: [],
                post_start: [''],
                pre_stop: [''],
                
                easyCmd: true,
                command: [''],
                args: [''],
            })
        },

        testName(v){
            return /^[a-z]([a-z0-9-]{0,61})[a-z0-9]$/.test(v);
        },

        dataToForm(){
            let imagePS = this.data?.spec?.template?.spec?.imagePullSecrets || [];

            this.fl = [];
            let arr = [
                ...this.cl.map(i=>{
                    i.isInitContainers = false;
                    return i;
                }),
                ...this.icl.map(i=>{
                    i.isInitContainers = true;
                    return i;
                }),
            ];
            arr.map(containers=>{
                let form = {};
                
                let cpu = containers?.resources?.limits?.cpu || '';
                let cpuDw = /m$/.test(cpu)? 'm' : '';
                cpu = Number(cpu.replace('m',''));
                
                let memory = containers?.resources?.limits?.memory || '';
                
                let memoryDw = 'Mi';
                if(/Mi$/.test(memory)){
                    memoryDw = 'Mi';
                    memory = Number(memory.replace('Mi',''));
                }else if(/Gi$/.test(memory)){
                    memory = Number(memory.replace('Gi',''));
                    memoryDw = 'Gi';
                }else if(/Ti$/.test(memory)){
                    memory = Number(memory.replace('Ti','')) * 1024;
                    memoryDw = 'Gi';
                }else{
                    memory = Number(memory);
                }
                
                let spec = this?.data?.spec?.template?.spec;
                // gpu
                if(spec?.runtimeClassName=='nvidia'){
                    let convertStringToNumber = (str)=>{
                        str = String(str);
                        const isK = str.toLowerCase().endsWith('k');
                        const numStr = str.replace(/[a-zA-Z]/g, '');
                        let num = parseFloat(numStr);
                        if (isK) { num *= 1000; }
                        return num;
                    }
                    form.gpuEnabled = true;
                    form.gpuNumber = containers?.resources?.requests?.['nvidia.com/gpu'] || 0;
                    form.gpuVm = containers?.resources?.requests?.['nvidia.com/gpumem'] || 0;
                    form.gpuVm = convertStringToNumber(form.gpuVm);
                    form.gpuCompute = containers?.resources?.requests?.['nvidia.com/gpucores'] || 0;
                }else{
                    form.gpuEnabled = false;
                    form.gpuNumber = 0;
                    form.gpuVm = 0;
                    form.gpuCompute = 0;
                }

                let ctn = containers;
                // 健康检查
                let healthProbeInit = null;
                //init容器不支持生命周期、健康检查设置
                if(!containers.isInitContainers){
                    if(ctn?.livenessProbe || ctn?.readinessProbe){
                        healthProbeInit = {};
                        if(ctn.livenessProbe){healthProbeInit.liveness_probe = ctn.livenessProbe;}
                        if(ctn.readinessProbe){healthProbeInit.readiness_probe = ctn.readinessProbe;}
                    }
                }
                // 生命周期
                let lifecycle = ctn?.lifecycle;
                //init容器不支持生命周期、健康检查设置
                if(!containers.isInitContainers){
                    if(!lifecycle){
                        form.post_start = [''];
                        form.pre_stop = [''];
                    }else{
                        let sarr = lifecycle?.postStart?.exec?.command || [''];
                        let earr = lifecycle?.preStop?.exec?.command || [''];
                        form.post_start = sarr.length? sarr : [''];
                        form.pre_stop = earr.length? earr : [''];
                    }
                }
                // 特级容器
                form.privileged = ctn?.securityContext?.privileged || false;
                // // 挂载文件用户
                // form.fsGroup = ctn?.securityContext?.fsGroup || '';
                // 容器权限细化
                form.capabilities_add = ctn?.securityContext?.capabilities?.add || [''];
                form.capabilities_add = form.capabilities_add?.length? form.capabilities_add : [''];
                form.capabilities_drop = ctn?.securityContext?.capabilities?.drop || [''];
                form.capabilities_drop = form.capabilities_drop?.length? form.capabilities_drop : [''];

                // 启动用户
                form.runAsUser = ctn?.securityContext?.runAsUser || '';
                form.runAsGroup = ctn?.securityContext?.runAsGroup || '';
                form.runAsNonRoot = ctn?.securityContext?.runAsNonRoot || false;
                // form.allowPrivilegeEscalation = ctn?.securityContext?.allowPrivilegeEscalation || false;
                // 端口
                let ports = ctn?.ports || [];
                let hostPorts = {};
                try{
                    hostPorts = JSON.parse(this.data?.metadata?.annotations?.['w7.cc.app/ports']);
                } catch(e){}
                ports = ports.map(i=>({
                    name: i.name,
                    containerPort: i.containerPort,
                    protocol: i.protocol, // || 'TCP'
                    hostPort: hostPorts[i.containerPort] || 0,
                }))
                // env
                let env = ctn?.env || [];
                env = env?.map(v=>{
                    let type = 'custom';
                    if(v.value){
                        type = 'custom';
                    }else if(v.valueFrom?.fieldRef?.fieldPath){
                        type = 'field';
                    }else if(v.valueFrom?.resourceFieldRef?.resource){
                        type = 'resource_field';
                    }
                    let divisor = v.valueFrom?.resourceFieldRef?.divisor;
                    let o = {
                        name: v.name,
                        value: v.value || v?.valueFrom?.fieldRef?.fieldPath || v?.valueFrom?.resourceFieldRef?.resource,
                        type: type,
                        ...(divisor?{divisor:divisor}:{}),
                    }
                    if(o.name == 'RELEASE_NAME_SUFFIX' && o.value){
                        o.disabled = true;
                    }
                    return o;
                })

                let volumeMounts = ctn?.volumeMounts || [];
                volumeMounts = volumeMounts.map(i=>{
                    i.readOnly = i.readOnly || false;
                    return i;
                })

                // 镜像仓库
                let imagePullSecrets = '';
                let mirror = this.mirror || [];
                imagePS.map(i=>{
                    let find = mirror.find(mo=>mo.value==i.name);
                    let l = find?.label + '/' + find?.namespace;
                    if(l==ctn.image || ctn.image.startsWith(l+'/')){
                        imagePullSecrets = i.name;
                    }
                })

                let easyCmd = this.testEasyCmd({
                    command: ctn?.command || [''],
                    args: ctn?.args || [''],
                }).pass;
                let command = ctn?.command || [''];
                if(easyCmd && command.length==1){
                    command = ['sh','-c'].concat(command);
                }
                
                form = {
                    ...form,
                    keyid: containers.name + this.createName(),
                    name: containers.name,
                    customName: containers.name,
                    cpu: cpu,
                    cpuDw: cpuDw,
                    memory: memory,
                    memoryDw: memoryDw,
                    headless: this.data?.metadata?.annotations?.['w7.cc/create-headless-svc'] == 'true',
                    ports: ports,
                    env: env,
                    image: ctn?.image,
                    defaultHealthProbeInit: healthProbeInit,
                    healthProbeInit: healthProbeInit,
                    imagePullPolicy: ctn?.imagePullPolicy,
                    volumeMounts: volumeMounts,
                    imagePullSecrets: imagePullSecrets,
                    isInitContainers: containers.isInitContainers,
                    
                    command: command,
                    args: ctn?.args || [''],
                    easyCmd: easyCmd,
                }

                this.testLimitCpuMemory(form);

                this.fl.push(form);
            })
            this.activeIndex = this.fl?.[0]?.keyid;
        },

        formToData(){
            let initContainers = [];
            let containers = [];
            let hostPorts = {};
            let imagePullSecrets = [];

            this.fl.map(form=>{
                if(form.imagePullSecrets){ imagePullSecrets.push(form.imagePullSecrets) }
                let o = {};
                let ports = form.ports?.filter(i=>i.containerPort&&i.containerPort!='0')?.map(v=>{
                    hostPorts[v.containerPort] = Number(v.hostPort) || 0;
                    return {
                        containerPort: Number(v.containerPort),
                        name: v.name || "port-"+v.containerPort,
                        protocol: v.protocol,
                    }
                })
                
                let env = form.env.map(v=>{
                    let o = { name: v.name };
                    if(v.type=='custom' || !v.type){
                        o.value = v.value;
                    }else if(v.type=='field'){
                        o.valueFrom = {
                            fieldRef: {
                                apiVersion: 'v1',
                                fieldPath: v.value,
                            }
                        }
                    }else if(v.type=='resource_field'){
                        o.valueFrom = {
                            resourceFieldRef: {
                                containerName: form.name,
                                resource: v.value,
                                divisor: Number(v.divisor || 0),
                            }
                        }
                    }
                    return o;
                })

                let resources = {
                    limits: {
                        memory: (Number(form.memory) || 0) + form.memoryDw,
                        cpu: (Number(form.cpu) || 0) + form.cpuDw,
                    },
                    requests: {},
                }
                if(form.gpuEnabled){
                    resources.limits['nvidia.com/gpu'] = form.gpuNumber;
                    resources.limits['nvidia.com/gpumem'] = form.gpuVm;
                    resources.limits['nvidia.com/gpucores'] = form.gpuCompute;
                    resources.requests['nvidia.com/gpu'] = form.gpuNumber;
                    resources.requests['nvidia.com/gpumem'] = form.gpuVm;
                    resources.requests['nvidia.com/gpucores'] = form.gpuCompute;
                }

                let volumeMounts = form.volumeMounts || [];
                volumeMounts = volumeMounts.map(i=>{
                    if(!i.readOnly){ delete i.readOnly }
                    delete i.mpFocus;
                    delete i.spFocus;
                    return i;
                })
                // 健康检查
                if(!form.isInitContainers){
                    if(form.healthProbeInit?.liveness_probe){ o.livenessProbe = form.healthProbeInit.liveness_probe; }
                    if(form.healthProbeInit?.readiness_probe){ o.readinessProbe = form.healthProbeInit.readiness_probe; }
                }
                // 生命周期
                let lifecycle = {};
                let post_start = form.post_start?.filter(i=>i) || [];
                let pre_stop = form.pre_stop?.filter(i=>i) || [];

                if(post_start.length){
                    lifecycle.postStart = {
                        exec: { command: post_start, }
                    };
                }
                if(pre_stop.length){
                    lifecycle.preStop = {
                        exec: { command: pre_stop, }
                    };
                }

                // 特级容器,启动用户,容器权限细化
                let securityContext = {
                    privileged: form.privileged,
                    // fsGroup: form.fsGroup,
                    ...(form.privileged?{}:(() => {
                        // 先过滤空值，得到最终的drop和add数组
                        const dropArr = form?.capabilities_drop?.filter?.(i => i) || [];
                        const addArr = form?.capabilities_add?.filter?.(i => i) || [];
                        // 只有drop或add非空时，才返回capabilities配置
                        return (dropArr.length > 0 || addArr.length > 0) 
                            ? { capabilities: { drop: dropArr, add: addArr } } 
                            : {};
                    })()),
                    ...(form.runAsUser?{runAsUser:Number(form.runAsUser)}:{}),
                    ...(form.runAsGroup?{runAsGroup:Number(form.runAsGroup)}:{}),
                    runAsNonRoot: form.runAsNonRoot,
                    // allowPrivilegeEscalation: form.allowPrivilegeEscalation || false,
                };

                // 运行命令
                let command = form.command?.filter(i=>i) || [];
                if(command.length==2&&command[0]=='sh'&&command[1]=='-c'){
                    command = [];
                }
                o = {
                    ...o,
                    name: form.name,
                    image: form.image?.trim(),
                    imagePullPolicy: form.imagePullPolicy,
                    ports: ports,
                    env: env,
                    resources: resources,
                    volumeMounts: volumeMounts,
                    ...(form.isInitContainers?{}:{
                        lifecycle: lifecycle,
                    }),
                    securityContext: securityContext,
                    command: command,
                    args: form.args?.filter(i=>i) || [],
                }

                if(form.isInitContainers){
                    initContainers.push(o);
                }else{
                    containers.push(o);
                }
            })

            imagePullSecrets = [...new Set(imagePullSecrets)];
            imagePullSecrets = Array.from(new Set(imagePullSecrets));
            imagePullSecrets = imagePullSecrets.map(i=>({name:i}));

            return {
                initContainers,
                containers,
                hostPorts,
                imagePullSecrets,
            }
        },

        testLimitCpuMemory(form){
            let ql = JSON.parse(this.userInfo?.['w7.cc/quota-limit']||'{}')
            let lcpu = ql?.limit?.cpu;
            let lmemory = ql?.limit?.memory;

            let mcpu = this.minusCpu( (form.cpu||0)+form.cpuDw, lcpu);
            let mmemory = this.minusMemory( (form.memory||0)+form.memoryDw, lmemory);
            
            if(lcpu && mcpu.value<0){
                form.cpu = String(lcpu).replace(/[a-zA-Z]+$/,'');
                form.cpuDw = /m$/.test(lcpu)? 'm' : '';
            }
            if(lmemory && mmemory.value<0){
                form.memory = String(lmemory).replace(/[a-zA-Z]+$/,'');
                form.memoryDw = 'Gi';
            }
        },
        
        minusCpu(a,b){
            if(!a){a = '0'}
            if(!b){b = '0'}
            if(/^\d+(\.\d+)?$/.test(a)){ a = Number(a) * 1000; }
            if(/m$/.test(a)){a = Number(a.replace(/m$/,''))}
            if(/k$/.test(a)){a = Number(a.replace(/k$/,'')) * 1000 * 1000; }
            if(/^\d+(\.\d+)?$/.test(b)){ b = Number(b) * 1000; }
            if(/m$/.test(b)){b = Number(b.replace(/m$/,''))}
            if(/k$/.test(b)){b = Number(b.replace(/k$/,'')) * 1000 * 1000; }
            let value = a - b;
            let unit = 'm';
            if(value>0 && value%1000 == 0 ){
                value = value / 1000;
                unit = '';
            }
            return { value, unit };
        },

        minusMemory(a,b){
            if(!a){a = '0'}
            if(!b){b = '0'}
            if(/Ti$/.test(a)){ a = parseInt(a.replace(/Ti$/,'') * 1024 * 1024); }
            if(/Gi$/.test(a)){ a = parseInt(a.replace(/Gi$/,'') * 1024); }
            if(/Mi$/.test(a)){ a = Number(a.replace(/Mi$/,'')) }
            if(/Ti$/.test(b)){ b = parseInt(b.replace(/Ti$/,'') * 1024 * 1024); }
            if(/Gi$/.test(b)){ b = parseInt(b.replace(/Gi$/,'') * 1024); }
            if(/Mi$/.test(b)){ b = Number(b.replace(/Mi$/,'')) }
            let value = Number(a) - Number(b);
            let unit = 'Mi';
            if(value > 0 && value % 1024 == 0){
                value = value / 1024;
                unit = 'Gi';
            }
            return {value, unit}
        },
        // 批量输入环境变量
        openEnvEdit(form){
            this.envedit.show = true;
            let values = form.env.filter(i=>i.type=='custom').map(i=>`${i.name}=${i.value}`);
            this.envedit.form = form;
            this.envedit.values = values.join('\n');
        },
        submitEnvEdit(){
            let values = this.envedit.values.split('\n');
            let arr = [];
            values.map(i=>{
                let match = i.match(/^([^\s=#]+)\s*=\s*([^\s=#]+)\s*(#([^:：]*)(\s*[:：]\s*(.*))?)?$/);
                if(!match){return}
                arr.push({
                    name: match[1],
                    value: match[2],
                    title: match[4] || '',
                    description: match[6] || '',
                    type: 'custom',
                });
            })
            arr = this.envedit.form.env.filter(i=>i.type!='custom').concat(arr);
            this.envedit.form.env = arr;
            this.envedit.show = false;
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
    }
}
</script>
<style>
.a-form-container-tabs .arco-tabs-nav-add-btn{cursor:pointer;}
.a-form-container-tabs .arco-tabs-nav-add-btn::after{content:'添加容器';margin-left:4px; text-wrap:nowrap;color:var(--color-text-2);}
</style>