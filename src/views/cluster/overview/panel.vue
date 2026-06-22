<template>
    <div class="com-container">
        <div class="df">
            <div class="bg-white padding-20 fc">
                <div class="df jc-b ai-s">
                    <div class="df ai-c">
                        <div class="title fs-16">概览</div>
                        <div></div>
                    </div>
                    
                    <a-button v-if="webshell=='true'" :href="webshelllink" target="_blank" type="outline" size="small" >
                        <template #icon>
                            <icon-code-square />
                        </template>
                        <span>集群终端</span>
                    </a-button>
                </div>
                <div class="mt-20 df df-ww">
                    <div class="fc df ai-c top-item">
                        <div class="iconbox df ai-c jc-c df-s0">
                            <svg width="24" height="24" style="color:var(--color-text-2);" viewBox="0 0 48 48" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M32 9a8 8 0 10-10 7.748V23H10a3 3 0 00-3 3v6.29a7 7 0 104.001 0L11 27h26v5.29a7 7 0 104.001 0L41 26a3 3 0 00-3-3H26v-6.252c3.45-.888 6-4.02 6-7.748zm4 30a3 3 0 116 0 3 3 0 01-6 0zM9 36a3 3 0 100 6 3 3 0 000-6zM20 9a4 4 0 118 0 4 4 0 01-8 0z" fill="currentColor"/></svg>
                        </div>
                        <div class="df df-c ai-c">
                            <div>节点</div>
                            <div class="mt-20">
                                <span class="num">{{info.pods}}</span>
                                <span class="ml-4">个</span>
                            </div>
                        </div>
                    </div>
                    <div class="fc df ai-c top-item">
                        <div class="iconbox df ai-c jc-c df-s0">
                            <svg width="24" height="24" style="color:var(--color-text-2);" viewBox="0 0 48 48" fill="currentColor"><path d="M34.431 39.77l-9.251 4.87a1.825 1.825 0 01-1.18.39 1.825 1.825 0 01-1.18-.39l-9.252-4.87c-2.36-1.242-.496-4.782 1.864-3.54 2.36 1.242.496 4.782-1.864 3.54l-9.5-5c-2.36-1.242-.496-4.782 1.864-3.54l9.5 5L24 40.74l8.569-4.51c2.36-1.242 4.222 2.298 1.862 3.54l-1.862-3.54 1.862 3.54zm-20.862 0l1.862-3.54-1.862 3.54zm20.862-9l-9.251 4.87a1.825 1.825 0 01-1.18.39 1.825 1.825 0 01-1.18-.39l-9.252-4.87c-2.36-1.242-.496-4.782 1.864-3.54 2.36 1.242.496 4.782-1.864 3.54l-9.5-5c-2.36-1.242-.496-4.782 1.864-3.54l9.5 5L24 31.74l8.569-4.51c2.36-1.242 4.222 2.298 1.862 3.54l-1.862-3.54 1.862 3.54zm-20.862 0l1.862-3.54-1.862 3.54zm19-3.54l9.5-5c2.36-1.242 4.222 2.298 1.862 3.54l-9.5 5c-2.36 1.242-4.222-2.298-1.862-3.54zm0 9l9.5-5c2.36-1.242 4.222 2.298 1.862 3.54l-9.5 5c-2.36 1.242-4.222-2.298-1.862-3.54zM24.957 3.522l19.433 10.6a1 1 0 010 1.756l-19.433 10.6a2 2 0 01-1.916 0L3.61 15.877a1 1 0 010-1.756l19.433-10.6a2 2 0 011.916 0zM10.353 15L24 22.444 37.647 15 24 7.556 10.353 15z" fill="currentColor"/></svg>
                        </div>
                        <div class="df df-c ai-c">
                            <div>应用</div>
                            <div class="mt-20">
                                <span class="num">{{info.deployments}}</span>
                                <span class="ml-4">个</span>
                            </div>
                        </div>
                    </div>
                    <!-- <div class="fc df df-c ai-c">
                        <div>计划任务</div>
                        <div class="mt-20 num">{{info.cronjobs}}</div>
                    </div> -->
                    <div class="fc df ai-c top-item">
                        <div class="iconbox df ai-c jc-c df-s0">
                            <svg width="24" height="24" style="color:var(--color-text-2);" viewBox="0 0 48 48" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M45 16C41.8 7.805 33.828 2 24.5 2S7.2 7.805 4 16h4.371C11.316 10.073 17.433 6 24.5 6c7.068 0 13.184 4.073 16.13 10H45zM6.128 18.5l1.382 4.89 1.499-4.89h3.014l1.446 4.862 1.347-4.862h4.578l1.386 4.893 1.5-4.893h3.013l1.446 4.862 1.347-4.862h5.21l1.385 4.893 1.5-4.893h3.014l1.446 4.862 1.346-4.862h3.694l-3.446 11h-3.207l-1.408-4.717-1.519 4.717h-3.137l-2.321-7.357-2.31 7.357h-3.207l-1.407-4.717-1.52 4.717h-3.136l-2.008-6.356-1.992 6.356h-3.207l-1.408-4.717L8.93 29.5H5.792l-3.474-11h3.81zM8.372 32c2.945 5.927 9.06 10 16.128 10 7.067 0 13.183-4.073 16.129-10h4.37C41.8 40.196 33.828 46 24.5 46 15.172 46 7.2 40.195 4 32h4.372z" fill="currentColor"/></svg>
                        </div>
                        <div class="df df-c ai-c">
                            <div>域名地址</div>
                            <div class="mt-20">
                                <span class="num">{{info.ingresses}}</span>
                                <span class="ml-4">个</span>
                            </div>
                        </div>
                    </div>
                    <div class="fc df ai-c top-item">
                        <div class="iconbox df ai-c jc-c df-s0">
                            <svg width="24" height="24" style="color:var(--color-text-2);" viewBox="0 0 48 48" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M45 25a1 1 0 011 1v16a1 1 0 01-1 1H23a1 1 0 01-1-1V26a1 1 0 011-1h22zM28 6c9.62 0 17.477 7.546 17.975 17.042h-4.007C41.475 15.757 35.41 10 28 10a14.007 14.007 0 00-13.312 9.65l-.673 2.06-2.094.562A8.005 8.005 0 006 30a8 8 0 008 8h4.999v4H14C7.373 42 2 36.627 2 30c0-5.55 3.768-10.22 8.886-11.592C13.238 11.205 20.01 6 28 6zm14 23H26v10h16V29zm-9 3v4h-4v-4h4zm7 0v4h-4v-4h4z" fill="currentColor"/></svg>
                        </div>
                        <div class="df df-c ai-c">
                            <div>存储分区</div>
                            <div class="mt-20">
                                <span class="num">{{info.zones}}</span>
                                <span class="ml-4">个</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-white padding-20 ml-20" style="width:400px;">
                <div class="df ai-s jc-b">
                    <div class="title fs-16">系统信息</div>
                    <div class="df ai-c">
                        <a-button :href="'/order-base?expand=true'+cvmInfo.expandQuery" target="_blank" v-if="!inMicro&&((userInfo['w7.cc/is-cvm-req']=='true'&&cvmInfo.canExpandBuy && !cvmInfo.isExpired)||(userInfo['w7.cc/user-mode']=='cluster'&&userInfo['w7.cc/can-expand']=='true'))" size="small" type="primary">扩容</a-button>
                        <!-- <a-button size="small" type="primary" @click="submitExpand">扩容</a-button> -->
                    </div>
                </div>
                <a-form v-if="userInfo['w7.cc/user-mode']=='cluster' || userInfo['w7.cc/is-cvm-req']=='true'" :model="quotsInfo" class="mt-20" label-align="left" auto-label-width>
                    <a-form-item label="CPU" style="margin-bottom:0;">
                        <span class="c-00-6">{{quotsInfo.cpu}}</span>
                    </a-form-item>
                    <a-form-item label="内存" style="margin-bottom:0;">
                        <span class="c-00-6">{{quotsInfo.memory}}</span>
                    </a-form-item>
                    <a-form-item label="带宽" style="margin-bottom:0;">
                        <span class="c-00-6">{{quotsInfo.bandwidth}}</span>
                    </a-form-item>
                    <!-- <a-form-item label="存储设备" style="margin-bottom:0;">
                        <span class="c-00-6">{{quotsInfo.storageclass}}</span>
                    </a-form-item> -->
                    <a-form-item label="存储大小" style="margin-bottom:0;">
                        <span class="c-00-6">{{quotsInfo.storagesize}}</span>
                        <!-- <span v-if="userInfo['w7.cc/user-mode']=='cluster'&&userInfo['w7.cc/can-expand']=='true'" class="c-blue cursor ml-20" @click="expand.show=true;">扩容</span> -->
                    </a-form-item>
                    <a-form-item v-if="quotsInfo.expiretime" label="到期时间" style="margin-bottom:0;">
                        <span class="c-00-6">{{quotsInfo.expiretime}}</span>
                        <a v-if="!inMicro&&((userInfo['w7.cc/is-cvm-req']=='true'&&cvmInfo.canRenewBuy)||(userInfo['w7.cc/user-mode']=='cluster'&&userInfo['w7.cc/can-renew']=='true'))" class="c-blue cursor ml-20" target="_blank" :href="'/order-base?renew=true'+cvmInfo.renewQuery">续费</a>                    </a-form-item>
                </a-form>
                <a-form v-else :model="info" class="mt-20" label-align="left" auto-label-width>
                    <a-form-item label="集群版本" style="margin-bottom:0;">
                        <span class="c-00-6">{{info.gitVersion}}</span>
                    </a-form-item>
                    <!-- <a-form-item label="Service CIDR" style="margin-bottom:0;">
                        <span class="c-00-6">{{info.serciceCIDR}}</span>
                    </a-form-item>
                    <a-form-item label="Pod CIDR" style="margin-bottom:0;">
                        <span class="c-00-6">{{info.podCIDR}}</span>
                    </a-form-item> -->
                    <a-form-item label="创建时间" style="margin-bottom:0;">
                        <span class="c-00-6">{{info.creationTimestamp}}</span>
                    </a-form-item>
                    <!-- <a-form-item label="集群token" style="margin-bottom:0;">
                        <div v-if="k3s_token" class="c-00-6 mt-4" style="word-break:break-all;">{{k3s_token}}</div>
                        <span v-else class="c-blue cursor" @click="getToken()">点击查看</span>
                    </a-form-item> -->
                    <a-form-item label="集群地址" style="margin-bottom:0;">
                        <div v-if="domain.domain" class="mr-20">{{domain.domain}}</div>
                        <span class="c-blue cursor" @click="bindDomain">{{domain.domain?'修改域名':'绑定域名'}}</span>
                    </a-form-item>
                    <a-form-item label="集群模式" style="margin-bottom:0;">
                        <div v-if="!config.edit || config.type!=1" class="mr-10">{{config.titles[config.type] || ''}}</div>
                        <div v-else class="mr-10">
                            <a-select v-model="config.editType" size="mini">
                                <a-option :value="1" label="单机（内嵌sqlite）"></a-option>
                                <a-option :value="2" label="高可用（内嵌etcd）"></a-option>
                                <a-option :value="3" label="高可用（外部数据库）"></a-option>
                                <!-- <a-option :value="4" label="共享集群(虚拟)"></a-option>
                                <a-option :value="5" label="独享集群（虚拟）"></a-option> -->
                            </a-select>
                        </div>
                        <a-button v-if="config.edit" size="mini" type="primary" @click="configEdit">确定</a-button>
                        <span v-else-if="config.type==1" class="c-blue cursor" @click="config.edit=true;">修改</span>
                    </a-form-item>
                    
                </a-form>
            </div>
        </div>
        <div class="bg-white padding-20 mt-20">
            <div class="title fs-16">状态</div>
            <div class="mt-10 df df-ww cercil-panel">
                <div class="item df jc-s fc">
                    <div class="df df-c ai-c">
                        <!-- <a-progress type="circle" :percent="info.cpuPercent" size="large" status="normal" class="big-a-progress" :animation="true" stroke-width="6" /> -->
                        <!-- <div class="mt-20">CPU：（{{info.usedCpu}} / {{info.cpu}}）核</div> -->
                        <div class="chartbox">
                            <div id="panelchart1" style="width:150px; height:150px;"></div>
                            <div class="percent c-99 df ai-c jc-c">{{info.cpuPercent}}%</div>
                        </div>
                        <div class="mt-20">CPU分配率</div>
                    </div>
                    <div class="ml-10 df ai-c" style="height:160px;">
                        <table class="chart-table"><tbody>
                            <tr>
                                <td class="txt-r c-99">已分配</td>
                                <td>{{info.usedCpu}} 核</td>
                            </tr>
                            <tr>
                                <td class="txt-r c-99">总量</td>
                                <td>{{info.cpu}} 核</td>
                            </tr>
                        </tbody></table>
                    </div>
                </div>
                <div class="item df jc-s fc">
                    <div class="df df-c ai-c">
                        <!-- <a-progress type="circle" :percent="info.memoryPercent" size="large" status="normal" class="big-a-progress" :animation="true" stroke-width="6" /> -->
                        <!-- <div class="mt-20">内存：（{{info.usedMemory}} / {{info.memory}}）G</div> -->
                        <div class="chartbox">
                            <div id="panelchart2" style="width:150px; height:150px;"></div>
                            <div class="percent c-99 df ai-c jc-c">{{info.memoryPercent}}%</div>
                        </div>
                        <div class="mt-20">内存分配率</div>
                    </div>
                    <div class="ml-10 df ai-c" style="height:160px;">
                        <table class="chart-table"><tbody>
                            <tr>
                                <td class="txt-r c-99">已分配</td>
                                <td>{{info.usedMemory}} Gi</td>
                            </tr>
                            <tr>
                                <td class="txt-r c-99">总量</td>
                                <td>{{info.memory}} Gi</td>
                            </tr>
                        </tbody></table>
                    </div>
                </div>
                <div class="item df jc-s fc">
                    <div class="df df-c ai-c">
                        <!-- <a-progress type="circle" :percent="info.fsPercent" size="large" status="normal" class="big-a-progress" :animation="true" stroke-width="6" /> -->
                        <!-- <div class="mt-20">硬盘：（{{info.usedFs}} / {{info.fs}}）G</div> -->
                        <div class="chartbox">
                            <div id="panelchart3" style="width:150px; height:150px;"></div>
                            <div class="percent c-99 df ai-c jc-c">{{info.fsPercent}}%</div>
                        </div>
                        <div class="mt-20">硬盘分配率</div>
                    </div>
                    <div class="ml-10 df ai-c" style="height:160px;">
                        <table class="chart-table"><tbody>
                            <tr>
                                <td class="txt-r c-99">已分配</td>
                                <td>{{info.usedFs}} Gi</td>
                            </tr>
                            <tr>
                                <td class="txt-r c-99">总量</td>
                                <td>{{info.fs}} Gi</td>
                            </tr>
                        </tbody></table>
                    </div>
                </div>
                <div v-if="gpuIsOpen" class="item df jc-s fc">
                    <div class="df df-c ai-c">
                        <div class="chartbox">
                            <div id="gpuusedchart" style="width:150px; height:150px;"></div>
                            <div class="percent c-99 df ai-c jc-c">{{info.gpuActive}}%</div>
                        </div>
                        <div class="mt-20">GPU分配率</div>
                    </div>
                    <div class="ml-10 df ai-c" style="height:160px;">
                        <table class="chart-table"><tbody>
                            <tr>
                                <td class="c-99"><i class="point point1"></i>vGPU</td>
                                <td>{{info.vGPU}} / {{info.vGPUall}} 个</td>
                            </tr>
                            <tr>
                                <td class="c-99"><i class="point point2"></i>算力</td>
                                <td>{{info.gpuDc}} %</td>
                            </tr>
                            <tr>
                                <td class="c-99"><i class="point point3"></i>显存</td>
                                <td>{{info.gpuDm}} / {{info.gpuDmAll}} MB</td>
                            </tr>
                        </tbody></table>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="metricsState.canShowClusterMetrics" class="mt-20 bg-white padding-20">
            <div class="df ai-c jc-b">
                <div class="title fs-16">集群监控</div>
                <div>
                    <a-button v-if="metricsState.needInstallMetricsInDashboard" type="primary" @click="$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/w7panel_metrics')">安装监控</a-button>
                    <div v-else class="df ai-c">
                        <a-range-picker
                            showTime
                            style="width: 400px;"
                            shortcuts-position="right"
                            v-model:model-value="clusterMonitor.pickerValue"
                            :shortcuts="rangeShortcuts"
                            @ok="rangePicker"
                        />
                        <span class="ml-20">时间颗粒度</span>
                        <a-select v-model="clusterMonitor.step" style="margin-left:10px;width:120px;">
                            <a-option :value="15">15秒</a-option>
                            <a-option :value="60">1分钟</a-option>
                            <a-option :value="600">10分钟</a-option>
                            <a-option :value="3600">1小时</a-option>
                            <a-option :value="10800">3小时</a-option>
                            <a-option :value="43200">12小时</a-option>
                        </a-select>
                    </div>
                </div>
            </div>
            <div class="mt-20" >
                <a-tabs v-model:active-key="tabActive">
                    <a-tab-pane :key="1" title="CPU使用">
                        <ol-charts :metricsServices="metricsServices" v-if="tabActive==1&&chartReady" :step="clusterMonitor.step" :pickerValue="clusterMonitor.pickerValue" :list="nodelist" activeType="cpu"></ol-charts>
                    </a-tab-pane>
                    <a-tab-pane :key="2" title="内存使用">
                        <ol-charts :metricsServices="metricsServices" v-if="tabActive==2&&chartReady" :step="clusterMonitor.step" :pickerValue="clusterMonitor.pickerValue" :list="nodelist" activeType="memory"></ol-charts>
                    </a-tab-pane>
                    <a-tab-pane v-if="gpuIsOpen" :key="3" title="GPU显存使用">
                        <ol-charts :metricsServices="metricsServices" v-if="tabActive==3&&chartReady" :step="clusterMonitor.step" :pickerValue="clusterMonitor.pickerValue" activeType="HostGPUMemoryUsage"></ol-charts>
                    </a-tab-pane>
                    <a-tab-pane v-if="gpuIsOpen" :key="4" title="GPU算力使用率">
                        <ol-charts :metricsServices="metricsServices" v-if="tabActive==4&&chartReady" :step="clusterMonitor.step" :pickerValue="clusterMonitor.pickerValue" activeType="HostCoreUtilization"></ol-charts>
                    </a-tab-pane>
                </a-tabs>
            </div>
        </div>
        
        <div v-if="metricsState.canShowNodeMetrics" class="mt-20 bg-white padding-20">
            <div class="df ai-c jc-b">
                <div class="title fs-16">主机指标</div>
                <div>
                    <a-button v-if="noMonitor" type="primary" @click="$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/w7panel_metrics')">安装监控</a-button>
                    <div v-else class="df ai-c">
                        <a-range-picker
                            showTime
                            style="width: 400px;"
                            shortcuts-position="right"
                            v-model:model-value="hostMonitor.pickerValue"
                            :shortcuts="rangeShortcuts"
                            @ok="v=>hostMonitor.pickerValue=v"
                        />
                        <span class="ml-20">时间颗粒度</span>
                        <a-select v-model="hostMonitor.step" style="margin-left:10px;width:120px;">
                            <a-option :value="15">15秒</a-option>
                            <a-option :value="60">1分钟</a-option>
                            <a-option :value="600">10分钟</a-option>
                            <a-option :value="3600">1小时</a-option>
                            <a-option :value="10800">3小时</a-option>
                            <a-option :value="43200">12小时</a-option>
                        </a-select>
                    </div>
                </div>
            </div>
            <div class="mt-20" >
                <a-tabs v-model:active-key="chartActive">
                    <a-tab-pane :key="1" title="负载">
                    </a-tab-pane>
                    <a-tab-pane :key="2" title="硬盘I/O">
                    </a-tab-pane>
                    <a-tab-pane :key="3" title="网络I/O">
                    </a-tab-pane>
                    <a-tab-pane :key="4" title="硬盘读写">
                    </a-tab-pane>
                    <a-tab-pane :key="5" title="网络流量">
                    </a-tab-pane>
                </a-tabs>
                <a-button-group v-if="chartActive!=1" type="outline">
                    <a-button v-for="item in nodelist" :key="item.name" :type="chartNodeActive==item.name?'primary':'outline'" @click="chartNodeActive=item.name">{{item.name}}</a-button>
                </a-button-group>
                <div v-if="!noMonitor" class="mt-20">
                    <ol-charts :metricsServices="metricsServices" v-if="chartActive==1&&chartNodeActive" :step="hostMonitor.step" :pickerValue="hostMonitor.pickerValue" :list="nodelist" activeType="load"></ol-charts>
                    <div v-if="chartActive==2&&chartNodeActive" class="df">
                        <ol-charts :metricsServices="metricsServices" :node="chartNodeActive" v-if="chartReady" :virtualDiskFilterCache="virtualDiskFilterCache" :step="hostMonitor.step" :pickerValue="hostMonitor.pickerValue" activeType="disk-read" class="fc"></ol-charts>
                        <ol-charts :metricsServices="metricsServices" :node="chartNodeActive" v-if="chartReady" :virtualDiskFilterCache="virtualDiskFilterCache" :step="hostMonitor.step" :pickerValue="hostMonitor.pickerValue" activeType="disk-write" class="ml-20 fc"></ol-charts>
                    </div>
                    <div v-if="chartActive==3&&chartNodeActive" class="df">
                        <ol-charts :metricsServices="metricsServices" :node="chartNodeActive" v-if="chartReady" :virtualDiskFilterCache="virtualDiskFilterCache" :step="hostMonitor.step" :pickerValue="hostMonitor.pickerValue" activeType="network-in" class="fc"></ol-charts>
                        <ol-charts :metricsServices="metricsServices" :node="chartNodeActive" v-if="chartReady" :virtualDiskFilterCache="virtualDiskFilterCache" :step="hostMonitor.step" :pickerValue="hostMonitor.pickerValue" activeType="network-out" class="ml-20 fc"></ol-charts>
                    </div>
                    <div v-if="chartActive==4&&chartNodeActive" class="df">
                        <ol-charts :metricsServices="metricsServices" :node="chartNodeActive" v-if="chartReady" :virtualDiskFilterCache="virtualDiskFilterCache" :step="hostMonitor.step" :pickerValue="hostMonitor.pickerValue" activeType="disk-read-bytes" class="fc"></ol-charts>
                        <ol-charts :metricsServices="metricsServices" :node="chartNodeActive" v-if="chartReady" :virtualDiskFilterCache="virtualDiskFilterCache" :step="hostMonitor.step" :pickerValue="hostMonitor.pickerValue" activeType="disk-written-bytes" class="ml-20 fc"></ol-charts>
                    </div>
                    <div v-if="chartActive==5&&chartNodeActive" class="df">
                        <ol-charts :metricsServices="metricsServices" :node="chartNodeActive" v-if="chartReady" :virtualDiskFilterCache="virtualDiskFilterCache" :step="hostMonitor.step" :pickerValue="hostMonitor.pickerValue" activeType="network-receive-bytes" class="fc"></ol-charts>
                        <ol-charts :metricsServices="metricsServices" :node="chartNodeActive" v-if="chartReady" :virtualDiskFilterCache="virtualDiskFilterCache" :step="hostMonitor.step" :pickerValue="hostMonitor.pickerValue" activeType="network-transmit-bytes" class="ml-20 fc"></ol-charts>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="metricsState.needInstallMetricsInDashboard" class="mt-20 bg-white padding-20 df df-c jc-c" style="height:200px;">
            <a-empty>
                <span>暂无数据，安装面板统计后，可收集CPU、内存、负载等多种指标的监控数据，<span class="cursor c-blue" @click="$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/w7panel_metrics')">安装面板统计</span></span>
            </a-empty>
        </div>

        <!-- 添加修改域名 -->
        <a-drawer :width="700" :visible="domainForm.show" @ok="submitDomainForm" @cancel="domainForm.show=false;" unmountOnClose :popup-container="$popupContainer">
            <template #title>{{domainForm.title}}</template>
            <a-form :model="domainForm" ref="domainForm" :rules="rules" validate-trigger="blur" auto-label-width class="padding-20" >
                <!-- <a-form-item v-if="!domainForm.name" label="应用" field="app">
                    <a-select v-model="domainForm.app" @change="v=>{domainForm.port='';domainForm.appPorts=appPorts[v];}" placeholder="请选择应用">
                        <a-option v-for="i in applist" :key="i.name" :label="i.title" :value="i.name"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item v-show="!domainForm.ingressclass||ingressclassList.length>1" label="ingressClass" field="ingressclass">
                    <a-select v-model="domainForm.ingressclass" placeholder="请选择ingressClass">
                        <a-option v-for="i in ingressclassList" :key="i" :label="i" :value="i"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item v-if="!domainForm.name" label="选择端口" field="port">
                    <a-select v-model="domainForm.port" placeholder="请选择端口">
                        <a-option v-for="i in domainForm.appPorts" :key="i" :label="i" :value="i"></a-option>
                    </a-select>
                </a-form-item> -->
                <a-form-item label="域名" field="domain">
                    <div class="fc df df-c">
                        <a-input v-model="domainForm.domain" placeholder="请输入域名" size="large" :spellcheck="false" >
                            <template #prepend>{{domainForm.auto_ssl?'https://':'http://'}}</template>
                            <template v-if="whiteList && whiteList.length" #append>
                                <a-select v-model="domainForm.whiteDomain">
                                    <a-option v-for="(wd,wdid) in whiteList" :key="wdid" :label="'.'+wd.domain" :value="wdid"></a-option>
                                </a-select>
                            </template>
                        </a-input>
                        <a-checkbox v-model="domainForm.auto_ssl" class="mt-16">自动SSL证书</a-checkbox>
                    </div>
                </a-form-item>
            </a-form>
        </a-drawer>

        <a-drawer :width="700" :visible="config.dialog" @ok="setConfigtype3" @cancel="config.dialog=false;config.edit=false;" unmountOnClose :popup-container="$popupContainer">
            <template #title>数据库</template>
            <a-form :model="config.form" ref="configdb" :rules="dbrules" auto-label-width >
                <a-form-item label="数据库类型">
                    <a-select v-model="config.form.type" size="large" @change="computedDsn">
                        <a-option label="mysql" value="mysql" />
                        <a-option label="postgres" value="postgres" />
                    </a-select>
                </a-form-item>
                <a-form-item label="地址" field="path">
                    <a-input v-model="config.form.path" :spellcheck="false" size="large" @input="computedDsn" @change="computedDsn"/>
                </a-form-item>
                <a-form-item label="端口" field="port">
                    <a-input v-model="config.form.port" type="number" size="large" @input="computedDsn" @change="computedDsn"/>
                </a-form-item>
                <a-form-item label="用户名" field="uname">
                    <a-input v-model="config.form.uname" size="large" @input="computedDsn" @change="computedDsn"/>
                </a-form-item>
                <a-form-item label="用户密码" field="upwd">
                    <a-input v-model="config.form.upwd" size="large" @input="computedDsn" @change="computedDsn"/>
                </a-form-item>
                <a-form-item label="数据库名" field="db">
                    <a-input v-model="config.form.db" size="large" @input="computedDsn" @change="computedDsn"/>
                </a-form-item>
                <a-form-item label="DSN" field="dsn">
                    <a-input v-model="config.form.dsn" :spellcheck="false" size="large" />
                </a-form-item>
            </a-form>
        </a-drawer>

        <a-modal v-model:visible="haWarn" title="提示" @ok="haSelect(true)" @cancel="haSelect(false)">
            <template #title></template>
            <div>切换高可用模式后，允许注册多个master节点，但切换过程不可逆，是否继续？</div>
        </a-modal>
        <a-modal :width="1000" title="支付" @cancel="payDrawer.show=false;" :visible="payDrawer.show" :footer="false" :mask-closable="false" class="pay-modal">
            <iframe :src="payDrawer.url" frameborder="0" style="width:100%;height:660px;"></iframe>
        </a-modal>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';

import { useNamespaceStore, useLoadingStore } from "@/store";

import olCharts from "./ol-charts.vue";
import { initChart } from '@/utils/echarts'
import { markRaw } from 'vue'
import { useDarkStore } from '@/store'
import dayjs from 'dayjs'
import { getToken } from '@/utils/auth';
import { getWebshell } from '@/utils/auth';
import { getMetricsServiceByVersion, DEFAULT_METRICS_SERVICE, LEGACY_METRICS_SERVICE } from '@/utils/metrics-service';

export default {
    data(){
        return {
            namespaceActive: '',
            nodelist: [],
            tabActive: 1,
            chartActive: 1,
            chartNodeActive: '',
            dark: useDarkStore(),
            chartInstances: {},

            info: {
                creationTimestamp: '',
                cpu: 0,
                memory: 0,
                usedCpu: 0,
                usedMemory: 0,
                cpuPercent: 0,
                memoryPercent: 0,
                fs: 0,
                usedFs: 0,
                fsPercent: 0,
                gitVersion: '',
                serciceCIDR: '',
                podCIDR: '',
                
                deployments: 0,
                cronjobs: 0,
                pods: 0,
                zones: 0,
            },
            whiteList: [],

            k3s_token: '',

            domain: {
                appname: '',
                name: '',
                domain: '',
                auto_ssl: '',
                groupName: '',
            },
            domainForm: {
                show: false,
                title: '绑定域名',
                app: '',
                port: '',
                domain: '',
                auto_ssl: false,
                ingressclass: '',
            },
            ingressclassList: [],
            applist: [],
            appPorts: {},
            dataList: [],
            
            rules: {
                app: [{ required: true, message: '请选择应用'}],
                ingressclass: [{ required: true, message: '请选择ingressClass'}],
                domain: [{ required: true, message: '请输入域名'}],
                port: [{ required: true, message: '请选择端口'}],
            },
            dbrules: {
                path: [{ required: true, message: '请输入地址'}],
                port: [{ required: true, message: '请输入端口'}],
                uname: [{ required: true, message: '请输入用户名'}],
                upwd: [{ required: true, message: '请输入密码'}],
                db: [{ required: true, message: '请输入数据库名'}],
                dsn: [{ required: true, message: '请输入'}],
            },

            config: {
                edit: false,
                type: 0,
                editType: 0,
                titles: ['','单机（内嵌sqlite）','高可用（内嵌etcd）','高可用（外部数据库）'],
                dialog: false,
                form: {
                    type: 'mysql',
                    path: '',
                    port: '',
                    uname: '',
                    upwd: '',
                    db: '',
                    dsn: '',
                },
            },
            haWarn: false,
            gpuIsOpen: false,

            userInfo: {},
            clusterMode: '',
            chartReady: true,
            noMonitor: true,
            quotsInfo: {},
            chartData: {},

            expand: {
                show: false,
                nativeCpu: 0,
                nativeMemory: 0,
                nativeStorage: 0,
                nativeBandwidth: 0,
                cpu: '',
                memory: '',
                storage: '',
                bandwidth: '',
            },
            expandRules: {
                cpu: [{ required: true, message: '请输入CPU'}],
                memory: [{ required: true, message: '请输入内存'}],
                storage: [{ required: true, message: '请输入存储'}],
                bandwidth: [{ required: true, message: '请输入带宽'}],
            },
            payDrawer: {
                show: false,
                ticket: '',
                url: '',
            },
            
            rangeShortcuts: [{
                label: '5分钟',
                value: () => [dayjs().subtract(5, 'minute'), dayjs()],
            },{
                label: '30分钟',
                value: () => [dayjs().subtract(30, 'minute'), dayjs()],
            },{
                label: '1小时',
                value: () => [dayjs().subtract(1, 'hour'), dayjs()],
            },{
                label: '3小时',
                value: () => [dayjs().subtract(3, 'hour'), dayjs()],
            },{
                label: '12小时',
                value: () => [dayjs().subtract(12, 'hour'), dayjs()],
            },{
                label: '24小时',
                value: () => [dayjs().subtract(24, 'hour'), dayjs()],
            },{
                label: '2天',
                value: () => [dayjs().subtract(2, 'day'), dayjs()],
            },{
                label: '7天',
                value: () => [dayjs().subtract(7, 'day'), dayjs()],
            },{
                label: '30天',
                value: () => [dayjs().subtract(30, 'day'), dayjs()],
            },{
                label: '今天',
                value: () => [dayjs(dayjs().format('YYYY-MM-DD') + ' 00:00:00'), dayjs()],
            },{
                label: '昨天',
                value: () => [dayjs(dayjs().format('YYYY-MM-DD') + ' 00:00:00').subtract(1, 'day'), dayjs(dayjs().format('YYYY-MM-DD') + ' 00:00:00')],
            }],

            clusterMonitor:{
                pickerValue: [],
                step: 15,
            },
            hostMonitor: {
                pickerValue: [],
                step: 15,
            },

            metricsState: {},

            maxBandwidth: 1000,

            webshell: 'false',

            virtualDiskFilterCache: [],

            cvmInfo: {
                renewQuery: '',
                expandQuery: '',
            },
            oldVersion: false,
            metricsServices: DEFAULT_METRICS_SERVICE,
        }
    },
    async created(){
        this.namespaceActive = useNamespaceStore().namespace;
        
        await this.initInfo();

        // await panelApi.get('/helm/releases/w7panel-metrics',{noAlert:true}).then(res=>{
        //     this.noMonitor = false;

        //     this.clusterMonitor.pickerValue = [
        //         dayjs().subtract(1, 'hour'),
        //         dayjs(),
        //     ]
        //     if(this.clusterMode!='virtual' && this.clusterMode!='shared'){
        //         this.hostMonitor.pickerValue = [
        //             dayjs().subtract(1, 'hour'),
        //             dayjs(),
        //         ]
        //     }
        // }).catch(()=>{
        //     this.noMonitor = true;
        // })
        await k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/default/appgroups/w7panel-metrics',{noAlert:true}).then(res=>{
            this.noMonitor = false;
            
            this.clusterMonitor.pickerValue = [
                dayjs().subtract(1, 'hour'),
                dayjs(),
            ]
            if(this.clusterMode!='virtual' && this.clusterMode!='shared'){
                this.hostMonitor.pickerValue = [
                    dayjs().subtract(1, 'hour'),
                    dayjs(),
                ]
            }
            this.metricsServices = getMetricsServiceByVersion(res?.data?.spec?.version || '');
            if(this.metricsServices === LEGACY_METRICS_SERVICE){
                this.oldVersion = true;
            }
        }).catch(()=>{
            this.noMonitor = true;
        })

        await panelApi.get('/metrics/state').then(async res=>{
            this.metricsState = res.data;
            if(this.metricsState?.canShowNodeMetrics){

                this.virtualDiskFilterCache = await k8sproxy.get('/api/v1/namespaces/default/services/'+ this.metricsServices +'/proxy/prometheus/api/v1/query_range',{
                    params: {
                        query: '(node_disk_info{model="VIRTUAL-DISK"})'
                    }
                }).then(res=>{
                    return res?.data?.data?.result?.map(i=>i.metric?.device) || [];
                }).catch(()=>[]);
            }
        })

        // await panelApi.get('/metrics/installed').then(res=>{
        //     this.chartReady = true;
        //     this.noMonitor = !res?.data?.installed;
        // });
        this.getDomain();
        this.getConfig();

        panelApi.get('/k3k/overselling/current-resource').then(res=>{
            this.maxBandwidth = res?.data?.bandwidth;
        }).catch(()=>{})

        this.webshell = getWebshell();
        let webshelllink = '';
        if(window?.__POWERED_BY_WUJIE__){
            let token = getToken();
            webshelllink = window?.microApp?.getData()?.originUrl || '';
            webshelllink = webshelllink.replace(/\/$/,'') + '/fp/webshell?api_token=' + token;
        }else{
            webshelllink = '/fp/webshell';
        }
        this.webshelllink = webshelllink;
    },
    mounted(){
        this.mounted = true;
        this.getInfo();
        window.addEventListener('message', this.paySuccess);
    },
    beforeUnmount(){
        window.removeEventListener('message', this.paySuccess);
        Object.values(this.chartInstances).forEach(chart => {
            chart?.dispose();
        });
        this.chartInstances = {};
    },
    components: {
        olCharts,
    },
    computed:{
    },
    watch:{
        'dark.isDark'(){
            this.$nextTick(()=>{
                Object.keys(this.chartInstances).forEach(dom => {
                    const chart = this.chartInstances[dom];
                    if(!chart) return;
                    const list = this.chartData[dom];
                    if(!list) return;
                    chart.setOption(this.buildChartOption(dom, list));
                });
            });
        }
    },
    methods: {
        buildChartOption(dom, list) {
            const ring = dom === 'gpuusedchart' ? 3 : 1;
            return {
                polar: {
                    radius:[60-(15*(ring-1)),'100%']
                },
                angleAxis: {
                    max: 100,
                    startAngle: 90,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: { show: false },
                    splitLine: { show: false },
                },
                radiusAxis: {
                    type: 'category',
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: { show: false },
                },
                series: list.map((i,index)=>{
                    let color = index%2==1?(this.dark.isDark?'rgba(255, 255, 255, 0.12)':'rgb(229, 230, 235)'):['#165dff','#00b42a','#ff9a2e'][index/2];
                    return {
                        type: 'bar',
                        name: i.name,
                        stack: i.stack,
                        data: [i.value],
                        coordinateSystem: 'polar',
                        itemStyle: {
                            color: color,
                            cursor: 'default'
                        },
                        emphasis: {
                            itemStyle: {
                                color: color,
                                cursor: 'default'
                            }
                        },
                        barWidth: 10,
                        barGap: 0.5,
                    }
                }),
            };
        },
        createMarks({start,end,step}){
            const ticks = {};
            let current = start;
            
            while (current <= end) {
                ticks[current] = current;
                current += step;
            }
            return ticks;
        },
        rangePicker(v){
            this.clusterMonitor.pickerValue = v;
        },
        paySuccess(e){
            if(e?.data?.type!='paysuccess'){return}
            this.payDrawer.show = false;
        },
        submitExpand(){
            this.$router.push(`/order-base?expand=true`);
        },
        initInfo(){
            return panelApi.get('/k3k/info').then(res=>{
                this.userInfo = res?.data;
                this.clusterMode = this.userInfo?.["k3k.io/cluster-mode"];

                if(res?.data?.['w7.cc/is-cvm-req']=='true'){
                    let name = res?.data?.['w7.cc/cvm-name'];
                    let namespace = res?.data?.['w7.cc/cvm-namespace'];
                    panelApi.get(`/k3k/cvm/v1/${namespace}/info/${name}`).then(res=>{
                        let effectiveResource = res?.data?.status?.effectiveResource;
                        this.quotsInfo = {
                            cpu: (effectiveResource?.cpu || 0) + ' 核',
                            memory: (effectiveResource?.memory || 0) + 'Gi',
                            bandwidth: (effectiveResource?.bandwidth || 0) + 'Mbps',
                            storagesize: (effectiveResource?.storage || 0) + 'Gi',
                            expiretime: res.data?.spec?.expireTime || '永久',
                            storageclass: res.data?.spec?.storageClassName || '',
                        }
                        this.cvmInfo = {
                            ...this.cvmInfo,
                            canExpandBuy: res?.data?.status?.canExpandBuy,
                            isExpired: res?.data?.status?.isExpired,
                            canRenewBuy: res?.data?.status?.canRenewBuy,
                        };
                        if(res?.data?.status?.canExpandBuy && !res?.data?.status?.isExpired){
                            this.cvmInfo.expandQuery = `&cvmName=${name}&cvmNamespace=${namespace}`;
                        }
                        if(res?.data?.status?.canRenewBuy){
                            this.cvmInfo.renewQuery = `&cvmName=${name}&cvmNamespace=${namespace}`;
                        }
                    });
                    return;
                }

                if(this.userInfo?.['w7.cc/user-mode']!='cluster'){return}
                let data = this.userInfo?.['w7.cc/quota-limit'] || '{}';
                data = JSON.parse(data);
                this.quotsInfo = {
                    cpu: data?.hard?.cpu + ' 核',
                    memory: String(data?.hard?.memory).replace(/[a-zA-Z]+$/,'') + 'Gi',
                    bandwidth: String(data?.hard?.bandwidth).replace(/[a-zA-Z]+$/,'') + 'Mbps',
                    storagesize: String(data?.hard?.['requests.storage']).replace(/[a-zA-Z]+$/,'') + 'Gi',
                    expiretime: this.userInfo?.['w7.cc/expiretime'] || '永久',
                    storageclass: data?.storageclass,
                }
            })
        },
        haSelect(boo){
            if(boo){
                if(this.config.editType==3){
                    this.config.dialog = true;
                    this.config.form = {
                        type: 'mysql',
                        path: '',
                        port: '',
                        uname: '',
                        upwd: '',
                        db: '',
                        dsn: '',
                    };
                }
                if(this.config.editType==2){
                    k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/k3sconfigs/k3s.config',{
                        metadata: {labels:{'data-hash': String(Date.now())}},
                        spec: {data: {'k3s.cluster-init':"true"}}
                    },{
                        headers: {'Content-Type': 'application/merge-patch+json'},
                    }).then(res=>{
                        this.$message.success('操作成功');
                        this.config.type = this.config.editType;
                        this.config.edit = false;
                        this.getConfig();
                    })
                }
            }else{
                this.config.editType = this.config.type;
            }
            this.haWarn = false;
        },
        computedDsn(){
            let f = this.config.form;
            let params = {
                'mysql': 'charset=utf8mb4',
                'postgres': 'sslmode=disable',
            }[f.type];
            this.config.form.dsn = `${f.type}://${f.uname}:${f.upwd}@${f.path}:${f.port}/${f.db}?${params}`;
        },
        setConfigtype3(){
            this.$refs.configdb.validate(err=>{
                if(err){return}
                k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/k3sconfigs/k3s.config',{
                    metadata: {labels:{'data-hash': String(Date.now())}},
                    spec: {data: {'k3s.datastore-endpoint': this.config.form.dsn}}
                },{
                    headers: {'Content-Type': 'application/merge-patch+json'},
                }).then(res=>{
                    this.$message.success('操作成功');
                    this.config.type = this.config.editType;
                    this.config.edit = false;
                    this.config.dialog = false;
                    this.getConfig();
                })
            })
        },
        configEdit(){
            if(this.config.editType==1){ this.config.edit = false; return}
            
            this.haWarn = true;
        },
        getConfig(){
            // config
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/k3sconfigs/k3s.config').then(res=>{
                // console.log(res.data);
                let data = res?.data || {};
                if(data.spec?.data?.['k3s.cluster-init']==='false' && data.spec?.data?.['k3s.datastore-endpoint']===''){
                    this.config.type = this.config.editType = 1;
                }else if(data.spec?.data?.['k3s.cluster-init']==='true'){
                    this.config.type = this.config.editType = 2;
                }else if(data.spec?.data?.['k3s.datastore-endpoint']!==''){
                    this.config.type = this.config.editType = 3;
                }
            })
        },
        submitDomainForm(){
            this.$refs.domainForm.validate(async (err) => {
                if (err) {return;}
                let fullDomain = this.domainForm.domain;
                if(this.whiteList?.length){
                    fullDomain = /\.$/.test(fullDomain)? fullDomain : (fullDomain + '.');
                    fullDomain = fullDomain + this.whiteList?.[this.domainForm.whiteDomain]?.domain;
                }
                if(this.domainForm.name){
                    let data = this.dataList.find(i=>i.metadata.name==this.domainForm.name)
                    if(!data){return}
                    data = JSON.parse(JSON.stringify(data))

                    data.spec.rules[0].host = fullDomain;
                    delete data.metadata.creationTimestamp;
                    
                    if(this.domainForm.port && data?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number){
                        this.domainForm.port && (data.spec.rules[0].http.paths[0].backend.service.port.number = Number(this.domainForm.port));
                        this.domainForm.app && (data.spec.rules[0].http.paths[0].backend.service.name = this.domainForm.app);
                    }
                    if(this.domainForm.path && data?.spec?.rules?.[0]?.http?.paths?.[0]){
                        data.spec.rules[0].http.paths[0].path = '/' + this.domainForm.path.replace(/^\//,'');
                    }
                    if(this.domainForm.auto_ssl){
                        data.metadata.annotations['cert-manager.io/cluster-issuer'] = 'w7-letsencrypt-prod';
                        data.metadata.annotations['cert-manager.io/renew-before'] = '30m';
                        data.spec.tls = [{
                            hosts: [fullDomain],
                            secretName: data.metadata.name + "-tls-secret"
                        }]
                    }else{
                        delete data.metadata.annotations['cert-manager.io/cluster-issuer'];
                        delete data.metadata.annotations['cert-manager.io/renew-before'];
                        // delete data.spec.tls;
                    }
                    if(this.domainForm.ingressclass){
                        data.metadata.annotations['kubernetes.io/ingress.class'] = this.inRvproxy? 'higress' : (this.domainForm?.ingressclass || 'higress');
                    }
                    // 修改默认域名
                    if(this.domainForm.is_default){
                        let domain = (this.domainForm.auto_ssl?'https://':'http://') + fullDomain;
                        let containers = this.data?.spec?.template?.spec?.containers || [];
                        let env = containers?.[0]?.env || [];
                        let find = env.find(i=>i.name=='DOMAIN_URL');
                        let obj = {}
                        if(domain && find){
                            find.value = domain;
                            obj.spec = {
                                template: {
                                    spec: {
                                        containers: containers,
                                    },
                                },
                            }
                        }
                        try{ 
                            await k8sproxy.patch("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/deployments/"+this.domain.appname, obj, {
                                headers: {'Content-Type': 'application/strategic-merge-patch+json'}
                            });
                        }catch(e){}
                    }
                    return k8sproxy.put("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+this.domainForm.name, data, {loading:true}).then(async res=>{
                        // 修改子目录 域名 ssl
                        let list = this.dataList.filter(i=>i?.metadata?.labels?.parents==res.data.metadata.name)
                        if(list.length){
                            useLoadingStore().setLoading(true);
                            await Promise.all(list.map(i=>{
                                let data = JSON.parse(JSON.stringify(i))
                                
                                data.spec.rules[0].host = fullDomain;
                                delete data.metadata.creationTimestamp;
    
                                if(this.domainForm.auto_ssl){
                                    data.metadata.annotations['cert-manager.io/cluster-issuer'] = 'w7-letsencrypt-prod';
                                    data.metadata.annotations['cert-manager.io/renew-before'] = '30m';
                                    data.spec.tls = [{
                                        hosts: [fullDomain],
                                        secretName: data.metadata.name + "-tls-secret"
                                    }]
                                }else{
                                    delete data.metadata.annotations['cert-manager.io/cluster-issuer'];
                                    delete data.metadata.annotations['cert-manager.io/renew-before'];
                                    // delete data.spec.tls;
                                }
    
                                return k8sproxy.put("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+data.metadata.name, data);
                            }))
                            useLoadingStore().setLoading(false);
                        }

                        await this.updateGroupDomain();

                        this.domainForm.show = false;
                        this.$message.success("修改成功");
                        this.getDomain();
                    })
                } else {
                    let backend = {
                        "resource": {
                            "apiGroup": "networking.higress.io",
                            "kind": "McpBridge",
                            "name": "default"
                        }
                    };
                    if(this.domainForm.app && this.domainForm.port){
                        backend = {
                            service: {
                                name: this.domainForm.app,
                                port: {number: Number(this.domainForm.port)},
                            }
                        }
                    }
                    let data = {
                        apiVersion: 'networking.k8s.io/v1',
                        kind: 'Ingress',
                        metadata: {
                            name: 'ing-'+this.createName(),
                            namespace: this.namespaceActive,
                            annotations: {
                                'kubernetes.io/ingress.class': this.domainForm?.ingressclass || 'higress',
                                'higress.io/resource-definer': 'higress',
                            },
                            labels: {
                                'higress.io/resource-definer': 'higress',
                                app: this.domain.appname,
                                group: this.domain.groupName,
                            },
                        },
                        spec: {
                            rules: [
                                {
                                    host: fullDomain,
                                    http: {
                                        paths: [
                                            {
                                                path: this.domainForm.path? ('/'+this.domainForm.path.replace(/^\//,'')) : '/',
                                                pathType: 'Prefix',
                                                backend: backend,
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }
                    if(this.domainForm.auto_ssl){
                        data.metadata.annotations['cert-manager.io/cluster-issuer'] = 'w7-letsencrypt-prod';
                        data.metadata.annotations['cert-manager.io/renew-before'] = '30m';
                        data.metadata.annotations['higress.io/ssl-redirect'] = 'true';
                        data.spec.tls = [{
                            hosts: [fullDomain],
                            secretName: data.metadata.name + "-tls-secret"
                        }]
                    }
                    
                    return k8sproxy.post("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses", data).then(async res=>{
                        await this.updateGroupDomain();
                        this.domainForm.show = false;
                        this.$message.success("创建成功");
                        this.getDomain();
                    })
                }
            });
        },
        updateGroupDomain(){
            let search = 'group=' + this.domain.groupName;
            return k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+ this.namespaceActive +'/ingresses?labelSelector='+search, {loading:true}).then(res=>{
                let data = res?.data?.items || [];
                let arr = data.map(i=>{
                    let is_auto_ssl = i?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';
                    let d = i.spec.rules[0];
                    let host = d.host;
                    let path = d.http.paths[0].path;
                    return (is_auto_ssl?'https://':'http://') + host + (path=='/'?'':path);
                })
                // 修改group
                return k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.domain.groupName,
                    {metadata: { annotations: {'w7.cc/domains': JSON.stringify(arr)}}},
                    {headers: {'Content-Type': 'application/merge-patch+json'}},
                );
            });
        },
        bindDomain(){
            // this.appPorts = {};
            // k8sproxy.get('/apis/networking.k8s.io/v1/ingressclasses', {loading:true}).then(res=>{
            //     this.ingressclassList = res?.data?.items?.map(i=>i.metadata.name) || [];
            // }).then(()=>{
            //     return k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/deployments/"+this.domain.appname, {loading:true}).then(res=>{
            //         let data = res?.data || {};
            //         this.appPorts[this.domain.appname] = data?.spec?.template?.spec?.containers?.[0]?.ports?.map(i=>String(i.containerPort)) || [];
            //         this.applist = [{
            //             name: this.domain.appname,
            //             title: res?.data?.metadata?.annotations?.title || this.domain.appname,
            //         }]
            //     })
            // }).then(()=>{
            //     // 子应用
            //     return k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/deployments?labelSelector=parent="+this.domain.appname , {loading:true});
            // }).then(res=>{
            //     let list = res?.data?.items || [];
            //     list = list.map(i=>{
            //         this.appPorts[i.metadata.name] = i?.spec?.template?.spec?.containers?.[0]?.ports?.map(i=>String(i.containerPort)) || [];
            //         return {
            //             name: i.metadata?.name,
            //             title: i.metadata?.annotations?.title || i.metadata?.name,
            //         };
            //     })
            //     this.applist = this.applist.concat(list);
            // }).then(res=>{
            
                let domain = this.domain.domain;
                let whiteDomain = 0;

                if(domain && this.whiteList?.length){
                    let whitelist = this.whiteList.map(i=>i.domain);
                    const parts = domain.split('.').reverse();
                    const n = parts.length;
                    for (let i = 0; i < n; i++) {
                        const suffix = parts.slice(0, i + 1).reverse().join('.');
                        const index = whitelist.indexOf(suffix);
                        if (index !== -1) {
                            whiteDomain = index;
                            domain = domain.replace(new RegExp(whitelist[index]+'$'),'');
                            domain = domain.replace(/\.$/,'');
                        }
                    }
                }

                this.domainForm = {
                    show: true,
                    title: this.domain.domain? '修改域名' : '绑定域名',
                    name: this.domain.name,
                    app: this.domain.appname,
                    appPorts: [],
                    port: '8000',
                    domain: domain || '',
                    whiteDomain: whiteDomain,
                    auto_ssl: this.domain.auto_ssl || false,
                    ingressclass: this.domain.ingressclass || this.ingressclassList[0],
                };
            // })
        },
        getDomain(){
            panelApi.get('/app-info').then(res=>{
                let appname = res?.data?.deploymentName;
                if(!appname){return}
                this.domain.appname = appname;
                this.domain.groupName = res?.data?.helmReleaseName;
                return k8sproxy.get(`/apis/networking.k8s.io/v1/namespaces/${this.namespaceActive}/ingresses?labelSelector=app=${appname}`)
            }).then(res=>{
                if(!res?.data){return}
                let data = res?.data?.items || [];
                this.dataList = JSON.parse(JSON.stringify(data));
                
                let list = data?.filter(i=>{
                    if(!i?.metadata?.labels?.parents){return true;}
                    let find = data.find(p=>p.metadata.name==i.metadata.labels.parents);
                    if(!find){return true;}
                    return false;
                })?.map(i=>{
                    let is_auto_ssl = i?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';
                    return {
                        ingressclass: i.metadata.annotations?.['kubernetes.io/ingress.class'],
                        domain: i?.spec?.rules?.[0]?.host,
                        name: i?.metadata?.name,
                        auto_ssl: is_auto_ssl,
                    }
                });

                this.domain.domain = list?.[0]?.domain;
                this.domain.name = list?.[0]?.name;
                this.domain.ingressclass = list?.[0]?.ingressclass;
                this.domain.auto_ssl = list?.[0]?.auto_ssl;
            }).then(()=>{
                let wl = this.userInfo['w7.cc/domain-white-list'] || '[]';
                wl = JSON.parse(wl);
                if(wl.length){
                    this.whiteList = wl?.filter(i=>!i.disabled);
                    return;
                }
                
                // k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/domain-white-list',{noAlert:true}).then(res=>{
                //     let list = [];
                //     try{
                //         list = JSON.parse(res?.data?.data?.whiteList)?.filter(i=>!i.disabled)
                //     }catch{}
                //     this.whiteList = list;
                // })
            });
        },
        // getToken(){
        //     let ip = '';
        //     k8sproxy.get('/api/v1/nodes',{loading:true}).then(res=>{
        //         if(!res?.data){return}
        //         let data = res.data?.items || [];
        //         let find = data.find(item=>item?.metadata?.labels?.['node-role.kubernetes.io/master'] && item.metadata.labels?.['w7.public-ip'])
        //         ip = find.status.addresses[0].address;                
        //         if(!ip){Promise.reject(); return}
        //     }).then(ip=>{
        //         return k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods",{
        //             params:{
        //                 labelSelector: `w7.cc/daemonset=w7`
        //             },
        //             loading:true,
        //         });
        //     }).then(res=>{
        //         let items = res?.data?.items || [];
        //         let find = items.find(i=>{
        //             if(!i?.status?.hostIP){return false}
        //             return i.status.hostIP==ip;
        //         })
        //         return {
        //             pod_name: find?.metadata?.name,
        //             containerName: find?.spec?.containers?.[0]?.name,
        //             namespace: find?.metadata?.namespace,
        //         }
        //     }).then(d=>{
        //         let command = 'nsenter -t 1 --mount --uts --ipc --net --pid -- cat /var/lib/rancher/k3s/server/node-token';
        //         let cmd = command.split(' ');
        //         cmd = cmd.map(i=>('command='+i));
        //         cmd = cmd.join('&');

        //         let params = `podName=${d.pod_name}&containerName=${d.containerName}&tty=false&namespace=${d.namespace}&${cmd}`
        //         return panelApi.get(`/exec?${params}`,{responseType: 'text', loading:true})
        //     }).then(res=>{
        //         this.k3s_token = res?.data || '';
        //     }).catch(()=>{
        //         console.log('获取token失败')
        //     })
        // },
        getInfo(){
            const safePercent = (value, total) => {
                if (!value || !total || total === 0) return 0;
                return (value / total) * 100;
            };
            panelApi.get('/gpu/config').then(res=>{
                let r = res.data;
                this.gpuIsOpen = r.gpuEnabled;
                if(!this.gpuIsOpen){return}
                // gpu使用率图表
                panelApi.get('/gpu/summary').then(res=>{
                    let data = res.data;
                    let ls = [{
                        name: 'vgpu',
                        stack: 'stack1',
                        value: safePercent(data.GPUDeviceSharedNum, data.GPUDeviceSharedTotal),
                    },{
                        name: 'vgpuBg',
                        stack: 'stack1',
                        value: 100 - safePercent(data.GPUDeviceSharedNum, data.GPUDeviceSharedTotal),
                    },{
                        name: '算力',
                        stack: 'stack2',
                        value: safePercent(data.GPUDeviceCoreAllocated, data.GPUDeviceCoreLimit),
                    },{
                        name: '算力Bg',
                        stack: 'stack2',
                        value: 100 - safePercent(data.GPUDeviceCoreAllocated, data.GPUDeviceCoreLimit),
                    },{
                        name: '显存',
                        stack: 'stack3',
                        value: safePercent(data.GPUDeviceMemoryAllocated, data.GPUDeviceMemoryAllocatedTotal),
                    },{
                        name: '显存Bg',
                        stack: 'stack3',
                        value: 100 - safePercent(data.GPUDeviceMemoryAllocated, data.GPUDeviceMemoryAllocatedTotal),
                    }];
                    this.info.vGPU = data.GPUDeviceSharedNum;
                    this.info.vGPUall = data.GPUDeviceSharedTotal;
                    this.info.gpuDc = data.GPUDeviceCoreAllocated;
                    this.info.gpuDm = data.GPUDeviceMemoryAllocated;
                    this.info.gpuDmAll = data.GPUDeviceMemoryAllocatedTotal;
                    this.info.gpuActive = safePercent(data.GPUDeviceSharedNum, data.GPUDeviceSharedTotal).toFixed(2);

                    let chart = this.createChart({
                        dom: 'gpuusedchart',
                        list: ls,
                        ring: 3,
                    });
                    chart?.on('click', (params)=>{
                        this.info.gpuActive = Number(params.componentIndex%2==0?params.value:(100-params.value)).toFixed(2);
                    });
                });
            });
            // 集群版本
            k8sproxy.get('/version',{noAlert:true}).then(res=>{this.info.gitVersion = res?.data?.gitVersion || ''})
            // 创建时间
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/services/kubernetes", {noAlert:true}).then(res=>{
                this.info.creationTimestamp = window.formatDate(res?.data?.metadata?.creationTimestamp);
            });
            // zones
            // k8sproxy.get(`/k8s-proxy/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/volumes`,{
            //     headers: {Accept: 'application/json',},
            // }).then(res => {
            //     let data = res?.data?.data || [];
            //     this.info.zones = data.length;
            // });
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/persistentvolumeclaims',{noAlert:true}).then(res=>{
                let data = res?.data?.items || [];
                this.info.zones = data.length;
            });

            // cpu,memory,硬盘
            k8sproxy.get('/api/v1/nodes',{noAlert:true}).then(async res => {
                if(!res?.data){return}
                let data = res.data;
                let list = data.items || [];
                this.nodelist = list.map(i=>({name:i.metadata.name}));
                this.chartNodeActive = this.nodelist?.[0]?.name;
            });
                
            // if(list.length){
            //     this.info.podCIDR = list[0].spec.podCIDR;
            // }
            // list.map(item=>{
            //     cpu = cpu + Number(item?.status?.allocatable?.cpu || 0);
            //     memory = memory + Number(item?.status?.allocatable?.memory.replace(/[a-zA-z]/g,'') || 0);
            // })
            // let cpu = 0;
            // let memory = 0;
            //     this.info.cpu = cpu;
            //     this.info.memory = Number((memory / 1024 / 1024).toFixed(2));
            //     this.info.fs = 0;
            //     this.info.usedFs = 0;
            //     this.info.fsPercent = 0;
            //     let fs = 0;
            //     let usedFs = 0;
            //     for(let i=0; i<list.length; i++){
            //         await axios.get(`/api/v1/nodes/${list[i].metadata.name}/proxy/stats/summary`).then(res=>{
            //             let d = res?.data?.node?.fs || {};
            //             fs = fs + Number(d.capacityBytes/1024/1024/1024);
            //             usedFs = usedFs +Number(d.usedBytes/1024/1024/1024);
            //         });
            //     }
            //     this.info.fs = Number(fs.toFixed(2)) || 0;
            //     this.info.usedFs = Number(usedFs.toFixed(2)) || 0;
            //     this.info.fsPercent = Number((this.info.usedFs / this.info.fs * 100).toFixed(2));
                
            //     this.createChart({
            //         dom: 'panelchart3',
            //         list: [{
            //             name: 'memory',
            //             stack: 'stack1',
            //             value: this.info.fsPercent,
            //         },{
            //             name: 'memoryBg',
            //             stack: 'stack1',
            //             value: 100 - (this.info.fsPercent),
            //         }],
            //     })
            // }).then(()=>{
            //     return k8sproxy.get('/apis/metrics.k8s.io/v1beta1/nodes',{noAlert:true})
            // }).then(res=>{
            //     let d = res?.data?.items || [];
            //     let usedCpu = 0;
            //     let usedMemory = 0;
            //     d.map(i=>{
            //         usedCpu = usedCpu + (Number(i.usage.cpu.replace(/[a-zA-z]/g,'')) / 1000 / 1000 / 1000);
            //         usedMemory = usedMemory + (Number(i.usage.memory.replace(/[a-zA-z]/g,'')) / 1024 / 1024 );
            //     })

            //     this.info.usedCpu = Number(usedCpu.toFixed(2));
            //     this.info.usedMemory = Number(usedMemory.toFixed(2));
            //     this.info.cpuPercent = Number((usedCpu / this.info.cpu * 100).toFixed(2));
            //     this.info.memoryPercent = Number((usedMemory / this.info.memory * 100).toFixed(2));
                
            //     this.createChart({
            //         dom: 'panelchart1',
            //         list: [{
            //             name: 'cpu',
            //             stack: 'stack1',
            //             value: this.info.cpuPercent,
            //         },{
            //             name: 'cpuBg',
            //             stack: 'stack1',
            //             value: 100 - (this.info.cpuPercent),
            //         }],
            //     })
            //     this.createChart({
            //         dom: 'panelchart2',
            //         list: [{
            //             name: 'memory',
            //             stack: 'stack1',
            //             value: this.info.memoryPercent,
            //         },{
            //             name: 'memoryBg',
            //             stack: 'stack1',
            //             value: 100 - (this.info.memoryPercent),
            //         }],
            //     })
            // });

            panelApi.get('/metrics/usage/normal').then(res=>{
                let data = res.data;

                let cpu = data?.cpu?.total || 0;
                cpu = cpu / 1000;
                cpu = Number(cpu.toFixed(2));

                let usedCpu = data?.cpu?.usage || 0;
                usedCpu = usedCpu / 1000;
                usedCpu = Number(usedCpu.toFixed(2));

                let memory = data?.memory?.total || 0;
                memory = memory / 1024 / 1024 / 1024;
                memory = Number(memory.toFixed(2));

                let usedMemory = data?.memory?.usage || 0;
                usedMemory = usedMemory / 1024 / 1024 / 1024;
                usedMemory = Number(usedMemory.toFixed(2));

                this.info.cpu = cpu;
                this.info.usedCpu = Number(usedCpu.toFixed(2));
                this.info.memory = memory;
                this.info.usedMemory = Number(usedMemory.toFixed(2));
                this.info.cpuPercent = Number((usedCpu / cpu * 100).toFixed(2));
                this.info.memoryPercent = Number((usedMemory / memory * 100).toFixed(2));

                
                this.createChart({
                    dom: 'panelchart1',
                    list: [{
                        name: 'cpu',
                        stack: 'stack1',
                        value: this.info.cpuPercent > 100? 100 : this.info.cpuPercent,
                    },{
                        name: 'cpuBg',
                        stack: 'stack1',
                        value: this.info.cpuPercent < 100? 100 - (this.info.cpuPercent) : 0,
                    }],
                })
                this.createChart({
                    dom: 'panelchart2',
                    list: [{
                        name: 'memory',
                        stack: 'stack1',
                        value: this.info.memoryPercent > 100? 100 : this.info.memoryPercent,
                    },{
                        name: 'memoryBg',
                        stack: 'stack1',
                        value: this.info.memoryPercent < 100? 100 - (this.info.memoryPercent) : 0,
                    }],
                })
            })
            panelApi.get('/metrics/usage/disk').then(res=>{
                let data = res?.data;

                let fs = data?.disk?.total || 0;
                fs = fs / 1024 / 1024 / 1024;
                fs = Number(fs.toFixed(2));

                let usedFs = data?.disk?.usage || 0;
                usedFs = usedFs / 1024 / 1024 / 1024;
                usedFs = Number(usedFs.toFixed(2));
                
                this.info.fs = fs;
                this.info.usedFs = usedFs;
                this.info.fsPercent = Number((usedFs / fs * 100).toFixed(2));;
                this.createChart({
                    dom: 'panelchart3',
                    list: [{
                        name: 'memory',
                        stack: 'stack1',
                        value: this.info.fsPercent > 100? 100 : this.info.fsPercent,
                    },{
                        name: 'memoryBg',
                        stack: 'stack1',
                        value: this.info.fsPercent < 100? 100 - (this.info.fsPercent) : 0,
                    }],
                })
            })

            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups').then(async res=>{
                let list = res?.data?.items || [];
                this.info.deployments = list.length;
            });
            k8sproxy.get('/api/v1/nodes').then(res=>{
                let list = res?.data?.items || [];
                this.info.pods = list.length;
            });
            // 应用，pod
            // k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/deployments",{noAlert:true}).then(async res=>{
            //     let list = res?.data?.items || [];
                
            //     this.info.pods = 0;
            //     for(let i=0; i<list.length; i++){
            //         let item = list[i];

            //         let selector = item?.spec?.selector?.matchLabels || {};
            //         let label = Object.keys(selector).map(key=>`${key}=${selector[key]}`).join(',');
            //         k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods",{
            //             params: {labelSelector: label},
            //             noAlert: true,
            //         }).then(res=>{
            //             let items = res?.data?.items || [];
            //             this.info.pods = this.info.pods + items.length;
            //         });
            //     }
            // })
            // 计划任务
            // k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/cronjobs',{noAlert:true}).then(res=>{
            //     let list = res?.data?.items || [];
            //     this.info.cronjobs = list.length;
            // });
            // 域名
            k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses').then(res=>{
                let list = res?.data?.items || [];
                this.info.ingresses = list.length;
            })
        },
        createChart(c){
            c.ring = c.ring || 1;
            let ls = c.list;
            this.chartData[c.dom] = ls;
            let dom = document.getElementById(c.dom);
            if (!dom) return;
            dom?.removeAttribute("_echarts_instance_");
            let chart = markRaw(initChart(dom));
            if (this.chartInstances[c.dom]) {
                this.chartInstances[c.dom].dispose();
            }
            this.chartInstances[c.dom] = chart;
            chart.setOption(this.buildChartOption(c.dom, ls));
            return chart;
        },
        createName(len){
            len = len || 8;
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
.title{border-left:3px solid rgb(var(--arcoblue-5)); padding-left:10px;}
.num{font-size:24px; font-weight:bold; color:rgb(var(--arcoblue-7));}
.chart-table{border-spacing:0; border:none; border-collapse: collapse;}
.chart-table td{height:20px; padding:4px 6px; border:none; white-space: nowrap;}
.cercil-panel>.item{padding:10px 10px 10px 30px;}
.cercil-panel .w33{width:33.33%; min-width:300px;}
.cercil-panel .w25{width:25%; min-width:300px;}
.cercil-panel .point{display:inline-block;width:24px; height:14px; border-radius:4px; vertical-align:middle;margin-right:6px;}
.cercil-panel .point.point1{background:#165dff;}
.cercil-panel .point.point2{background:#00b42a;}
.cercil-panel .point.point3{background:#ff9a2e;}
.chartbox{width:150px; height:150px; position:relative;}
.chartbox .percent{position:absolute; width:50px; height:50px; border-radius:50%; margin:auto; left:0; top:0; bottom:0; right:0;}

.top-item{margin:10px; border-radius:6px; background:var(--color-neutral-2); padding:20px; white-space:nowrap;}
.top-item .iconbox{width:50px; height:50px; margin-right:30px; border-radius:50%; border:2px solid var(--color-neutral-4); outline:2px solid var(--color-neutral-1); color:var(--color-text-1);}
</style>
<style>
.big-a-progress .arco-progress-circle-wrapper{width:100px!important; height:100px!important;}
</style>
