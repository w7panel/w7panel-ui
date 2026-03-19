<template>
    <div class="padding-20">
        <a-form label-suffix="" auto-label-width class="ml-20" label-align="left">

            <div class="form-title">基本信息</div>
            <a-form-item label="应用图标">
                <img v-if="form.icon" :src="form.icon" width="64" height="64" style="border-radius:10%;" />
                <span v-else>无</span>
            </a-form-item>
            <a-form-item label="应用标识">{{form.name}}</a-form-item>
            <a-form-item label="应用名称">{{form.title}}</a-form-item>
            <a-form-item label="内网域名">
                <span>{{localDomain}}</span>
                <span class="c-blue cursor ml-10" @click="onekeyCopy(localDomain)">复制</span>
            </a-form-item>
            <a-form-item v-if="form.headless" label="无头服务域名">
                <div class="df ai-c" style="flex:1;">
                    <a-select v-model="podValue" style="flex:0;">
                        <a-option v-for="item in podList" :key="item.name" :label="item.name" :value="item.name"></a-option>
                    </a-select>
                    <span>.{{form.name}}-headless.default.svc.cluster.local</span>
                    <span class="c-blue cursor ml-10" @click="onekeyCopy(`${podValue}.${form.name}-headless.default.svc.cluster.local`)">复制</span>
                </div>
            </a-form-item>
            <a-form-item v-if="$route.params.kind!='daemonsets'" label="实例副本数">
                <span v-if="$route.params.kind=='daemonsets'">{{form.numberReady}}</span>
                <div v-else>
                    <div>
                        <span>{{ form.replicas }}</span>
                        <span class="c-blue cursor ml-10" @click="openChangeReplicas">修改</span>
                    </div>
                    <!-- <div v-else class="df ai-c">
                        <a-input-number v-model="editReplicas" :disabled="disabled" :min="0" :max="50" style="margin-right:24px;" />
                        <a-button type="primary" class="ml-10" @click="handleChange(()=>$emit('refresh'))">确定</a-button>
                    </div> -->
                </div>
            </a-form-item>
            <a-form-item label="更新方式">
                <span>{{form.update.typeText}}</span>
                <span class="c-blue cursor ml-10" @click="form.update.openForm=true;">修改</span>
            </a-form-item>
            <!-- <a-form-item label="启动用户">
                <span v-if="form.security_context && form.security_context.runAsNonRoot">非root运行</span>
                <span v-if="form.security_context && form.security_context.runAsUser" class="ml-10">用户id：{{form.security_context.runAsUser}}</span>
                <span v-if="form.security_context && form.security_context.runAsGroup" class="ml-10">用户组id：{{form.security_context.runAsGroup}}</span>
                <span v-if="form.security_context && form.security_context.fsGroup" class="ml-10">文件组：{{form.security_context.fsGroup}}</span>
                <span v-if="!form.security_context || (!form.security_context.runAsNonRoot&&!form.security_context.runAsUser&&!form.security_context.runAsGroup&&!form.security_context.fsGroup)">-</span>
            </a-form-item> -->
            

            <div class="form-title">容忍调度</div>
            <table class="com-table" style="width:100%;"><tbody>
                <tr class="thead">
                    <td>键</td>
                    <td>值</td>
                </tr>
                <tr v-for="(item,index) in form.affinity" :key="index">
                    <td>{{item.key}}</td>
                    <td>{{item.values}}</td>
                </tr>
                <tr v-if="!form.affinity ||!form.affinity.length">
                    <td colspan="3" class="txt-c c-99">暂无数据</td>
                </tr>
            </tbody></table>
            <a-form-item label="容忍节点封锁" class="mt-20">{{tlrt?'是':'否'}}</a-form-item>
            

            <div class="form-title">数据卷（Volumes）</div>
            <app-form-volumes :data="data" :readonly="true"></app-form-volumes>


            <div class="form-title mt-20">容器（Containers）</div>
            <a-tabs auto-switch style="margin-bottom:20px;">
                <a-tab-pane v-for="(form, index) in ctnForms" :key="index" :title="form.name" style="padding:10px 16px 10px;">
                    <!-- --------pane start-------- -->

                    <a-form-item label="CPU内核">{{form.cpu}} {{form.cpuDwTxt}}</a-form-item>
                    <a-form-item label="内存大小">{{form.memory}}</a-form-item>

                    <div v-if="form.runtime_class_name">
                        <a-form-item label="GPU物理卡数量">{{form.gpuNumber||0}}个</a-form-item>
                        <a-form-item label="GPU算力">{{form.gpuCompute||0}}%</a-form-item>
                        <a-form-item label="GPU显存">{{form.gpuVm||0}}M</a-form-item>
                    </div>
                    <a-form-item label="应用镜像">
                        <div v-if="!changeImageEdit || changeCtnIndex!=index">
                            <span>{{ form.image }}</span>
                            <span class="c-blue cursor ml-10" @click="changeImageEdit=true;changeCtnIndex=index;changeIPSEdit=form.imagePullSecrets;">修改</span>
                        </div>
                        <div v-else class="df ai-c">
                            <a-input v-model="form.image" @input="testImage(index)" :spellcheck="false" style="width:500px; margin-right:24px;" />
                            <a-button type="primary" class="ml-10" @click="changeImage()">确定</a-button>
                        </div>
                    </a-form-item>
                    <a-form-item label="镜像仓库">
                        <div v-if="!changeImageEdit || changeCtnIndex!=index">
                            <span >{{mirror[form.imagePullSecrets] || '无'}}</span>
                        </div>
                        <div v-else class="df ai-c">
                            <a-select v-model="form.imagePullSecrets" :options="mirrorOptions" size="large" popup-container="#mirror_select_box" placeholder="请选择" style="width:500px;">
                                <template #label="{ data }">
                                    <span>{{data?.label+(data.namespace?'/':'')+data.namespace}}</span>
                                </template>
                                <template #option="{data}">
                                    <div class="df ai-c jc-b">
                                        <span class="custom-label">{{ data.label+(data.namespace?'/':'')+data.namespace }}</span>
                                        <!-- <span>
                                            <span v-if="data.value" class="df-s0 ml-10 c-blue cursor"  @click.stop="createImage.name=data.value;createImage.show=true;">编辑</span>
                                            <span v-if="data.value" class="df-s0 ml-10 c-blue cursor" @click.stop="delMirror(data.value)">删除</span>
                                        </span> -->
                                    </div>
                                </template>
                            </a-select>
                        </div>
                    </a-form-item>
                    <a-form-item label="镜像拉取策略">
                        <span v-if="!changeImageEdit||changeCtnIndex!=index">{{ imagePolicy[form.imagePullPolicy] || form.imagePullPolicy}}</span>
                        <a-select v-else v-model="form.imagePullPolicy" placeholder="请选择" size="large" popup-container="#mirror_select_box" style="width:500px;">
                            <a-option v-for="(value,key) in imagePolicy" :key="key" :label="value" :value="key"></a-option>
                        </a-select>
                    </a-form-item>
                    
                    <a-form-item label="环境变量">
                        <div class="df df-c">
                            <table class="com-table" style="width:800px;"><tbody>
                                <tr class="thead"><td>变量名</td><td>值</td><td>基数单位</td></tr>
                                <tr v-for="(item,index) in form.env" :key="index" style="background:var(--color-neutral-1);">
                                    <td>{{item.name}}</td>
                                    <td>{{item.value}}</td>
                                    <td>{{item.divisor||'-'}}</td>
                                </tr>
                                <tr v-if="!form.env || !form.env.length" style="background:var(--color-neutral-1);">
                                    <td colspan="3" class="txt-c c-99">暂无数据</td>
                                </tr>
                            </tbody></table>
                        </div>
                    </a-form-item>
                    
                    <a-form-item label="端口">
                        <div class="df df-c">
                            <table class="com-table" style="width:800px;"><tbody>
                                <tr class="thead"><td>端口</td><td>协议</td><td>主机端口</td></tr>
                                <tr v-for="(item,index) in form.ports" :key="index" style="background:var(--color-neutral-1);">
                                    <td>{{item.containerPort}}</td>
                                    <td>{{item.protocol}}</td>
                                    <td>{{item.hostPort||0}}</td>
                                </tr>
                                <tr v-if="!form.ports ||!form.ports.length" style="background:var(--color-neutral-1);">
                                    <td colspan="3" class="txt-c c-99">暂无数据</td>
                                </tr>
                            </tbody></table>
                        </div>
                    </a-form-item>
                    
                    <a-form-item label="挂载点">
                        <table class="com-table ftable mt-10" style="width:800px;"><tbody>
                            <tr class="thead">
                                <td>数据卷</td>
                                <td>目标路径</td>
                                <td>数据卷子路径</td>
                                <td>权限</td>
                            </tr>
                            <tr v-for="(item,index) in form.volumeMounts" :key="index" style="background:var(--color-neutral-1);">
                                <td>{{ item.name }}</td>
                                <td>{{ item.mountPath }}</td>
                                <td>{{ item.subPath }}</td>
                                <td>{{ item.readOnly?'只读':'读写' }}</td>
                            </tr>
                        </tbody></table>
                    </a-form-item>

                    <a-form-item label="运行命令">
                        <div class="df df-c">
                            <div v-for="(item,index) in form.command" :key="index" style="padding:4px 0;">{{item}}</div>
                            <div v-if="!form.command ||!form.command.length"> 无 </div>
                        </div>
                    </a-form-item>

                    <a-form-item label="运行参数">
                        <div class="df df-c">
                            <div v-for="(item,index) in form.args" :key="index" style="padding:4px 0;">{{item}}</div>
                            <div v-if="!form.args ||!form.args.length"> 无 </div>
                        </div>
                    </a-form-item>

                    <a-form-item label="生命周期">
                        <div style="flex:1;">
                            <a-form-item label="启动后执行" style="margin-bottom:0;">{{ form.post_start }}</a-form-item>
                            <a-form-item label="结束前执行" style="margin-bottom:0;">{{ form.pre_stop }}</a-form-item>
                        </div>
                    </a-form-item>

                    <a-form-item label="容器健康检查">
                        <a-collapse v-if="form.healthProbeInit" class="health-collapse" v-model="collapse" style="width:600px;">
                            <a-collapse-item v-if="form.healthProbeInit.liveness_probe" header="存活检查" name="1">
                                <a-form-item label="检查方法" label-width="100px">{{ form.healthProbeInit.liveness_probe.type }}</a-form-item>
                                <div v-if="form.healthProbeInit.liveness_probe.type=='httpGet' && form.healthProbeInit.liveness_probe.httpGet">
                                    <a-form-item label="检查协议" label-width="100px">{{ form.healthProbeInit.liveness_probe.httpGet.scheme }}</a-form-item>
                                    <a-form-item label="host" label-width="100px">{{ form.healthProbeInit.liveness_probe.httpGet.host || '无' }}</a-form-item>
                                    <a-form-item label="检查端口" label-width="100px">{{ form.healthProbeInit.liveness_probe.httpGet.port }}</a-form-item>
                                    <a-form-item label="httpHeader" label-width="100px">
                                        <div>
                                            <div v-for="(item,index) in form.healthProbeInit.liveness_probe.httpGet.httpHeaders" :key="index">{{ item.name }} : {{ item.value }}</div>
                                            <div v-if="!form.healthProbeInit.liveness_probe.httpGet.httpHeaders || !form.healthProbeInit.liveness_probe.httpGet.httpHeaders.length">无</div>
                                        </div>
                                    </a-form-item>
                                    <a-form-item label="请求路径">{{ form.healthProbeInit.liveness_probe.httpGet.path }}</a-form-item>
                                </div>
                                <div v-if="form.healthProbeInit.liveness_probe.type=='tcpSocket' && form.healthProbeInit.liveness_probe.tcpSocket">
                                    <a-form-item label="host" label-width="100px">{{ form.healthProbeInit.liveness_probe.tcpSocket.host }}</a-form-item>
                                    <a-form-item label="检查端口" label-width="100px">{{ form.healthProbeInit.liveness_probe.tcpSocket.port }}</a-form-item>
                                </div>
                                <div v-if="form.healthProbeInit.liveness_probe.type=='exec' && form.healthProbeInit.liveness_probe.exec">
                                    <a-form-item label="执行命令" label-width="100px">
                                        <div>
                                            <div v-for="item in form.healthProbeInit.liveness_probe.exec.command" :key="item" class="commend">{{ item }}</div>
                                        </div>
                                    </a-form-item>
                                </div>
                                <a-form-item label="启动延时" label-width="100px">{{ form.healthProbeInit.liveness_probe.initialDelaySeconds || 0 }}秒</a-form-item>
                                <a-form-item label="响应超时" label-width="100px">{{ form.healthProbeInit.liveness_probe.timeoutSeconds || 0 }}秒</a-form-item>
                                <a-form-item label="间隔时间" label-width="100px">{{ form.healthProbeInit.liveness_probe.periodSeconds || 0 }}秒</a-form-item>
                                <a-form-item label="不健康阈值" label-width="100px">{{ form.healthProbeInit.liveness_probe.failureThreshold || 0 }}次</a-form-item>
                            </a-collapse-item>

                            <a-collapse-item v-if="form.healthProbeInit.readiness_probe" header="就绪检查" name="2">
                                <a-form-item label="检查方法" label-width="100px">{{ form.healthProbeInit.readiness_probe.type }}</a-form-item>
                                <div v-if="form.healthProbeInit.readiness_probe.type=='httpGet' && form.healthProbeInit.readiness_probe.httpGet">
                                    <a-form-item label="检查协议" label-width="100px">{{ form.healthProbeInit.readiness_probe.httpGet.scheme }}</a-form-item>
                                    <a-form-item label="host" label-width="100px">{{ form.healthProbeInit.readiness_probe.httpGet.host || '无' }}</a-form-item>
                                    <a-form-item label="检查端口" label-width="100px">{{ form.healthProbeInit.readiness_probe.httpGet.port }}</a-form-item>
                                    <a-form-item label="httpHeader" label-width="100px">
                                        <div>
                                            <div v-for="(item,index) in form.healthProbeInit.readiness_probe.httpGet.httpHeaders" :key="index">{{ item.name }} : {{ item.value }}</div>
                                            <div v-if="!form.healthProbeInit.readiness_probe.httpGet.httpHeaders || !form.healthProbeInit.readiness_probe.httpGet.httpHeaders.length">无</div>
                                        </div>
                                    </a-form-item>
                                    <a-form-item label="请求路径" label-width="100px">{{ form.healthProbeInit.readiness_probe.httpGet.path }}</a-form-item>
                                </div>
                                <div v-if="form.healthProbeInit.readiness_probe.type=='tcpSocket' && form.healthProbeInit.readiness_probe.tcpSocket">
                                    <a-form-item label="host" label-width="100px">{{ form.healthProbeInit.readiness_probe.tcpSocket.host }}</a-form-item>
                                    <a-form-item label="检查端口" label-width="100px">{{ form.healthProbeInit.readiness_probe.tcpSocket.port }}</a-form-item>
                                </div>
                                <div v-if="form.healthProbeInit.readiness_probe.type=='exec' && form.healthProbeInit.readiness_probe.exec">
                                    <a-form-item label="执行命令" label-width="100px">
                                        <div>
                                            <div v-for="item in form.healthProbeInit.readiness_probe.exec.command" :key="item" style="padding:6px; line-height:20px;">{{ item }}</div>
                                        </div>
                                    </a-form-item>
                                </div>
                                <a-form-item label="启动延时" label-width="100px">{{ form.healthProbeInit.readiness_probe.initialDelaySeconds || 0 }}秒</a-form-item>
                                <a-form-item label="响应超时" label-width="100px">{{ form.healthProbeInit.readiness_probe.timeoutSeconds || 0 }}秒</a-form-item>
                                <a-form-item label="间隔时间" label-width="100px">{{ form.healthProbeInit.readiness_probe.periodSeconds || 0 }}秒</a-form-item>
                                <a-form-item label="不健康阈值" label-width="100px">{{ form.healthProbeInit.readiness_probe.failureThreshold || 0 }}次</a-form-item>
                            </a-collapse-item>
                        </a-collapse>
                        <div v-else >无</div>
                    </a-form-item>

                    <a-form-item label="初始化容器">{{ form.isInitContainers?'是':'否' }}</a-form-item>

                    <a-form-item label="特权容器">{{form.privileged?'是':'否'}}</a-form-item>

                    <a-form-item label="容器权限细化">
                        <div class="mt-4">
                            <div class="df">
                                <div style="width:60px;padding:4px 0;">drop</div>
                                <div class="df df-c">
                                    <div v-for="(item,index) in form.capabilities_drop" :key="index" style="padding:4px 0;">{{item}}</div>
                                    <div v-if="!form.capabilities_drop ||!form.capabilities_drop.length" style="padding:4px 0;"> 无 </div>
                                </div>
                            </div>
                            <div class="df mt-20">
                                <div style="width:60px;padding:4px 0;">add</div>
                                <div class="df df-c">
                                    <div v-for="(item,index) in form.capabilities_add" :key="index" style="padding:4px 0;">{{item}}</div>
                                    <div v-if="!form.capabilities_add ||!form.capabilities_add.length" style="padding:4px 0;"> 无 </div>
                                </div>
                            </div>
                        </div>
                    </a-form-item>

                    <a-form-item label="挂载文件用户">{{ form.fsGroup || '-' }}</a-form-item>
                    
                    <a-form-item label="运行用户">
                        <span v-if="form.runAsNonRoot">非root运行</span>
                        <span v-if="form.allowPrivilegeEscalation">特权升级</span>
                        <span v-if="form.runAsUser" class="ml-10">用户id：{{form.runAsUser}}</span>
                        <span v-if="form.runAsGroup" class="ml-10">用户组id：{{form.runAsGroup}}</span>
                        <span v-if="!form.allowPrivilegeEscalation && !form.runAsUser && !form.runAsGroup">-</span>
                    </a-form-item>

                    <!-- ------pane end-------- -->
                </a-tab-pane>
            </a-tabs>
            
        </a-form>

        <a-drawer :width="700" :visible="form.update.openForm" title="更新方式" @ok="submitStrategy" @cancel="form.update.openForm=false;">
            <div>
                <a-form ref="updateform" :model="form.update" auto-label-width>
                    <a-form-item label="更新方式" :label-col-style="{flex:'0 0 68px!important'}">
                        <a-select v-model="form.update.type">
                            <a-option v-for="(value,key) in form.update.typeList" :key="key" :value="key">{{value}}</a-option>
                        </a-select>
                    </a-form-item>
                    <div v-if="form.update.type=='1'">
                        <a-form-item v-if="data.kind!='StatefulSet'" field="minReadySeconds" label="更新间隔" :label-col-style="{flex:'0 0 68px!important'}" :rules="[{required:true, message:'请输入更新间隔'}]">
                            <a-input v-model="form.update.minReadySeconds" type="number" placeholder="请输入">
                                <template #append>秒</template>
                            </a-input>
                        </a-form-item>
                        <a-form-item v-if="data.kind!='StatefulSet'" label="更新策略" :label-col-style="{flex:'0 0 68px!important'}">
                            <a-radio-group v-model="form.update.strategy">
                                <a-radio v-for="(value,key) in form.update.strategyList" :key="key" :value="key">{{value}}</a-radio>
                            </a-radio-group>
                        </a-form-item>
                        <a-form-item label="策略配置" :label-col-style="{flex:'0 0 68px!important'}">
                            <div v-if="data.kind!='StatefulSet'" style="flex:1;background:var(--color-neutral-1);padding:10px;padding-bottom:0;">
                                <a-form-item :label="form.update.strategy=='1'?'pods':'maxSurge'" v-if="form.update.strategy!='2'" field="maxSurge" :rules="[{required:true, message:'请输入正确的值'}]">
                                    <a-input v-model="form.update.maxSurge" placeholder="请输入"/>
                                    <template #extra>
                                        <span>{{form.update.strategy=='1'?'Pod将批量启动或停止':'允许超出所需规模最大的pod数量'}}</span>
                                    </template>
                                </a-form-item>
                                <a-form-item :label="form.update.strategy=='2'?'pods':'maxUnavailable'" v-if="form.update.strategy!='1'" field="maxUnavailable" :rules="[{required:true, message:'请输入正确的值'}]">
                                    <a-input v-model="form.update.maxUnavailable" placeholder="请输入" />
                                    <template #extra>
                                        <span>{{form.update.strategy=='2'?'Pod将批量启动或停止':'允许最大不可用的Pod数量'}}</span>
                                    </template>
                                </a-form-item>
                            </div>
                            <div v-else style="background:var(--color-neutral-1);padding:10px;padding-bottom:0;">
                                <a-form-item label="partition" field="partition" :rules="[{required:true, message:'请输入正确的值'}]">
                                    <a-input v-model="form.update.partition" placeholder="请输入" />
                                </a-form-item>
                            </div>
                        </a-form-item>
                    </div>
                    <!-- <a-form-item>
                        <a-button type="primary" @click="submitStrategy">确定</a-button>
                    </a-form-item> -->
                </a-form>
            </div>
        </a-drawer>
        <a-drawer :width="800" :visible="replicasForm.dialog" title="实例副本数" @ok="submitReplicas" @cancel="replicasForm.dialog=false;">
            <a-form auto-label-width>
                <a-form-item label="当前实例数量">{{replicasForm.replicasNow}}</a-form-item>
                <a-form-item label="实例数量">
                    <div style="width:100%;">
                        <div class="df ai-c">
                            <a-radio-group v-model="replicasForm.isAuto">
                                <a-radio :value="false">手动调节</a-radio>
                                <a-radio :value="true">自动调节</a-radio>
                            </a-radio-group>
                        </div>
                        <div class="c-99">
                            <span v-if="replicasForm.isAuto">满足任一设定条件，则自动调节实例（pod）数目</span>
                            <span v-else>直接设定实例数量</span>
                        </div>
                        <div v-if="replicasForm.isAuto" class="mt-20 padding-20" style="background:var(--color-neutral-1);">
                            <div class="df">
                                <span>触发策略</span>
                                <div class="df df-c fc ml-10">
                                    <div v-for="(item,index) in replicasForm.list" :key="index" class="df" style="margin-bottom:10px;">
                                        <a-select v-model="item.name">
                                            <a-option label="cpu" value="cpu"></a-option>
                                            <a-option label="内存" value="memory"></a-option>
                                        </a-select>
                                        <a-select v-model="item.type" class="ml-10">
                                            <a-option :label="{cpu:'cpu',memory:'内存'}[item.name]+'使用率'" value="Utilization"></a-option>
                                            <a-option :label="{cpu:'cpu',memory:'内存'}[item.name]+'使用量'" value="AverageValue"></a-option>
                                        </a-select>
                                        <a-input v-model="item.value" placeholder="请输入" class="ml-10">
                                            <template #append>
                                                <span v-if="item.type=='Utilization'">%</span>
                                                <span v-else-if="item.name=='cpu'">毫核</span>
                                                <span v-else-if="item.name=='memory'">Mi</span>
                                            </template>
                                        </a-input>
                                        <icon-close :size="20" class="mt-6 cursor ml-10 c-99 df-s0" @click="replicasForm.list.splice(index,1)"></icon-close>
                                    </div>
                                    <a-button type="outline" @click="replicasForm.list.push({name:'cpu',type:'Utilization',value:''})">添加</a-button>
                                </div>
                            </div>
                            <div class="mt-20 df">
                                <span>实例范围</span>
                                <div class="df ml-10">
                                    <a-input v-model="replicasForm.min" type="number" style="width:150px;" />
                                    <span style="margin:0 10px;">~</span>
                                    <a-input v-model="replicasForm.max" type="number" style="width:150px;" />
                                </div>
                            </div>
                        </div>
                        <a-input-number v-else v-model="replicasForm.replicas" placeholder="请输入实例数量" mode="button" class="mt-20" style="width:200px;" />
                    </div>
                </a-form-item>
            </a-form>
            
            <template #footer>
                <!-- <div v-if="userInfo['k3k.io/cluster-mode']=='shared'&&userInfo['w7.cc/user-mode']=='cluster'" class="df jc-e" style="margin-bottom:10px;">
                    <test-resource
                        :cpu="form.cpu+form.cpuDw"
                        :memory="form.memory"
                        :replica="replicasForm.isAuto? Math.max(replicasForm.max,replicasForm.min) : replicasForm.replicas"
                        :novisible="false"
                        @changeStatus="v=>{replicasForm.passed=v}"
                        @onlyshow="v=>{}"
                    ></test-resource>
                </div> -->
                
                <div class="df ai-c jc-e">
                    <a-button @click="replicasForm.dialog=false;">取消</a-button>
                    <a-button class="ml-20" type="primary" :loading="submitLoading" @click="submitReplicas">确定</a-button>
                </div>
            </template>
        </a-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios'
import { useNamespaceStore } from '@/store';
import { getUserInfo } from '@/utils/auth';
import CryptoJS  from 'crypto-js';
// import testResource from '@/components/test-resource.vue';
import appFormVolumes from '@/components/app-form-volumes.vue';

export default {
    props: ['data'],
    data(){
        return {
            accounts: [],
            // data: {},
            configmap: [],
            tlrt: false,
            form: {
                update: {},
            },
            ctnForms: [],
            
            imagePolicy: {
                Always: "总是拉取镜像",
                IfNotPresent: "本地有不拉取",
                Never: "不拉取",
            },

            // editReplicas: 0,
            // changeReplicasEdit: false,
            replicasForm: {
                dialog: false,
                replicasNow: 1,
                replicas: 1,
                isAuto: false,
                list: [],
                min: 1,
                max: 10,
                passed: true,

            },

            changeServerEdit: false,
            changeImageEdit: false,
            changeCtnIndex: -1,
            changeIPSEdit: '',

            sans:[],
            mirror: {},
            mirrorOptions: [],

            namespaceActive: 'default',
            clusterDns: '',
            userInfo: {},

            localDomain: '',
            podList: [],
            podValue: '',
        }
    },
    computed:{
        // ...mapState(['namespace','namespaceActive']),
    },
    components: {
        // testResource,
        appFormVolumes,
    },
    watch:{
        data(v,ov){
            this.getData();
            this.getPodList();
        },
    },
    async created(){
        this.userInfo = getUserInfo();
        
        this.namespaceActive = useNamespaceStore().namespace;
        
        // getMirror 必须等待，其他可以并行
        await this.getMirror();
        
        // 并行请求优化
        Promise.all([
            this.getData(),
            this.getSans(),
            this.getPodList()
        ]);
        // this.getConfigmap();
    },
    methods: {
        getDataUpdate(data){
            let spec = data?.spec || {};
            let source = spec.updateStrategy || {};
            let quickUpdate = 'OnDelete';
            if(this.data.kind == 'Deployment'){
                source = spec.strategy || {};
                quickUpdate = 'Recreate';
            }

            let update = {
                openForm: false,
                typeText: source?.type==quickUpdate? '快速更新' : '滚动更新',
                strategyList: {
                    '1': '启动新的Pod，停止旧的Pod',
                    '2': '停止旧的Pod，启动新的Pod',
                    '3': '自定义',
                },
                strategy: '1',
                typeList: {
                    '1': '滚动更新（推荐）',
                    '2': '快速更新',
                },
                type: source?.type == quickUpdate? '2' : '1',
                minReadySeconds: spec.minReadySeconds || 0,
                maxSurge: source?.rollingUpdate?.maxSurge || '',
                maxUnavailable: source?.rollingUpdate?.maxUnavailable || '',
                partition: source?.rollingUpdate?.partition || '',
            }

            if(source?.type!=quickUpdate && this.data.kind!='StatefulSet'){
                if((update.maxSurge!=0 && update.maxSurge!='0%') && (update.maxUnavailable=='0%' || update.maxUnavailable==0)){
                    update.strategy = '1';
                }else if((update.maxSurge=='0%' || update.maxSurge==0) && (update.maxUnavailable!='0%' && update.maxUnavailable!=0)){
                    update.strategy = '2';
                }else if((update.maxSurge!=0 && update.maxSurge!='0%') && (update.maxUnavailable!='0%' && update.maxUnavailable!=0)){
                    update.strategy = '3';
                }
            }
            return update;
        },
        submitStrategy(){
            // console.log(this.form.update)

            let ud = this.form.update;

            let source = 'updateStrategy';
            let quickUpdate = 'OnDelete';
            if(this.data.kind == 'Deployment'){
                source = 'strategy';
                quickUpdate = 'Recreate';
            }
            
            this.$refs.updateform.validate((err) => {
                if (err) {
                    this.$refs.updateform.scrollToField(Object.keys(err)[0]);
                    return;
                }

                if(ud.strategy=='1'){ ud.maxUnavailable = 0; }
                if(ud.strategy=='2'){ ud.maxSurge = 0; }
                
                k8sproxy.patch("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.$route.params.kind +"/"+this.$route.params.id, [{
                    op: 'replace',
                    path: '/spec/minReadySeconds',
                    value: (ud.type=='2'||this.data.kind=='StatefulSet')? 0 : (Number(ud.minReadySeconds) || 0),
                },{
                    op: 'replace',
                    path: '/spec/'+ source,
                    value: {
                        ...(ud.type=='2'? {
                            type: quickUpdate,
                        } : {
                            rollingUpdate: this.data.kind=='StatefulSet'? {
                                partition: parseInt(ud.partition),
                            } : {
                                maxSurge: /%$/.test(String(ud.maxSurge))? String(ud.maxSurge) : Number(ud.maxSurge),
                                maxUnavailable: /%$/.test(String(ud.maxUnavailable))? String(ud.maxUnavailable) : Number(ud.maxUnavailable),
                            },
                            type: 'RollingUpdate'
                        })
                    },
                }],{
                    headers: {'Content-Type': 'application/json-patch+json'},
                }).then(res=>{
                    this.changeImageEdit = false;
                    this.$message.success("修改成功");
                    this.$emit('refresh');
                }).catch(()=>{})
            });
        },
        getPodList(){
            if(!Object.keys(this.data)?.length){return}
            let selector = this.data?.spec?.selector?.matchLabels || {};
            let label = Object.keys(selector).map(key=>`${key}=${selector[key]}`).join(',');
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods",{
                params:{labelSelector: label},
                loading:true
            }).then(res=>{
                let items = res?.data?.items || [];
                this.podList = items.map(item=>{
                    return {
                        key: item?.metadata?.name,
                        name: item?.metadata?.name,
                    }
                });
                this.podValue = this.podList?.[0]?.name || '';
            })
        },
        translateToHostName(name, namespace, clusterName) {
            const namePrefix = `${name}-${namespace}-${clusterName}`;
            const nameKey = `${name}+${namespace}+${clusterName}`;
            const nameSuffix = CryptoJS.enc.Hex.stringify(CryptoJS.enc.Utf8.parse(nameKey));
            const fullPath = `${namePrefix}-${nameSuffix}`;

            if (fullPath.length < 64) return fullPath;

            const hash = CryptoJS.SHA256(fullPath).toString(CryptoJS.enc.Hex);
            const validChar = /[a-z0-9]/.test(fullPath[56]) 
                ? fullPath.substring(0, 57) + "-" + hash.substring(0, 5)
                : fullPath.substring(0, 56) + "-" + hash.substring(0, 6);

            return validChar;
        },
        openChangeReplicas(){
            k8sproxy.get('/apis/autoscaling/v2/namespaces/'+this.namespaceActive+'/horizontalpodautoscalers/'+this.$route.params.id,{noAlert:true}).then(res=>{
                this.replicasForm = {
                    ...this.replicasForm,
                    already: true,
                    dialog: true,
                    replicasNow: this.form.replicas,
                    replicas: this.form.replicas,
                    isAuto: true,
                    min: res?.data?.spec?.minReplicas || 1,
                    max: res?.data?.spec?.maxReplicas || 10,
                    list: res?.data?.spec?.metrics?.map(i=>{
                        let value = i?.resource?.target?.type=='Utilization'? i?.resource?.target?.averageUtilization : i?.resource?.target?.averageValue;
                        if(i?.resource?.target?.type=='AverageValue'){
                            if(i?.resource?.name=='cpu'){
                                if(/\d$/.test(value)){ value = Number(value) * 1000; }
                                if(/k$/.test(value)){ value = Number(value.replace(/k$/,'')) * 1000 * 1000; }
                                if(/m$/.test(value)){ value = Number(value.replace(/m$/,'')); }
                            }else if(i?.resource?.name=='memory'){
                                if(/Ti$/.test(value)){ value = Number(value.replace(/Ti$/,'')) * 1024 * 1024; }
                                if(/Gi$/.test(value)){ value = Number(value.replace(/Gi$/,'')) * 1024; }
                                if(/Mi$/.test(value)){ value = Number(value.replace(/Mi$/,'')); }
                            }
                        }
                        return {
                            name: i?.resource?.name,
                            type: i?.resource?.target?.type,
                            value: value,
                        }
                    }) || [],
                }
            }).catch(()=>{
                this.replicasForm = {
                    ...this.replicasForm,
                    already: false,
                    dialog: true,
                    min: 1,
                    max: 10,
                    replicasNow: this.form.replicas,
                    replicas: this.form.replicas,
                    isAuto: false,
                    list: [],
                }
            })
        },
        submitReplicas(){
            if(this.userInfo?.['k3k.io/cluster-mode']=='shared' && !this.replicasForm.passed){
                this.$message.error('检测失败，剩余配额不足')
                return;
            }
            if(!this.replicasForm.isAuto){
                k8sproxy.patch("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.$route.params.kind +"/"+this.$route.params.id,{spec:{replicas: this.replicasForm.replicas}},{
                    headers: {'Content-Type': 'application/strategic-merge-patch+json'}
                }).then(res=>{
                    k8sproxy.delete('/apis/autoscaling/v2/namespaces/'+this.namespaceActive+'/horizontalpodautoscalers/'+this.$route.params.id,{noAlert:true});
                    this.replicasForm.dialog = false;
                    this.$message.success("修改成功");
                    this.$emit('refresh');
                }).finally(()=>{})
            }else{
                let metrics = this.replicasForm.list.filter(i=>i.value).map((i)=>{
                    let dw = i.type=='Utilization'? '' : (i.name=="cpu"?'m':'Mi');
                    let value = i.type=='Utilization'? Number(i.value) : (i.value + dw);
                    return {
                        type: 'Resource',
                        resource: {
                            name: i.name,
                            target: {
                                type: i.type,
                                [{Utilization:'averageUtilization',AverageValue:'averageValue'}[i.type]]: value,
                            },
                        }
                    }
                })
                let data = {
                    apiVersion: 'autoscaling/v2',
                    kind: 'HorizontalPodAutoscaler',
                    metadata: {
                        name: this.$route.params.id,
                    },
                    spec: {
                        scaleTargetRef: {
                            apiVersion: 'apps/v1',
                            kind: this.data.kind,
                            name: this.$route.params.id,
                        },
                        minReplicas: Number(this.replicasForm.min),
                        maxReplicas: Number(this.replicasForm.max),
                        metrics: metrics,
                    },
                }
                if(!this.replicasForm.already){
                    k8sproxy.post('/apis/autoscaling/v2/namespaces/'+this.namespaceActive+'/horizontalpodautoscalers', data).then(res=>{
                        this.replicasForm.dialog = false;
                        this.$message.success("修改成功");
                        this.$emit('refresh');
                    }).finally(()=>{})
                }else{
                    k8sproxy.patch('/apis/autoscaling/v2/namespaces/'+this.namespaceActive+'/horizontalpodautoscalers/'+this.$route.params.id, data, {
                        headers: {'Content-Type': 'application/strategic-merge-patch+json'}
                    }).then(res=>{
                        this.replicasForm.dialog = false;
                        this.$message.success("修改成功");
                        this.$emit('refresh');
                    }).finally(()=>{})
                }
                    
            }
        },
        getClusterDns(){
            k8sproxy.get('/api/v1/namespaces/kube-system/configmaps/cluster-dns').then(res=>{
                this.clusterDns = res?.data?.data?.clusterDomain || '';
                this.localDomain = `${this.form.name}.${this.namespaceActive}.svc${this.clusterDns? ('.'+this.clusterDns) : ''}`;
                if(this.userInfo?.['k3k.io/cluster-mode']=='shared'){
                    this.localDomain = this.translateToHostName(this.form.name,this.namespaceActive, this.userInfo?.['w7.cc/k3k-name'])+'.'+(this.userInfo?.['w7.cc/k3k-namespace']) + '.svc' + (this.clusterDns? ('.'+this.clusterDns) : '');
                }
            })
        },
        
        testImage(index){
            let form = this.ctnForms[index]
            let host = form.image.replace(/\/.*$/,'')?.trim();
            let ns = form.image.match(/^([^/]+)\/([^\/]+)/)?.[2];
            let find = this.mirrorOptions.find(i=>{
                return i.label==host && i.namespace==ns;
            });
            if(find){ form.imagePullSecrets = find.value; }
            else{ form.imagePullSecrets = ''; }
        },
        getMirror(){
            return k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets?fieldSelector=type=kubernetes.io/dockerconfigjson').then(res=>{
                let list = res?.data?.items || [];
                let o = {};
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
                    let label = dockerconfigjson.host || i?.metadata?.name || '';
                    let namespace = atob(i?.data?.namespace || '');
                    o[i.metadata.name] = label+(namespace?'/':'')+namespace;
                    
                    return {
                        label: dockerconfigjson.host || i?.metadata?.name || '',
                        namespace: atob(i?.data?.namespace || ''),
                        value: i?.metadata?.name || '',
                    }
                });
                
                this.mirror = o;
                this.mirrorOptions = [
                    {label: '无', value:'', namespace: ''},
                    ...list,
                ]
            })
        },
        
        changeImage(){
            let data = JSON.parse(JSON.stringify(this.data));
            let containers = data.spec.template.spec.containers;
            let patchCtn = {
                name: containers[this.changeCtnIndex].name,
                image: this.ctnForms[this.changeCtnIndex].image,
                imagePullPolicy: this.ctnForms[this.changeCtnIndex].imagePullPolicy
            }
            let imagePullSecrets = data?.spec?.template?.spec?.imagePullSecrets || [];
            let v = this.ctnForms[this.changeCtnIndex].imagePullSecrets;
            if(!this.changeIPSEdit){
                if(v){ imagePullSecrets.push({name: v}) }
            }else{
                let findIndex = imagePullSecrets.findIndex(i=>i.name==this.changeIPSEdit)
                if(findIndex>-1){
                    if(v){
                        imagePullSecrets[findIndex] = {name: v}
                    }else{
                        imagePullSecrets.splice(findIndex,1);
                    }
                }
            }

            k8sproxy.patch("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.$route.params.kind +"/"+this.$route.params.id, {
                spec:{
                    template:{
                        spec:{
                            containers: [patchCtn],
                        }
                    }
                }
            },{
                headers: {'Content-Type': 'application/strategic-merge-patch+json'},
            }).then(res=>{
                return k8sproxy.patch("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.$route.params.kind +"/"+this.$route.params.id,[{
                    op: "replace",
                    path: "/spec/template/spec/imagePullSecrets",
                    value: imagePullSecrets,
                }],{
                    headers: {'Content-Type': 'application/json-patch+json'},
                });
            }).then(()=>{
                this.changeImageEdit = false;
                this.$message.success("修改成功");
                this.$emit('refresh');
            }).catch(()=>{})
        },
        // serverChange(){
        //     if(!this.form.serviceAccountName){return}
        //     let find = this.sans.find(i=>i.value==this.form.serviceAccountName)
        //     if(!find){this.$message.warning("请输入正确的服务账号");return}
        //     if(find.value==this?.data?.spec?.template?.spec?.serviceAccountName){this.changeServerEdit = false; return}
            
        //     k8sproxy.patch("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.$route.params.kind +"/"+this.$route.params.id, {spec:{template:{spec:{serviceAccountName:find.value}}}}, {
        //         headers: {'Content-Type': 'application/strategic-merge-patch+json'}
        //     }).then(res=>{
        //         this.changeServerEdit = false;
        //         this.$message.success("修改成功");
        //         this.$emit('refresh');
        //     }).catch(()=>{})
        // },
        querySearch(searchStr,cb){
            if(searchStr){
                this.accounts = this.sans.filter(i=>i.value.includes(searchStr));
            }else{
                this.accounts = this.sans;
            }
        },
        getData(){
            if(!this.data){return}
            
            this.getClusterDns();

            let imagePS = this.data?.spec?.template?.spec?.imagePullSecrets || [];

            let ctnForms = [];
            
            let icl = JSON.parse(JSON.stringify(this?.data?.spec?.template?.spec?.initContainers||[]))
            let cl = JSON.parse(JSON.stringify(this?.data?.spec?.template?.spec?.containers||[]))
            
            let arr = [
                ...cl.map(i=>{
                    i.isInitContainers = false;
                    return i;
                }),
                ...icl.map(i=>{
                    i.isInitContainers = true;
                    return i;
                }),
            ];

            arr.map((containers,cid)=>{
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
                    form.runtime_class_name = true;
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
                if(ctn?.livenessProbe || ctn?.readinessProbe){
                    healthProbeInit = {};
                    if(ctn.livenessProbe){healthProbeInit.liveness_probe = ctn.livenessProbe;}
                    if(ctn.readinessProbe){healthProbeInit.readiness_probe = ctn.readinessProbe;}
                }
                if(ctn.livenessProbe){
                    healthProbeInit.liveness_probe = ctn.livenessProbe;
                    let l = healthProbeInit.liveness_probe;
                    switch(true){
                        case !!l.httpGet: l.type = 'httpGet'; break;
                        case !!l.tcpSocket: l.type = 'tcpSocket'; break;
                        case !!l.exec: l.type = 'exec'; break;
                    }
                }
                if(ctn.readinessProbe){
                    healthProbeInit.readiness_probe = ctn.readinessProbe;
                    let l = healthProbeInit.readiness_probe;
                    switch(true){
                        case !!l.httpGet: l.type = 'httpGet'; break;
                        case !!l.tcpSocket: l.type = 'tcpSocket'; break;
                        case !!l.exec: l.type = 'exec'; break;
                    }
                }
                
                // 生命周期
                let lifecycle = ctn?.lifecycle;
                if(!lifecycle){
                    form.post_start = [];
                    form.pre_stop = [];
                }else{
                    let sarr = lifecycle?.postStart?.exec?.command || [];
                    let earr = lifecycle?.preStop?.exec?.command || [];
                    form.post_start = sarr.length? sarr : [];
                    form.pre_stop = earr.length? earr : [];
                }
                // 特级容器
                form.privileged = ctn?.securityContext?.privileged || false;
                
                // 挂载文件用户
                form.fsGroup = ctn?.securityContext?.fsGroup || '';
                // 容器权限细化
                form.capabilities_add = ctn?.securityContext?.capabilities?.add || [];
                form.capabilities_drop = ctn?.securityContext?.capabilities?.drop || [];

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
                imagePS.map(i=>{
                    let find = this.mirrorOptions.find(mo=>mo.value==i.name);
                    let l = find?.label + '/' + find?.namespace;
                    if(l==ctn.image || ctn.image.startsWith(l+'/')){
                        imagePullSecrets = i.name;
                    }
                })

                form = {
                    ...form,
                    name: containers.name,
                    cpu: cpu,
                    cpuDw: cpuDw,
                    memory: memory,
                    memoryDw: memoryDw,
                    headless: this.data?.metadata?.annotations?.['w7.cc/create-headless-svc'] == 'true',
                    ports: ports,
                    env: env,
                    image: ctn?.image,
                    healthProbeInit: healthProbeInit,
                    imagePullPolicy: ctn?.imagePullPolicy,
                    volumeMounts: volumeMounts,
                    
                    command: ctn?.command || [],
                    args: ctn?.args || [],
                    imagePullSecrets: imagePullSecrets,
                    isInitContainers: containers.isInitContainers,

                    // 启动用户
                    runAsNonRoot: ctn?.securityContext?.runAsNonRoot || false,
                    allowPrivilegeEscalation: ctn?.securityContext?.allowPrivilegeEscalation || false,
                    runAsUser: ctn?.securityContext?.runAsUser || '',
                    runAsGroup: ctn?.securityContext?.runAsGroup || '',
                }
                
                ctnForms.push(form);
            })
            this.ctnForms = ctnForms;

            this.form = {
                ...this.form,
                name: this.data?.metadata?.name,
                title: this.data?.metadata?.annotations?.title || "",
                icon: this.data?.metadata?.annotations?.['w7.cc/icon'] || "",
                headless: this.data?.metadata?.annotations?.['w7.cc/create-headless-svc'] == 'true',
                numberReady: this?.data?.status?.numberReady,
                replicas: this?.data?.spec?.replicas,
                // serviceAccountName: this?.data?.spec?.template?.spec?.serviceAccountName,

            }

            let spec = this?.data?.spec?.template?.spec;
            // 更新
            let update = this.getDataUpdate(this.data);
            this.form.update = update;
            // 容忍度
            this.tlrt = Boolean(spec?.tolerations?.find(i=>i.key=='node.kubernetes.io/unschedulable'));
            // 节点调度
            let affinity = this?.data?.spec?.template?.spec?.affinity;
            this.form.affinity = affinity?.nodeAffinity?.requiredDuringSchedulingIgnoredDuringExecution?.nodeSelectorTerms[0]?.matchExpressions || [];
            this.form.affinity = this.form.affinity.map(i=>{
                let values = i.values || [];
                if(Array.isArray(values)){ values = values.join(','); }
                return {
                    key: i.key,
                    values: values,
                }
            })

        },
        getSans(){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/serviceaccounts").then(res=>{
                this.sans = res.data.items.map(v=>({
                    label: v.metadata.name,
                    value: v.metadata.name
                }));
            })
        },
        onekeyCopy(text){
            var textarea = document.createElement('textarea');
            document.body.appendChild(textarea);
            textarea.style.position = 'fixed';
            textarea.style.clip = 'rect(0 0 0 0)';
            textarea.style.top = '10px';
            textarea.value = text;
            textarea.select();
            let copy = document.execCommand('copy', true);
            document.body.removeChild(textarea);
            if(copy){
                this.$message.success("复制成功");
            }else{
                this.$message.warning('复制失败，请手动复制');
            }
        },
        // 修改副本数
        // handleChange(callback){
        //     if(this.editReplicas == this.form.replicas){
        //         this.changeReplicasEdit = false;
        //         return;
        //     }
        //     this.disabled = true;
            
        //     k8sproxy.patch("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.$route.params.kind +"/"+this.$route.params.id,{spec:{replicas: this.editReplicas}},{
        //         headers: {'Content-Type': 'application/strategic-merge-patch+json'}
        //     }).then(res=>{
        //         this.disabled = false;
        //         this.changeReplicasEdit = false;
        //         this.form.replicas = this.editReplicas;
        //         this.$message.success("修改成功");
        //         callback && callback();
        //     }).finally(()=>{this.disabled = false;})
        // },
    },
}
</script>

<style scoped>
.form-title{padding:20px 0; font-size:18px; font-weight:500;}
.back{ height:50px; padding:0 20px; line-height:50px; background:#fff; box-shadow:0 0 10px rgba(0,0,0,0.1); }
.health-collapse .commend + .commend{margin-top:5px;}
</style>
<style>
#mirror_select_box .arco-select-option-content{display:block; width:100%;}
#mirror_select_box .arco-select-option-content .custom-label{white-space: pre-wrap; word-break: break-all; }
.health-collapse .arco-form-item{margin-bottom:10px;}
.health-collapse .arco-form-item-wrapper-col{min-height:0;}
.health-collapse .arco-form-item-label-col,
.health-collapse .arco-form-item-content{line-height:18px; min-height:18px;}
</style>