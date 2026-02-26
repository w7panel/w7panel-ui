<template>
    <a-form :model="form" auto-label-width style="width:800px;">
        <div>
            <div class="df ai-c" style="height:32px;">
                <a-checkbox v-model="show_liveness_probe" @change="changeForm">存活检查</a-checkbox>

                <a-tooltip content="检查容器是否正常，不正常则重启实例">
                    <icon-question-circle-fill class="c-99 fs-16 ml-10 cursor" />
                </a-tooltip>
            </div>
            <div v-if="show_liveness_probe" class="show_readiness_probe">
                <a-form-item label="检查方法" class="mt-12">
                    <a-select v-model="livenessType" @change="probeType('livenessType')" style="width:300px;">
                        <a-option label="HTTP请求检查" value="httpGet"></a-option>
                        <a-option label="执行命令检查" value="exec"></a-option>
                        <a-option label="TCP端口检查" value="tcpSocket"></a-option>
                    </a-select>
                </a-form-item>
                <div v-if="livenessType=='httpGet'">
                    <a-form-item label="检查协议" class="mt-12">
                        <a-select v-model="form.liveness_probe.httpGet.scheme" @change="changeForm" style="width:300px;">
                            <a-option label="HTTP" value="HTTP"></a-option>
                            <a-option label="HTTPS" value="HTTPS"></a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item label="host" class="mt-12">
                        <div>
                            <a-input v-model="form.liveness_probe.httpGet.host" placeholder="默认为Pod IP，一般不需要修改" style="width:300px;" :spellcheck="false" @input="changeForm"></a-input>
                            <div class="lh-1 c-99 fs-14 mt-6">大多数情况下不需要填 host 字段，请谨慎填写防止探测失败，更多请参考<a href="https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#http-probes" target="_blank" class="c-blue cursor">文档</a></div>
                        </div>
                    </a-form-item>
                    <a-form-item label="检查端口" class="mt-12">
                        <div>
                            <a-input v-model="form.liveness_probe.httpGet.port" placeholder="请输入检查端口" :spellcheck="false" style="width:300px;" @input="changeForm"></a-input>
                            <div class="lh-1 c-99 fs-14 mt-6">端口范围： 1~65535，支持使用端口名</div>
                        </div>
                    </a-form-item>
                    <a-form-item label="httpHeader" class="mt-12">
                        <div class="df ai-e">
                            <div>
                                <div v-for="(item,index) in form.liveness_probe.httpGet.httpHeaders" :key="index" class="df ai-c mr-20" style="margin-bottom:10px;">
                                    <a-input v-model="item.name" class="w_180" placeholder="name" :spellcheck="false" @input="changeForm"></a-input>
                                    <a-input v-model="item.value" class="w_180 ml-20" placeholder="value" :spellcheck="false" @input="changeForm"></a-input>
                                    <span class="cursor c-blue ml-20" @click="form.liveness_probe.httpGet.httpHeaders.splice(index,1); changeForm();">删除</span>
                                </div>
                            </div>
                            <span class="c-blue cursor addvarbtn" @click="form.liveness_probe.httpGet.httpHeaders.push({name:'',value:''})">增加变量</span>
                        </div>
                    </a-form-item>
                    <a-form-item label="请求路径" class="mt-12">
                        <a-input v-model="form.liveness_probe.httpGet.path" placeholder="请输入路径" :spellcheck="false" style="width:300px;" @input="changeForm"></a-input>
                    </a-form-item>
                </div>
                <div v-if="livenessType=='exec'">
                    <a-form-item label="执行命令" class="mt-12">
                        <div>
                            <div>
                                <div v-for="(item,index) in form.liveness_probe.exec.command" :key="index" class="df ai-c" style="margin-bottom:10px;">
                                    <a-textarea v-model="form.liveness_probe.exec.command[index]" placeholder="执行命令" style="width:400px;height:62px;" @input="changeForm" :spellcheck="false"/>
                                    <span class="cursor c-blue ml-20" @click="form.liveness_probe.exec.command.splice(index,1); changeForm();">删除</span>
                                </div>
                            </div>
                            <div class="c-blue cursor txt-c" @click="form.liveness_probe.exec.command.push('')">新增</div>
                        </div>
                    </a-form-item>
                </div>
                <div v-if="livenessType=='tcpSocket'">
                    <a-form-item label="host" class="mt-12">
                        <div>
                            <a-input v-model="form.liveness_probe.tcpSocket.host" style="width:300px;" placeholder="默认为Pod IP，一般不需要修改" :spellcheck="false" @input="changeForm"></a-input>
                            <div class="lh-1 c-99 fs-14 mt-6">大多数情况下不需要填 host 字段，请谨慎填写防止探测失败，更多请参考<a href="https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#http-probes" target="_blank" class="c-blue cursor">文档</a></div>
                        </div>
                    </a-form-item>
                    <a-form-item label="检查端口" class="mt-12">
                        <div>
                            <a-input v-model="form.liveness_probe.tcpSocket.port" style="width:300px;" placeholder="请输入检查端口" :spellcheck="false" @input="changeForm"></a-input>
                            <div class="lh-1 c-99 fs-14 mt-6">端口范围： 1~65535，支持使用端口名</div>
                        </div>
                    </a-form-item>
                </div>
                <a-form-item label="启动延时" class="mt-12">
                    <div>
                        <a-input v-model="form.liveness_probe.initialDelaySeconds" style="width:300px;" type="number" @input="changeForm"><template #append>秒</template></a-input>
                        <div class="lh-1 c-99 fs-14 mt-6">启动延时最小值0秒，默认为不设置</div>
                    </div>
                </a-form-item>
                <a-form-item label="响应超时" class="mt-12">
                    <div>
                        <a-input v-model="form.liveness_probe.timeoutSeconds" style="width:300px;" type="number" @input="changeForm"><template #append>秒</template></a-input>
                        <div class="lh-1 c-99 fs-14 mt-6">响应超时最小值1秒，默认为1秒</div>
                    </div>
                </a-form-item>
                <a-form-item label="间隔时间" class="mt-12">
                    <div>
                        <a-input v-model="form.liveness_probe.periodSeconds" style="width:300px;" type="number" @input="changeForm"><template #append>秒</template></a-input>
                        <div class="lh-1 c-99 fs-14 mt-6">间隔时间最小值为1秒，默认为10秒</div>
                    </div>
                </a-form-item>
                <a-form-item label="健康阈值" class="mt-12">
                    <div>
                        <a-input default-value="1" readonly style="width:300px;" type="number" @input="changeForm"><template #append>次</template></a-input>
                        <div class="lh-1 c-99 fs-14 mt-6">健康阈值只能设置为1次</div>
                    </div>
                </a-form-item>
                <a-form-item label="不健康阈值" class="mt-12">
                    <div>
                        <a-input v-model="form.liveness_probe.failureThreshold" style="width:300px;" type="number" @input="changeForm"><template #append>次</template></a-input>
                        <div class="lh-1 c-99 fs-14 mt-6">不健康阈值最小为1次，默认为3次</div>
                    </div>
                </a-form-item>
            </div>
        </div>

        <div>
            <div class="df ai-c" style="height:32px;">
                <a-checkbox v-model="show_readiness_probe" @change="changeForm">就绪检查</a-checkbox>
                
                <a-tooltip content="检查容器是否就绪，不就绪则停止转发流量到当前实例">
                    <icon-question-circle-fill class="c-99 fs-16 ml-10 cursor" />
                </a-tooltip>
            </div>
            <div v-if="show_readiness_probe" class="show_readiness_probe">
                <a-form-item label="检查方法" class="mt-12">
                    <a-select v-model="readinessType" @change="probeType('readinessType')" style="width:300px;">
                        <a-option label="HTTP请求检查" value="httpGet"></a-option>
                        <a-option label="执行命令检查" value="exec"></a-option>
                        <a-option label="TCP端口检查" value="tcpSocket"></a-option>
                    </a-select>
                </a-form-item>
                <div v-if="readinessType=='httpGet'">
                    <a-form-item label="检查协议" class="mt-12">
                        <a-select v-model="form.readiness_probe.httpGet.scheme" @change="changeForm" style="width:300px;">
                            <a-option label="HTTP" value="HTTP"></a-option>
                            <a-option label="HTTPS" value="HTTPS"></a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item label="host" class="mt-12">
                        <div>
                            <a-input v-model="form.readiness_probe.httpGet.host" style="width:300px;" placeholder="默认为Pod IP，一般不需要修改" :spellcheck="false" @input="changeForm"></a-input>
                            <div class="lh-1 c-99 fs-14 mt-6">大多数情况下不需要填 host 字段，请谨慎填写防止探测失败，更多请参考<a href="https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#http-probes" target="_blank" class="c-blue cursor">文档</a></div>
                        </div>
                    </a-form-item>
                    <a-form-item label="检查端口" class="mt-12">
                        <div>
                            <a-input v-model="form.readiness_probe.httpGet.port" :spellcheck="false" style="width:300px;" placeholder="请输入检查端口" @input="changeForm"></a-input>
                            <div class="lh-1 c-99 fs-14 mt-6">端口范围： 1~65535，支持使用端口名</div>
                        </div>
                    </a-form-item>
                    <a-form-item label="httpHeader" class="mt-12">
                        <div class="df ai-e">
                            <div>
                                <div v-for="(item,index) in form.readiness_probe.httpGet.httpHeaders" :key="index" class="df ai-c mr-20" style="margin-bottom:10px;">
                                    <a-input v-model="item.name" class="w_180" placeholder="name" :spellcheck="false" @input="changeForm"></a-input>
                                    <a-input v-model="item.value" class="w_180 ml-20" placeholder="value" :spellcheck="false" @input="changeForm"></a-input>
                                    <span class="cursor c-blue ml-20" @click="form.readiness_probe.httpGet.httpHeaders.splice(index,1); changeForm();">删除</span>
                                </div>
                            </div>
                            <span class="c-blue cursor addvarbtn" @click="form.readiness_probe.httpGet.httpHeaders.push({name:'',value:''})">增加变量</span>
                        </div>
                    </a-form-item>
                    <a-form-item label="请求路径" class="mt-12">
                        <a-input v-model="form.readiness_probe.httpGet.path" placeholder="请输入路径" style="width:300px;" @input="changeForm"></a-input>
                    </a-form-item>
                </div>
                <div v-if="readinessType=='exec'">
                    <a-form-item label="执行命令" class="mt-12">
                        <div>
                            <div>
                                <div v-for="(item,index) in form.readiness_probe.exec.command" :key="index" class="df ai-c" style="margin-bottom:10px;">
                                    <a-textarea v-model="form.readiness_probe.exec.command[index]" placeholder="执行命令" style="width:400px;height:62px;" @input="changeForm" :spellcheck="false"/>
                                    <span class="cursor c-blue ml-20" @click="form.readiness_probe.exec.command.splice(index,1); changeForm();">删除</span>
                                </div>
                            </div>
                            <div class="c-blue cursor txt-c" @click="form.readiness_probe.exec.command.push('')">新增</div>
                        </div>
                    </a-form-item>
                </div>
                <div v-if="readinessType=='tcpSocket'">
                    <a-form-item label="host" class="mt-12">
                        <div>
                            <a-input v-model="form.readiness_probe.tcpSocket.host" placeholder="默认为Pod IP，一般不需要修改" style="width:300px;" :spellcheck="false" @input="changeForm"></a-input>                        
                            <div class="lh-1 c-99 fs-14 mt-6">大多数情况下不需要填 host 字段，请谨慎填写防止探测失败，更多请参考<a href="https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#http-probes" target="_blank" class="c-blue cursor">文档</a></div>
                        </div>
                    </a-form-item>
                    <a-form-item label="检查端口" class="mt-12">
                        <div>
                            <a-input v-model="form.readiness_probe.tcpSocket.port" placeholder="请输入检查端口" style="width:300px;" :spellcheck="false" @input="changeForm"></a-input>                        
                            <div class="lh-1 c-99 fs-14 mt-6">端口范围： 1~65535，支持使用端口名</div>
                        </div>
                    </a-form-item>
                </div>
                <a-form-item label="启动延时" class="mt-12">
                    <div>
                        <a-input v-model="form.readiness_probe.initialDelaySeconds" style="width:300px;" type="number" @input="changeForm"><template #append>秒</template></a-input>
                        <div class="lh-1 c-99 fs-14 mt-6">启动延时最小值0秒，默认为不设置</div>
                    </div>
                </a-form-item>
                <a-form-item label="响应超时" class="mt-12">
                    <div>
                        <a-input v-model="form.readiness_probe.timeoutSeconds" style="width:300px;" type="number" @input="changeForm"><template #append>秒</template></a-input>
                        <div class="lh-1 c-99 fs-14 mt-6">响应超时最小值1秒，默认为1秒</div>
                    </div>
                </a-form-item>
                <a-form-item label="间隔时间" class="mt-12">
                    <div>
                        <a-input v-model="form.readiness_probe.periodSeconds" style="width:300px;" type="number" @input="changeForm"><template #append>秒</template></a-input>
                        <div class="lh-1 c-99 fs-14 mt-6">间隔时间最小值为1秒，默认为10秒</div>
                    </div>
                </a-form-item>
                <a-form-item label="健康阈值" class="mt-12">
                    <div>
                        <a-input default-value="1" readonly style="width:300px;" type="number" @input="changeForm"><template #append>次</template></a-input>
                        <div class="lh-1 c-99 fs-14 mt-6">健康阈值只能设置为1次</div>
                    </div>
                </a-form-item>
                <a-form-item label="不健康阈值" class="mt-12">
                    <div>
                        <a-input v-model="form.readiness_probe.failureThreshold" style="width:300px;" type="number" @input="changeForm"><template #append>次</template></a-input>
                        <div class="lh-1 c-99 fs-14 mt-6">不健康阈值最小为1次，默认为3次</div>
                    </div>
                </a-form-item>
            </div>
        </div>
    </a-form>
</template>

<script>
export default {
    props: ['data'],
    data(){
        return {
            form: {
                // 存活检测
                liveness_probe: {
                    initialDelaySeconds: 0,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    failureThreshold: 3,
                    successThershold: 1,
                },
                // 就绪检测
                readiness_probe: {
                    initialDelaySeconds: 0,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    failureThreshold: 3,
                    successThershold: 1,
                },
            },
            show_liveness_probe: false, //存活检查
            show_readiness_probe: false, // 就绪检查
            livenessType: 'httpGet', // 检查类型
            readinessType: 'httpGet', // 检查类型
        }
    },
    created(){
        this.probeType('livenessType');
        this.probeType('readinessType');
        if(this.data){ this.init(this.data); }
    },
    watch: {
        data(){ this.init(this.data); }
    },
    methods: {
        init(data){
            // console.log(data.liveness_probe)
            let l = data?.liveness_probe || {};
            let r = data?.readiness_probe || {};
            if(l && Object.keys(l).length){
                this.show_liveness_probe = true;
                switch(true){
                    case !!l.httpGet: this.livenessType = 'httpGet'; this.form.liveness_probe.httpGet = l.httpGet; break;
                    case !!l.tcpSocket: this.livenessType = 'tcpSocket'; this.form.liveness_probe.tcpSocket = l.tcpSocket; break;
                    case !!l.exec: this.livenessType = 'exec'; this.form.liveness_probe.exec = l.exec; break;
                }
            } else {
                this.show_liveness_probe = false;
            }
            if(r && Object.keys(r).length){
                this.show_readiness_probe = true;
                switch(true){
                    case !!r.httpGet: this.readinessType = 'httpGet'; this.form.readiness_probe.httpGet = r.httpGet; break;
                    case !!r.tcpSocket: this.readinessType = 'tcpSocket'; this.form.readiness_probe.tcpSocket = r.tcpSocket; break;
                    case !!r.exec: this.readinessType = 'exec'; this.form.readiness_probe.exec = r.exec; break;
                }
            } else {
                this.readiness_probe = false;
            }
            
            this.form.liveness_probe.failureThreshold = l.failureThreshold || 3;
            this.form.liveness_probe.initialDelaySeconds = l.initialDelaySeconds || 0;
            this.form.liveness_probe.periodSeconds = l.periodSeconds || 10;
            this.form.liveness_probe.timeoutSeconds = l.timeoutSeconds || 1;
            
            this.form.readiness_probe.failureThreshold = r.failureThreshold || 3;
            this.form.readiness_probe.initialDelaySeconds = r.initialDelaySeconds || 0;
            this.form.readiness_probe.periodSeconds = r.periodSeconds || 10;
            this.form.readiness_probe.timeoutSeconds = r.timeoutSeconds || 1;

            if(this.livenessType=='httpGet' && !this.form.liveness_probe.httpGet?.httpHeaders?.length){
                this.form.liveness_probe.httpGet.httpHeaders = [];
            }
            if(this.readinessType=='httpGet' && !this.form.readiness_probe.httpGet?.httpHeaders?.length){
                this.form.readiness_probe.httpGet.httpHeaders = [];
            }

            this.changeForm();
        },
        changeForm(){
            this.editType();
            this.$emit('returnData',{
                liveness_probe: this.show_liveness_probe? this.form.liveness_probe : null,
                readiness_probe: this.show_readiness_probe? this.form.readiness_probe : null,
            });
        },
        editType(){
            if(this.form.liveness_probe){
                let lp = this.form.liveness_probe;
                lp.initialDelaySeconds = Number(lp.initialDelaySeconds);
                lp.timeoutSeconds = Number(lp.timeoutSeconds);
                lp.periodSeconds = Number(lp.periodSeconds);
                lp.failureThreshold = Number(lp.failureThreshold);
                lp.successThershold = Number(lp.successThershold);
                if(lp?.httpGet?.port){
                    lp.httpGet.port = /^\d+$/.test(String(lp.httpGet.port))? Number(lp.httpGet.port) : lp.httpGet.port;
                }
                if(lp?.tcpSocket?.port){
                    lp.tcpSocket.port = /^\d+$/.test(String(lp.tcpSocket.port))? Number(lp.tcpSocket.port) : lp.tcpSocket.port;
                }
            }
            if(this.form.readiness_probe){
                let rp = this.form.readiness_probe;
                rp.initialDelaySeconds = Number(rp.initialDelaySeconds);
                rp.timeoutSeconds = Number(rp.timeoutSeconds);
                rp.periodSeconds = Number(rp.periodSeconds);
                rp.failureThreshold = Number(rp.failureThreshold);
                rp.successThershold = Number(rp.successThershold);
                if(rp?.httpGet?.port){
                    rp.httpGet.port = /^\d+$/.test(String(rp.httpGet.port))? Number(rp.httpGet.port) : rp.httpGet.port;
                }
                if(rp?.tcpSocket?.port){
                    rp.tcpSocket.port = /^\d+$/.test(String(rp.tcpSocket.port))? Number(rp.tcpSocket.port) : rp.tcpSocket.port;
                }
            }
        },
        // 切换检查类型
        probeType(check){
            let obj = {
                httpGet: {
                    httpHeaders: [],
                    path: '/',
                    port: 80,
                    host: '',
                    scheme: 'HTTP',
                },
                exec: {
                    command: [''],
                },
                tcpSocket: {
                    host: '',
                    port: '80',
                },
            };
            if(check == 'livenessType'){
                delete this.form.liveness_probe.httpGet;
                delete this.form.liveness_probe.exec;
                delete this.form.liveness_probe.tcpSocket;
                this.form.liveness_probe[ this.livenessType ] = obj[this.livenessType];
            } else {
                delete this.form.readiness_probe.httpGet;
                delete this.form.readiness_probe.exec;
                delete this.form.readiness_probe.tcpSocket;
                this.form.readiness_probe[ this.readinessType ] = obj[this.readinessType];
            }
            this.changeForm();
        },
    },
}
</script>

<style scoped>
.w_180{width:180px;}
.show_readiness_probe{margin-bottom:10px; padding:20px; border:1px solid var(--color-border-1); background:var(--color-fill-1);}
.addvarbtn{display:inline-block;height:32px;line-height:32px;margin-bottom:10px;}
</style>