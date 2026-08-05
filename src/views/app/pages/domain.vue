<template>
    <div>
        <div class="padding-20">
            <div v-if="domainCard && domainCard.length" class="df df-ww" style="margin-bottom:20px;">
                <a-card v-for="(item,index) in domainCard" :title="item.name" :key="index" class="topcard">
                    <template #extra>
                        <a-button type="text" size="small" @click="openFormCard({config_name:item.name})">
                            <template #icon><icon-plus /></template>
                            <span>添加域名</span>
                        </a-button>
                    </template>
                    <div class="listbox">
                        <div v-for="i in item.list" :key="i.ins_name" class="item df ai-c jc-b">
                            <span>{{i.domain}}</span>
                            <icon-edit class="c-99 cursor" @click="openFormCard(i)" />
                        </div>
                        <a-empty v-if="!item.list || !item.list.length" />
                    </div>
                </a-card>
            </div>
            <div class="df jc-b">
                <a-button type="primary" @click="domainFormShow({})"><template #icon><icon-plus /></template>添加域名</a-button>
                
                <div v-if="checkList.length">
                    <!-- 策略 -->
                    <a-popover v-model:popup-visible="multipleStrategyShow" trigger="click" position="br" style="width:360px;">
                        <a-button :disabled="checkList.length<=1" type="outline" class="mr-10">策略</a-button>

                        <template #title>
                            <icon-exclamation-circle-fill class="c-orange" />
                            <span class="fs-14 ml-10">是否确定将选中子目录作为主配置，向其他子目录同步配置</span>
                        </template>
                        <template #content>
                            <div>
                                <a-select v-model="checkFirstName" @change="v=>checkList.splice(0, 0, checkList.splice(checkList.findIndex(item => item === v), 1)[0])">
                                    <template #prefix>主配置</template>
                                    <a-option v-for="(item,index) in checkList" :key="index" :value="item" :label="nameMapPath[item]"></a-option>
                                </a-select>
                            </div>
                            <div class="fs-12 c-99">此操作为一次性操作，再次更改单个子目录不会同步变更。</div>
                            <div class="mt-10 df jc-e">
                                <a-button size="small" @click="multipleStrategyShow=false">取消</a-button>
                                <a-button @click="openStrategy()" type="primary" size="small" class="ml-20">确定</a-button>
                            </div>
                        </template>
                    </a-popover>
                    <!-- 灰度发布 -->
                    <a-popover v-model:popup-visible="multipleGrayreleaseShow" trigger="click" position="br" style="width:360px;">
                        <a-button :disabled="checkList.length<=1" type="outline" class="mr-10">灰度发布</a-button>
                        <template #title>
                            <icon-exclamation-circle-fill class="c-orange" />
                            <span class="fs-14 ml-10">是否确定将选中子目录作为主配置，向其他子目录同步配置</span>
                        </template>
                        <template #content>
                            <div>
                                <a-select v-model="checkFirstName" @change="v=>checkList.splice(0, 0, checkList.splice(checkList.findIndex(item => item === v), 1)[0])">
                                    <template #prefix>主配置</template>
                                    <a-option v-for="(item,index) in checkList" :key="index" :value="item" :label="nameMapPath[item]"></a-option>
                                </a-select>
                            </div>
                            <div class="fs-12 c-99">此操作为一次性操作，再次更改单个子目录不会同步变更。</div>
                            <div class="mt-10 df jc-e">
                                <a-button size="small" @click="multipleGrayreleaseShow=false">取消</a-button>
                                <a-button @click="openGrayRelease()" type="primary" size="small" class="ml-20">确定</a-button>
                            </div>
                        </template>
                    </a-popover>
                    <!-- 删除 -->
                    <a-popconfirm :content="'确认要删除选中的域名吗'" @ok="multipleDelete" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                        <a-button type="outline" >批量删除</a-button>
                    </a-popconfirm>
                </div>
            </div>

            <domain-parse-alert />

            <div class=" mt-20">
                <table class="com-table domain-table"><tbody>
                    <tr>
                        <td>域名</td>
                        <td>路由条件</td>
                        <td v-if="!inRvproxy">应用</td>
                        <td v-if="inRvproxy">代理</td>
                        <td>操作</td>
                    </tr>
                    <template v-for="(item,index) in newList" :key="index">
                        <tr>
                            <td>
                                <div>
                                    <div>
                                        <a :href="item.fullDomain" class="c-blue cursor" target="_blank">{{ item.fullDomain }}</a>
                                        <a-tooltip v-if="!inRvproxy && appDefaultDomain==item.fullDomain" content="安装应用默认域名设置，不可删除">
                                            <icon-lock class="ml-10 fs-16 c-orange" />
                                        </a-tooltip>
                                        <span class="c-blue cursor ml-20" @click="openTls(item)">https配置</span>
                                        <span class="c-blue cursor ml-20" @click="domainShow(item)">添加子目录</span>
                                    </div>
                                    <div v-if="item.children&&item.children.length">
                                        <a-popover position="bottom" :content-style="{ padding: '6px 10px 10px' }">
                                            <span class="c-blue cursor fs-12 mt-4">等{{item.children.length+1}}个域名</span>
                                            <template #content>
                                                <div class="df df-c">
                                                    <span v-for="(cd,cdid) in item.children" :key="cdid" class="c-blue" style="white-space:nowrap;text-decoration:none;">{{cd.host}}</span>
                                                </div>
                                            </template>
                                        </a-popover>
                                    </div>
                                </div>
                            </td>
                            <td>-</td>
                            <td>-</td>
                            <td style="width:300px;">
                                <a-tooltip v-if="debug" content="yaml">
                                    <span class="opt-icon" @click="openYaml(item.name)">
                                        <icon-code />
                                    </span>
                                </a-tooltip>
                                <a-tooltip content="修改">
                                    <i class="opt-icon" @click="domainFormShow(item)"><icon-edit /></i>
                                </a-tooltip>
                                <a-tooltip content="绑定域名">
                                    <i class="opt-icon" @click="openBind(item)"><icon-plus /></i>
                                </a-tooltip>
                                <a-popconfirm v-if="appDefaultDomain!=item.fullDomain" :content="'确认要删除吗'" @ok="toDelete(item)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                    <a-tooltip content="删除">
                                        <i class="opt-icon"><icon-delete /></i>
                                    </a-tooltip>
                                </a-popconfirm>
                            </td>
                        </tr>
                        <template v-for="part in item.part" :key="part.id">
                            <tr class="bg-gray">
                                <!-- :style="{paddingLeft:(part.grayRelease&&part.grayRelease.length)?'10px':'40px'}" -->
                                <td style="padding-left:40px;">
                                    <a-checkbox v-model="checkList" :class="{'first-checkbox':checkList[0]==part.name}" @change="changeCheckPart" :value="part.name" label="" class="mr-10" style="vertical-align:middle;" />
                                    <button v-if="part.grayRelease&&part.grayRelease.length" class="table-expand-btn" style="vertical-align:middle;" @click="part.openGr=!part.openGr">
                                        <icon-minus v-if="part.openGr" />
                                        <icon-plus v-else />
                                    </button>
                                    <a :href="part.fullDomain" class="c-blue cursor" target="_blank" style="vertical-align:middle;">{{part.path}}</a>
                                </td>
                                <td>
                                    <span>{{{Prefix:'前缀匹配',Exact:'精准匹配',ImplementationSpecific:'正则匹配'}[part.path_type]}}</span>
                                </td>
                                <td v-if="!inRvproxy">
                                    <span>{{part.appTitle}}</span>
                                    <a-popover v-if="part.filecache || part.registrycache" content="目标地址已被第三方服务接管！">
                                        <icon-exclamation-circle class="c-red ml-4 fs-16 cursor" />
                                    </a-popover>
                                </td>
                                <td v-if="inRvproxy">
                                    <span v-if="part.originType==2">{{part.appTitle}}</span>
                                    <span v-else>{{part.destination}}</span>
                                    <a-popover v-if="part.filecache || part.registrycache" content="目标地址已被第三方服务接管！">
                                        <icon-exclamation-circle class="c-red ml-4 fs-16 cursor" />
                                    </a-popover>
                                </td>
                                <td>
                                    <a-tooltip v-if="debug" content="yaml">
                                        <span class="opt-icon" @click="openYaml(part.name)">
                                            <icon-code />
                                        </span>
                                    </a-tooltip>
                                    <a-tooltip v-if="item.ingressclass=='higress'" content="策略">
                                        <i class="opt-icon" @click="openStrategy(part)"><icon-settings /></i>
                                    </a-tooltip>
                                    <a-tooltip content="灰度发布">
                                        <i class="opt-icon" @click="openGrayRelease(part)"><icon-send /></i>
                                    </a-tooltip>
                                    <a-tooltip content="修改">
                                        <i class="opt-icon" @click="domainShow(part)"><icon-edit /></i>
                                    </a-tooltip>
                                    <a-popconfirm v-if="!part.is_root" :content="'确认要删除吗'" @ok="delPath(part)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                        <a-tooltip content="删除">
                                            <i class="opt-icon"><icon-delete /></i>
                                        </a-tooltip>
                                    </a-popconfirm>
                                </td>
                            </tr>
                            <template v-if="part.openGr">
                                <tr v-for="gr in part.grayRelease" :key="gr.name" style="background-color: var(--color-fill-1);">
                                    <td style="padding-left:100px;">
                                        <a :href="(gr.is_auto_ssl?'https://':'http://')+gr.domain + gr.path" class="c-blue cursor" target="_blank">{{gr.path}}</a>
                                        <a-tag color="gray" class="ml-20" style="background-color:var(--color-fill-3);">
                                            <template #icon><icon-send /></template>
                                            <span>{{{header:'Header',cookie:'Cookie',weight:'权重'}[gr.type]}}</span>
                                            <span class="ml-10">{{gr.type=='weight'?(gr.weight+'%'):(gr.headerName+' = '+gr.value)}}</span>
                                        </a-tag>
                                    </td>
                                    <td>
                                        <span>{{{Prefix:'前缀匹配',Exact:'精准匹配',ImplementationSpecific:'正则匹配'}[gr.path_type]}}</span>
                                    </td>
                                    <td v-if="!inRvproxy">
                                        <span>{{gr.appTitle}}</span>
                                        <a-popover v-if="gr.filecache || gr.registrycache" content="目标地址已被第三方服务接管！">
                                            <icon-exclamation-circle class="c-red ml-4 fs-16 cursor" />
                                        </a-popover>
                                    </td>
                                    <td v-if="inRvproxy">
                                        <span v-if="gr.originType==2">{{gr.appTitle}}</span>
                                        <span v-else>{{gr.destination}}</span>
                                        <a-popover v-if="gr.filecache || gr.registrycache" content="目标地址已被第三方服务接管！">
                                            <icon-exclamation-circle class="c-red ml-4 fs-16 cursor" />
                                        </a-popover>
                                    </td>
                                    <td>
                                        <a-tooltip v-if="debug" content="yaml">
                                            <span class="opt-icon" @click="openYaml(gr.name)">
                                                <icon-code />
                                            </span>
                                        </a-tooltip>
                                    </td>
                                </tr>
                            </template>
                        </template>
                    </template>
                    <tr v-if="!list || !list.length">
                        <td colspan="6"><a-empty /></td>
                    </tr>
                </tbody></table>
            </div>
        </div>
        <!-- 添加修改域名 -->
        <a-drawer :width="700" :visible="domainForm.show" @ok="submitDomainForm" @cancel="domainForm.show=false;" unmountOnClose :popup-container="$popupContainer">
            <template #title>{{domainForm.title}}</template>
            
            <a-spin :loading="domainForm.loading" style="width:100%;">
                <a-form :model="domainForm" ref="domainForm" :rules="rules" validate-trigger="blur" auto-label-width class="padding-20" >
                    <a-form-item v-if="!domainForm.name" label="">
                        <a-radio-group v-model="domainForm.originType" @change="chengeFormOriginType">
                            <a-radio v-if="!domainForm.name&&inRvproxy" :value="1">外部服务</a-radio>
                            <a-radio :value="2" :disabled="!hasAppOptions">应用</a-radio>
                            <a-radio :value="3">应用直达</a-radio>
                        </a-radio-group>
                    </a-form-item>
                    <template v-if="domainForm.originType==2 && !inRvproxy">
                        <a-form-item v-if="!domainForm.name" label="应用" field="app">
                            <a-select v-model="domainForm.app" @change="v=>{domainForm.port='';domainForm.appPorts=appPorts[v];}" placeholder="请选择应用">
                                <a-option v-for="i in appList" :key="i.name" :label="i.title" :value="i.name"></a-option>
                            </a-select>
                        </a-form-item>
                        <a-form-item v-if="!domainForm.name" label="选择端口" field="port">
                            <a-select v-model="domainForm.port" placeholder="请选择端口">
                                <a-option v-for="i in domainForm.appPorts" :key="i" :label="i" :value="i"></a-option>
                            </a-select>
                        </a-form-item>
                    </template>
                    <template v-if="domainForm.originType==2 && inRvproxy">
                        <a-form-item v-if="!domainForm.name" label="应用" field="app">
                            <a-select v-model="domainForm.appgroup" @change="domainForm.app=''" placeholder="请选择">
                                <a-option v-for="i in allGroup" :key="i.name" :label="i.title" :value="i.name"></a-option>
                            </a-select>
                            <a-select v-model="domainForm.app" @change="domainForm.port='';checkAllAppPorts(domainForm.appgroup,domainForm.app,(v)=>{domainForm.appPorts=v});" placeholder="请选择应用" class="ml-10">
                                <a-option v-for="i in allAppList[domainForm.appgroup]" :key="i.name" :label="i.title" :value="i.name"></a-option>
                            </a-select>
                        </a-form-item>
                        <a-form-item v-if="!domainForm.name" label="选择端口" field="port">
                            <a-select v-model="domainForm.port" placeholder="请选择端口">
                                <a-option v-for="i in domainForm.appPorts" :key="i" :label="i" :value="i"></a-option>
                            </a-select>
                        </a-form-item>
                    </template>
                    <a-form-item v-if="domainForm.originType==1 && !domainForm.name" label="绑定代理" field="destination">
                        <a-select v-model="domainForm.destination" placeholder="代理" size="large">
                            <a-option v-for="item in agents" :key="item.value" :label="item.title" :value="item.value"></a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item v-if="!inRvproxy" v-show="!domainForm.ingressclass||ingressclassList.length>1" label="ingressClass" field="ingressclass">
                        <a-select v-model="domainForm.ingressclass" placeholder="请选择ingressClass">
                            <a-option v-for="i in ingressclassList" :key="i" :label="i" :value="i"></a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item label="域名" style="margin-bottom:0;" field="domain">
                        <div class="fc df df-c">
                            <a-input v-model="domainForm.domain" :disabled="whiteList.length && (domainForm.whiteDomain==-1||whiteList[domainForm.whiteDomain].prefixRandom)" placeholder="请输入域名" size="large" :spellcheck="false" >
                                <template #prepend>{{domainForm.auto_ssl?'https://':'http://'}}</template>
                                
                                <template v-if="whiteList.length && domainForm.whiteDomain!=-1" #append>
                                    <a-select v-model="domainForm.whiteDomain" @change="whiteList[domainForm.whiteDomain].prefixRandom?domainForm.domain=createShortUuid():null;">
                                        <a-option v-for="(wd,wdid) in whiteList" :key="wdid" :label="'.'+wd.domain" :value="wdid"></a-option>
                                    </a-select>
                                </template>

                            </a-input>
                            <span v-if="whiteList.length && domainForm.whiteDomain==-1" class="mt-10">
                                <span class="c-red">当前域名不符合管理员设置的域名白名单规则，是否需要更改？ </span>
                                <span class="c-blue cursor ml-10" @click="domainForm.domain='';domainForm.whiteDomain=0;whiteList[domainForm.whiteDomain].prefixRandom?domainForm.domain=createShortUuid():null;">更改</span>
                            </span>
                            <a-checkbox v-model="domainForm.auto_ssl" class="mt-16">自动SSL证书</a-checkbox>
                        </div>
                    </a-form-item>

                    <a-form-item v-if="domainForm.originType==3" label="直达应用" style="margin-top:20px;" field="zdApp">
                        <a-select
                            v-model="domainForm.zdApp"
                            placeholder="搜索并选择应用"
                            allow-search
                            :filter-option="filterDirectAppOption"
                            :loading="directAppsLoading"
                            :disabled="!inRvproxy"
                        >
                            <a-option v-for="item in directAppOptions" :key="item.name" :label="item.title" :value="item.name">
                                <div class="direct-app-option">
                                    <span>{{item.title}}</span>
                                    <small v-if="item.title!=item.name">{{item.name}}</small>
                                </div>
                            </a-option>
                        </a-select>
                    </a-form-item>
                </a-form>
            </a-spin>
        </a-drawer>
        <!-- 添加修改子目录 -->
        <a-drawer :width="700" :visible="domain.show" @ok="submitForm" @cancel="domain.show=false;" unmountOnClose :popup-container="$popupContainer">
            <template #title>{{domain.title}}</template>
            <a-form ref="dialog" :model="domain" :rules="rules" validate-trigger="blur" class="padding-20" auto-label-width>
                
                <a-form-item label="">
                    <a-radio-group v-model="domain.originType" @change="chengeFormOriginType">
                        <a-radio v-if="inRvproxy" :value="1">外部服务</a-radio>
                        <a-radio :value="2">应用</a-radio>
                        <a-radio :value="3">应用直达</a-radio>
                    </a-radio-group>
                </a-form-item>

                <template v-if="domain.originType==2 && !inRvproxy" >
                    <a-form-item v-if="!inRvproxy" label="应用" field="app">
                        <a-select v-model="domain.app" @change="v=>{domain.port='';domain.appPorts=appPorts[v];}" placeholder="请选择应用" style="width:500px;">
                            <a-option v-for="i in appList" :key="i.name" :label="i.title" :value="i.name"></a-option>
                        </a-select>
                    </a-form-item>
                    
                    <a-form-item v-if="!inRvproxy" label="选择端口" field="port">
                        <a-select v-model="domain.port" placeholder="请选择端口" style="width:500px;">
                            <a-option v-for="i in domain.appPorts" :key="i" :label="i" :value="i"></a-option>
                        </a-select>
                    </a-form-item>
                </template>

                <template v-if="domain.originType==2 && inRvproxy" >
                    <a-form-item v-if="!domain.name" label="应用" field="app">
                        <a-select v-model="domain.appgroup" @change="domain.app=''" placeholder="请选择">
                            <a-option v-for="i in allGroup" :key="i.name" :label="i.title" :value="i.name"></a-option>
                        </a-select>
                        <a-select v-model="domain.app" @change="domain.port='';checkAllAppPorts(domain.appgroup,domain.app,(v)=>{domain.appPorts=v});" placeholder="请选择应用" class="ml-10">
                            <a-option v-for="i in allAppList[domain.appgroup]" :key="i.name" :label="i.title" :value="i.name"></a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item v-if="!domain.name" label="选择端口" field="port">
                        <a-select v-model="domain.port" placeholder="请选择端口">
                            <a-option v-for="i in domain.appPorts" :key="i" :label="i" :value="i"></a-option>
                        </a-select>
                    </a-form-item>
                </template>

                <a-form-item v-if="domain.originType==1" label="绑定代理" field="destination">
                    <a-select v-model="domain.destination" placeholder="代理" size="large">
                        <a-option v-for="item in agents" :key="item.value" :label="item.title" :value="item.value"></a-option>
                    </a-select>
                </a-form-item>

                <a-form-item v-if="!inRvproxy" v-show="!domain.ingressclass||ingressclassList.length>1" label="ingressClass" field="ingressclass">
                    <a-select v-model="domain.ingressclass" placeholder="请选择ingressClass">
                        <a-option v-for="i in ingressclassList" :key="i" :label="i" :value="i"></a-option>
                    </a-select>
                </a-form-item>
                <!-- <a-form-item v-else label="ingressClass">
                    <a-input default-value="higress" size="large" disabled />
                </a-form-item> -->
                <a-form-item label="子目录">
                    <div style="flex:1;">
                        <div class="df">
                            <a-select v-model="domain.path_type" placeholder="匹配方式" style="width: 140px">
                                <a-option label="前缀匹配" value="Prefix" />
                                <a-option label="精准匹配" value="Exact" />
                                <a-option label="正则匹配" value="ImplementationSpecific" />
                            </a-select>
                            <a-input v-model="domain.path" placeholder="请输入子目录" :spellcheck="false" style="margin-left:20px;">
                                <template #prepend>/</template>
                            </a-input>
                        </div>
                        <!-- <div class="lh-1 mt-10 df">
                            <a-checkbox v-model="domain.rewrite">重写</a-checkbox>
                        </div> -->
                    </div>
                </a-form-item>
                <a-form-item label="重写">
                    <div class="df df-c ai-s" style="width:100%;">
                        <a-switch v-model="domain.rewrite" :disabled="domain.filecache || domain.registrycache"></a-switch>
                        <div v-if="domain.rewrite" class="padding-10 mt-10" style="background:var(--color-neutral-1);width:100%;">
                            <a-alert style="line-height:1.2;">修改请求的域名（Host）以及请求路径（Path），通常用于后端服务的域名/路由与网关侧域名/路由不一致时的配置</a-alert>
                            <div class="mt-20">
                                <a-form-item label="重写路径" prop="rewrite">
                                    <a-input v-model="domain.rewrite_path" placeholder="请输入" :spellcheck="false" ></a-input>
                                </a-form-item>
                                <a-form-item label="重写域名" prop="rewrite">
                                    <a-input v-model="domain.rewrite_host" placeholder="请输入" :spellcheck="false" ></a-input>
                                </a-form-item>
                            </div>
                        </div>
                    </div>
                </a-form-item>
                <a-form-item label="高级匹配">
                    <div class="df df-c ai-s" style="width:100%;">
                        <a-switch v-model="domain.openOther"></a-switch>
                        <div v-if="domain.openOther" class="padding-10 mt-10" style="background:var(--color-neutral-1);width:100%;">
                            <div style="color:var(--color-text-2);margin-bottom:8px;">请求方法</div>
                            <a-select v-model="domain.matchMethod" multiple placeholder="方法匹配值，可多选，不填则匹配所有的HTTP方法">
                                <a-option label="GET" value="GET"></a-option>
                                <a-option label="POST" value="POST"></a-option>
                                <a-option label="PUT" value="PUT"></a-option>
                                <a-option label="DELETE" value="DELETE"></a-option>
                                <a-option label="OPTIONS" value="OPTIONS"></a-option>
                                <a-option label="HEAD" value="HEAD"></a-option>
                                <a-option label="PATCH" value="PATCH"></a-option>
                                <a-option label="TRACE" value="TRACE"></a-option>
                                <a-option label="CONNECT" value="CONNECT"></a-option>
                            </a-select>
                            
                            <div class="mt-20" style="color:var(--color-text-2);margin-bottom:8px;">
                                <span>请求头(Header)</span>
                                <a-tooltip content="多个参数之间是“与”关系">
                                    <icon-question-circle-fill class="ml-4 cursor" />
                                </a-tooltip>
                            </div>
                            <table class="com-table">
                                <tbody>
                                    <tr class="thead"><td>键</td><td>条件</td><td>值</td><td>操作</td></tr>
                                    <tr v-for="(item,index) in domain.matchHeader" :key="index">
                                        <td><a-input v-model="item.key" size="small" placeholder="请输入" /></td>
                                        <td>
                                            <a-select v-model="item.type" size="small">
                                                <a-option value="prefix" label="前缀匹配"></a-option>
                                                <a-option value="exact" label="精准匹配"></a-option>
                                                <a-option value="regex" label="正则匹配"></a-option>
                                            </a-select>
                                        </td>
                                        <td><a-input v-model="item.value" size="small" placeholder="请输入" /></td>
                                        <td>
                                            <span class="c-blue cursor" style="white-space:nowrap;" @click="domain.matchHeader.splice(index,1);">删除</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="4" class="txt-c c-99">
                                            <div class="df ai-c jc-c cursor" @click="domain.matchHeader.push({key:'',type:'prefix',value:''})">
                                                <icon-plus :size="14" class="c-99" />
                                                <span class="c-99 lh-1 ml-6">添加</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="mt-20" style="color:var(--color-text-2);margin-bottom:8px;">
                                <span>请求参数(Query)</span>
                                <a-tooltip content="多个参数之间是“与”关系">
                                    <icon-question-circle-fill class="ml-4 cursor" />
                                </a-tooltip>
                            </div>
                            <table class="com-table">
                                <tbody>
                                    <tr class="thead"><td>键</td><td>条件</td><td>值</td><td>操作</td></tr>
                                    <tr v-for="(item,index) in domain.matchQuery" :key="index">
                                        <td><a-input v-model="item.key" size="small" placeholder="请输入" /></td>
                                        <td>
                                            <a-select v-model="item.type" size="small">
                                                <a-option value="prefix" label="前缀匹配"></a-option>
                                                <a-option value="exact" label="精准匹配"></a-option>
                                                <a-option value="regex" label="正则匹配"></a-option>
                                            </a-select>
                                        </td>
                                        <td><a-input v-model="item.value" size="small" placeholder="请输入" /></td>
                                        <td>
                                            <span class="c-blue cursor" style="white-space:nowrap;" @click="domain.matchQuery.splice(index,1);">删除</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="4" class="txt-c c-99">
                                            <div class="df ai-c jc-c cursor" @click="domain.matchQuery.push({key:'',type:'prefix',value:''})">
                                                <icon-plus :size="14" class="c-99" />
                                                <span class="c-99 lh-1 ml-6">添加</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </a-form-item>

                <a-form-item v-if="domain.originType==3" label="直达应用" field="zdApp">
                    <a-select
                        v-model="domain.zdApp"
                        placeholder="搜索并选择应用"
                        allow-search
                        :filter-option="filterDirectAppOption"
                        :loading="directAppsLoading"
                        :disabled="!inRvproxy"
                    >
                        <a-option v-for="item in directAppOptions" :key="item.name" :label="item.title" :value="item.name">
                            <div class="direct-app-option">
                                <span>{{item.title}}</span>
                                <small v-if="item.title!=item.name">{{item.name}}</small>
                            </div>
                        </a-option>
                    </a-select>
                </a-form-item>
            </a-form>
        </a-drawer>
        <!-- 卡片添加域名 -->
        <a-modal v-model:visible="formcard.show" :title="formcard.title" @ok="formCardSubmit" @cancel="formcard.show=false;" width="600px" :popup-container="$popupContainer">
            <a-form :model="formcard" auto-label-width>
                <a-form-item label="域名">
                    <div class="df df-c" style="flex:1;">
                        <a-input v-model="formcard.domain" :disabled="whiteList.length && (formcard.whiteDomain==-1||whiteList[formcard.whiteDomain].prefixRandom)" placeholder="请输入" :spellcheck="false">
                            <template v-if="whiteList.length && formcard.whiteDomain!=-1" #append>
                                <a-select v-model="formcard.whiteDomain" @change="whiteList[formcard.whiteDomain].prefixRandom?formcard.domain=createShortUuid():null;">
                                    <a-option v-for="(wd,wdid) in whiteList" :key="wdid" :label="'.'+wd.domain" :value="wdid"></a-option>
                                </a-select>
                            </template>
                        </a-input>
                        <span v-if="whiteList.length && formcard.whiteDomain==-1" class="mt-10">
                            <span class="c-red">当前域名不符合管理员设置的域名白名单规则，是否需要更改？ </span>
                            <span class="c-blue cursor ml-10" @click="formcard.domain='';formcard.whiteDomain=0;whiteList[formcard.whiteDomain].prefixRandom?formcard.domain=createShortUuid():null;">更改</span>
                        </span>
                        <a-checkbox v-model="formcard.auto_ssl" class="mt-10">自动SSL证书</a-checkbox>
                    </div>
                </a-form-item>
                <a-form-item v-show="!formcard.ingressclass || ingressclassList.length>1" label="ingressClass" field="ingressclass">
                    <a-select v-model="formcard.ingressclass" placeholder="请选择ingressClass">
                        <a-option v-for="i in ingressclassList" :key="i" :label="i" :value="i"></a-option>
                    </a-select>
                </a-form-item>
            </a-form>
        </a-modal>

        <!-- yaml -->
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
        <!-- 策略 -->
        <domain-strategy ref="domainstrategy" :show="strategy.show" :data="strategy.data" :multiple="strategy.multiple" :hideRewrite="true" @submit="strategy.submit" @refresh="getList()" @cancel="strategy.show=false;"></domain-strategy>
        <!-- 证书 -->
        <domain-cert ref="domainCert" :data-list="dataList" :domain-list="list" @success="getList(patchApp)"></domain-cert>
        <!-- 灰度发布 -->
        <domain-gray-release
            ref="grayrelease"
            :show="grayRelease.show"
            :appList="appList"
            :appPorts="appPorts"
            :parentName="grayRelease.parentName"
            :parentPath="grayRelease.parentPath"
            :multiple="grayRelease.multiple"
            :checkList="checkList"
            @cancel="v=>{grayRelease.show=false;v?getList():null;}"
        ></domain-gray-release>
        <!-- 绑定域名 -->
        <a-drawer v-model:visible="bindDomain.show" title="绑定域名" @ok="bindSubmit" @cancel="bindDomain.show=false;" width="700px">
            <div class="padding-20 df df-c">
                <div v-for="(item,index) in bindDomain.list" :key="index" class="df ai-c mb-10">
                    <a-input v-model="item.host" placeholder="请输入域名" class="fc">
                        <template #prepend>{{item.auto_ssl?'https://':'http://'}}</template>
                    </a-input>
                    <a-checkbox v-model="item.autoSsl" class="ml-10">自动SSL证书</a-checkbox>
                    <icon-close class="ml-20 cursor fs-16" @click="bindDomain.list.splice(index,1);" />
                </div>
                <a-button @click="bindDomain.list.push({name:createName(),host:'',autoSsl:bindDomain.autoSsl,sslRedirect:bindDomain.sslRedirect})" type="outline">
                    <icon-plus />
                    <span class="ml-10">添加域名</span>
                </a-button>
            </div>
        </a-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios'
import domainStrategy from '@/components/domain-strategy.vue'
import { useNamespaceStore, useLoadingStore } from '@/store'
import yamlDrawer from '@/components/yaml-drawer.vue';
import domainGrayRelease from '@/components/domain-gray-release.vue';
import { getUserInfo } from '@/utils/auth';
import CryptoJS  from 'crypto-js';
import shortuuid from 'short-uuid';
import domainParseAlert from '@/components/domain-parse-alert.vue';
import domainCert from '@/components/domain-cert.vue';
import { filterAppGroupWorkloadItems } from '@/utils/appgroup';
import { cleanupIngressPluginRules } from '@/utils/gateway-plugin';

const type3Backend = {
    service: {
        name: 'w7panel-offline',
        port: {number: 8000},
    }
}

export default {
    data(){
        return {
            whiteList: [],
            
            appPorts: [],
            appList: [],

            allAppPorts: [],
            allGroup: [],
            allAppList: {},

            groupData: null,
            namespaceActive: '',
            dataList: [], // 原数据
            list: [],  // 列表数据
            newList: [],
            domain: {
                openOther: false,
                matchMethod: [],
                matchQuery: [],
                matchHeader: [],
            },
            domainForm:{
                loading: false,
                whiteDomain: 0,
                originType: 1,
            },
            strategy: {},
            ingressclassList: [],

            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },

            rules: {
                destination: [{ required: true, message: '请选择代理', trigger: 'blur' },],
                app: [{ required: true, message: '请选择应用', trigger: 'blur' },],
                ingressclass: [{ required: true, message: '请选择ingressClass', trigger: 'blur' },],
                domain: [{ required: true, message: '请输入域名', trigger: 'blur' },],
                port: [{ required: true, message: '请选择端口', trigger: 'blur' },],
                zdApp: [{ required: true, message: '请选择应用', trigger: 'blur' },],
            },
            checkedAll: false,

            ingressDomains: [],
            domainCard: [],
            formcard: {
                show: false,
                title: "添加域名",
                domain: "",
                ins_name: "",
                auto_ssl: false,
                ingressclass: "",
                whiteDomain: 0,
            },
            inRvproxy: false,
            agents: [],

            grayRelease: {
                show: false,
                multiple: false,
                parentName: '',
                parentPath: '',
            },
            debug: false,
            fileCache: {
                exist: false,
                backendUrl: '',
                token: '',
            },
            
            checkList: [],
            checkFirstName: '',

            bindDomain: {},
            nameMapPath: {},

            multipleGrayreleaseShow: false,
            multipleStrategyShow: false,

            directApps: [],
            directAppsLoading: false,
        };
    },
    components: {
        domainStrategy,
        yamlDrawer,
        domainGrayRelease,
        domainParseAlert,
        domainCert,
    },
    async created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.inRvproxy = this.$route.name == 'gateway-rvproxy-domain';
        this.namespaceActive = useNamespaceStore().namespace;
        this.loadDirectApps();
        await this.getWhiteList();
        this.refreshGroup();
        this.getList();
        this.getIngressclassList();
        this.getAppPorts();
        this.testFileCache();
    },
    watch:{
        appList(){
            this.getTitleByName();
            this.getAppPorts();
        },
    },
    computed:{
        appDefaultDomain(){
            return this.groupData?.metadata?.annotations?.['w7.cc/default-domain'];
        },
        hasAppOptions(){
            if(this.inRvproxy){
                return Object.values(this.allAppList || {}).some(list=>list?.length);
            }
            return !!this.appList?.length;
        },
        currentDirectApp(){
            const name = this.$route.params?.group || '';
            const current = this.directApps.find(item=>item.name==name);
            if(current){ return current; }
            return {
                name,
                title: this.groupData?.metadata?.annotations?.title || this.groupData?.spec?.title || name,
            };
        },
        directAppOptions(){
            let options = this.inRvproxy ? [...this.directApps] : [this.currentDirectApp];
            const selectedNames = this.inRvproxy
                ? [this.domainForm?.zdApp, this.domain?.zdApp]
                : [];
            selectedNames.filter(Boolean).forEach(name=>{
                if(!options.some(item=>item.name==name)){
                    options.push({name, title:name});
                }
            });
            return options.filter(item=>item.name);
        },
    },
    methods: {
        async cleanupIngressPluginRules(ingressNames){
            return cleanupIngressPluginRules(k8sproxy, this.namespaceActive, ingressNames);
        },
        chengeFormOriginType(v){
            if(v==3 && !this.inRvproxy){
                const name = this.currentDirectApp.name;
                this.domainForm.zdApp = name;
                this.domain.zdApp = name;
            }
            if(v==2){
                this.domain.app = '';
                this.domain.port = '';
            }
        },
        async loadDirectApps(){
            this.directAppsLoading = true;
            try{
                const {data} = await k8sproxy.get(
                    '/apis/w7panel.w7.com/v1alpha1/namespaces/'+this.namespaceActive+'/microapps',
                    {noAlert:true},
                );
                const appMap = new Map();
                (data?.items || []).forEach(item=>{
                    const name = item?.metadata?.name || '';
                    const frontendUrl = String(item?.spec?.frontendUrl || '').trim();
                    const manifestType = item?.metadata?.annotations?.['w7.cc/manifest-type'];
                    if(!name || !frontendUrl || manifestType=='gateway-plugin'){ return; }
                    appMap.set(name, {
                        name,
                        title: item?.metadata?.annotations?.title || item?.spec?.title || name,
                    });
                });
                this.directApps = [...appMap.values()].sort((a,b)=>
                    String(a.title).localeCompare(String(b.title), 'zh-CN')
                );
            }catch{
                this.directApps = [];
            }finally{
                this.directAppsLoading = false;
            }
        },
        filterDirectAppOption(inputValue, option){
            const keyword = String(inputValue || '').trim().toLocaleLowerCase();
            if(!keyword){ return true; }
            const label = option?.label ?? option?.props?.label ?? '';
            const value = option?.value ?? option?.props?.value ?? '';
            return `${label} ${value}`.toLocaleLowerCase().includes(keyword);
        },
        normalizeDirectAppTarget(form){
            if(form?.originType==3 && !this.inRvproxy){
                form.zdApp = this.currentDirectApp.name;
            }
        },
        openBind(row){
            this.bindDomain = {
                show: true,
                parent: row.name,
                autoSsl: row.is_auto_ssl,
                sslRedirect: row.redirect,
                list: JSON.parse(JSON.stringify(row.children)) || [],
            }
        },
        bindSubmit(){
            
            let children = this.bindDomain.list;
            children = children.filter(i=>i.host);
            
            k8sproxy.patch("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+this.bindDomain.parent,[{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1child-hosts',
                value: JSON.stringify(children)
            }],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(()=>{
                this.$message.success('操作成功');
                this.bindDomain.show = false;
                this.getList();
            }).catch(()=>{})
        },
        async multipleDelete(){
            let arr = [];
            this.list.map(i=>{
                i.part?.map(p=>{
                    for(let i in this.checkList){
                        if(this.checkList[i]==p.name){
                            arr.push(p)
                        }
                    }
                })
            })
            await this.cleanupIngressPluginRules(arr.filter(item=>!item.is_root).map(item=>item.name));
            for(let i in arr){
                if(arr[i].is_root){ continue }
                await k8sproxy.delete("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+arr[i].name).then(()=>{}).catch(()=>{});
            }
            this.$message.success('操作成功');
            this.getList();
        },
        changeCheckPart(v,e){
            let target = e.target.value;
            let partlist = [];
            this.list.map(i=>{
                let find = i.part?.find(p=>p.name==target)
                if(find){
                    partlist = i.part.map(p=>p.name)
                }
            })
            this.checkList = this.checkList.filter(i=>partlist.includes(i));
            this.checkFirstName = this.checkList[0];
        },
        testFileCache(){
            if(this.inRvproxy){return}
            let group = this.$route.params.group;
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/microapps/'+group,{noAlert:true}).then(res=>{
                if(!res?.data){return Promise.reject();}
                this.fileCache.exist = true;
                this.fileCache.backendUrl = res.data?.spec?.backendUrl;
                this.fileCache.token = res.data?.spec?.config?.props?.OAUTH_TOKEN;
            });
        },
        createShortUuid(){
            return shortuuid.generate().toLocaleLowerCase();
        },
        // 选择应用获取端口
        async checkAllAppPorts(appGroup,appName,callback){
            if(this.allAppPorts[appName]?.length){
                callback(this.allAppPorts[appName]);
                return;
            }
            let app = this.allAppList?.[appGroup]?.find(i=>i.name==appName)
            if(!app){
                callback([]);
                return;
            }
            let { data } = await k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ app.kind +"/"+ app.name);
            this.allAppPorts[app.name] = data?.spec?.template?.spec?.containers?.[0]?.ports?.map(i=>String(i.containerPort)) || [];
            callback(this.allAppPorts[app.name]);
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
                let wl = userInfo?.['w7.cc/domain-white-list'] || '[]';
                wl = JSON.parse(wl);
                if(wl.length){
                    this.whiteList = wl?.filter(i=>!i.disabled);
                    resolve();
                    return;
                }
                resolve();
                k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/domain-white-list',{noAlert:true}).then(res=>{
                    if(!res?.data){return}
                    let list = [];
                    try{
                        list = JSON.parse(res?.data?.data?.whiteList)?.filter(i=>!i.disabled)
                    }catch{}
                    this.whiteList = list;
                }).finally(()=>{
                    resolve();
                })
            })
        },
        // 灰度发布
        openGrayRelease(part){
            if(!part && this.checkList.length){
                let find = null;
                this.list.map(i=>{
                    i.part?.map(p=>{
                        if(p.name == this.checkList[0]){ find = p; }
                    })
                })
                if(find){
                    this.grayRelease.parentName = find.name;
                    this.grayRelease.parentPath = find.path;
                }else{
                    this.grayRelease.parentName = '';
                    this.grayRelease.parentPath = '';
                }
                this.grayRelease.multiple = true;
                // this.grayRelease.show = true;
                this.$nextTick(()=>{
                    this.$refs.grayrelease.multipleAsync();
                    this.multipleGrayreleaseShow = false;
                    this.$message.success('操作成功');
                });
                return;
            }
            this.grayRelease.multiple = false;
            this.grayRelease.parentName = part.name;
            this.grayRelease.parentPath = part.path;
            this.grayRelease.show = true;
        },
        openFormCard(obj){
            this.formcard = {
                show: true,
                // originType: obj.originType || (this.inRvproxy? 1 : 2),
                title: obj.ing_name? "修改域名" : "添加域名",
                name: obj.config_name,
                ins_name: obj.ing_name || '',
                domain: obj.host || '',
                auto_ssl: obj.auto_ssl || false,
                ingressclass: this.ingressclassList?.[0] || '',
                whiteDomain: obj.ing_name? obj.whiteDomain : 0,
            }
            if(this.whiteList?.length && this.whiteList[this.formcard?.whiteDomain]?.prefixRandom && !this.formcard.domain){
                this.formcard.domain = this.createShortUuid();
            }
        },
        // 卡片创建域名
        formCardSubmit(){
            let routes = this.domainCard?.find(i=>i.name==this.formcard.name)?.routes;
            if(!routes?.length){ return; }
            let primary = routes[0];
            let children = routes.filter((i,id)=>id!=0);

            let fullDomain = this.formcard.domain;
            if(this.whiteList.length && this.formcard.whiteDomain!=-1){
                fullDomain = /\.$/.test(fullDomain)? fullDomain : (fullDomain + '.');
                fullDomain = fullDomain + this.whiteList?.[this.formcard.whiteDomain]?.domain;
            }

            this.domainForm = {
                ...this.domainForm,
                title: '',
                show: false,
                originType: 2,
                app: primary?.backend?.svc_name,
                appPorts: [],
                ingressclass: this.formcard.ingressclass || '',
                domain: fullDomain || '',
                port: String(primary?.backend?.port || ''),
                auto_ssl: this.formcard.auto_ssl || false,
                name: this.formcard.ins_name || '', // 修改||新增
                path: primary.path || '',
            }

            let primaryData = null;
            let primaryDataName = this.domainForm.name;
            this.submitDomainForm({noMessage:true, fromCard:true}).then(res=>{
                if(!primaryDataName){
                    primaryData = res?.data;
                }
                return this.getList();
            }).then(async ()=>{
                if(this.formcard.ins_name){ return; }
                let parentName = primaryDataName || primaryData?.metadata?.name;
                for(let i=0; i<children.length; i++){
                    let item = children[i];
                    this.domain = {
                        ...this.domain,
                        show: false,
                        title: '',
                        is_create: true,
                        originType: 2,
                        port: String(item?.backend?.port || ''),
                        index: 0,
                        app: item?.backend?.svc_name || '',
                        appPorts: [],
                        isroot: false,
                        path: item?.path || '',
                        parent: parentName,
                        path_type: 'Prefix',
                        ingressclass: this.formcard.ingressclass || '',
                        rewrite: false,
                        rewrite_path: '',
                        rewrite_host: '',
                        matchHeader: [],
                        matchMethod: [],
                        matchQuery: [],
                    }
                    await this.submitForm({noMessage:true});
                }
            }).then(()=>{
                let find = this.ingressDomains.find(i=>i.ing_name==this.formcard.ins_name);
                if(!find){
                    this.ingressDomains.push({
                        host: fullDomain,
                        auto_ssl: this.formcard.auto_ssl,
                        ing_name: primaryDataName || primaryData.metadata.name,
                        config_name: this.formcard.name,
                    });
                }else{
                    find.host = fullDomain;
                    find.auto_ssl = this.formcard.auto_ssl;
                }
                
                return k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.$route.params.group,
                    {metadata: { annotations: {'w7.cc/ingress-domains': JSON.stringify(this.ingressDomains)}}},
                    {headers: {'Content-Type': 'application/merge-patch+json'}},
                )
            }).then(res=>{
                this.formcard.show = false;
                this.$message.success('操作成功');
                this.getList(this.patchApp);
                this.refreshGroup();
                this.$emit('refresh');
            });
        },
        refreshGroup(){
            if(this.inRvproxy){return;}
            return k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.$route.params.group).then(res=>{
                this.groupData = res?.data;
                this.appList = filterAppGroupWorkloadItems(res.data?.status?.items || []).map(i=>{
                    return {
                        title: i.title || i.name,
                        name: i.name,
                        kind: i.kind?.toLowerCase()+'s',
                    }
                });
                this.init();
            });
        },
        matchWhiteDomain(domain){
            if(domain && this.whiteList.length){
                // -1代表域名与白名单不匹配，不能修改 / 修改必须匹配白名单
                let whiteDomain = -1;
                let whitelist = this.whiteList.map(i=>i.domain);
                const parts = domain.split('.').reverse();
                const n = parts.length;
                let dm = domain;
                for (let i = 0; i < n; i++) {
                    const suffix = parts.slice(0, i + 1).reverse().join('.');
                    const index = whitelist.indexOf(suffix);
                    if (index !== -1) {
                        whiteDomain = index;
                        dm = domain.replace(new RegExp(whitelist[index]+'$'),'');
                        dm = dm.replace(/\.$/,'');
                    }
                }
                domain = dm;
                return {
                    domain: domain,
                    whiteDomain: whiteDomain,
                }
            }else{
                return {
                    domain: domain,
                    whiteDomain: -1,
                }
            }
        },
        async init(){
            if(this.inRvproxy){return;}

            let domainCard = this.groupData?.metadata?.annotations?.['w7.cc/ingress-config'];
            try{ domainCard = JSON.parse(domainCard); }catch(e){ domainCard = []; }
            domainCard = domainCard.map(i=>{
                i.list = i.list.map(li=>{
                    let {domain,whiteDomain} = this.matchWhiteDomain(li.host);
                    li.host = domain;
                    li.whiteDomain = whiteDomain;
                    return li;
                })
                return i;
            })
            this.domainCard = domainCard || [];

            let ingressDomains = this.groupData?.metadata?.annotations?.['w7.cc/ingress-domains'];
            try{ ingressDomains = JSON.parse(ingressDomains); }catch(e){ ingressDomains = []; }
            this.ingressDomains = ingressDomains || [];

            this.domainCard.map(item=>{
                item.list = ingressDomains.filter(i=>i.config_name==item.name).map(i=>{
                    i.domain = (i.auto_ssl? 'https://' : 'http://') + i.host;
                    return i;
                });
            });
        },
        // 获取ingressclass列表
        async getIngressclassList(){
            let res = await k8sproxy.get('/apis/networking.k8s.io/v1/ingressclasses');
            this.ingressclassList = res?.data?.items?.map(i=>i.metadata.name) || [];
        },
        // 获取父子应用端口
        async getAppPorts(){
            if(this.inRvproxy){return}
            if(!this.appList?.length){return;}
            let o = {};
            this.domainForm.loading = true;
            try{
                for(let i in this.appList){
                    let app = this.appList[i];
                    let { data } = await k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ app.kind +"/"+ app.name);
                    o[app.name] = data?.spec?.template?.spec?.containers?.[0]?.ports?.map(i=>String(i.containerPort)) || [];
                }
            }catch{}
            this.domainForm.loading = false;
            this.appPorts = o;
            if(!this.inRvproxy && this.domainForm.app){
                this.domainForm.appPorts = this.appPorts?.[this.domainForm.app] || [];
            }
        },
        // 设置证书
        openTls(item){
            this.$refs.domainCert.open(item, {
                dataList: this.dataList,
                domainList: this.list,
                namespace: this.namespaceActive,
            });
        },
        openYaml(name){
            k8sproxy.get("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+name, {loading:true}).then(res=>{
                if(!res?.data){return}
                this.yamlData = {
                    show: true,
                    data: res?.data,
                    title: res?.data?.metadata?.annotations?.title || res?.data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/" + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
            })
        },
        getTitleByName(){
            let findfun = (name)=>{
                if(!name){return ""}
                for(let i in this.allAppList){
                    let find = this.allAppList[i]?.find(item=>item?.name==name);
                    if(find){return find?.title || name;}
                }
                return name;
                if(this.inRvproxy){
                }else{
                    return this.appList?.find(i=>i?.name==name)?.title || name
                }
            }
            this.list.forEach(item=>{
                // item.appTitle = findfun(item.app);
                item.part?.forEach(partItem=>{
                    if(partItem.originType==2 ){
                        partItem.appTitle = findfun(partItem.app);
                    }else{
                        partItem.appTitle = partItem.app;
                    }
                    partItem?.grayRelease?.forEach(gr=>{
                        if(gr.originType==2 ){
                            gr.appTitle = findfun(gr.app);
                        }else{
                            gr.appTitle = gr.app;
                        }
                    })
                })
            })
        },
        // 获取域名列表
        getAppGroupIngressNames(){
            return (this.groupData?.status?.items || [])
                .filter(i=>i?.kind=='Ingress' && i?.name)
                .map(i=>i.name);
        },
        mergeIngressList(data, extra){
            let map = {};
            [...(data || []), ...(extra || [])].forEach(item=>{
                if(item?.metadata?.name){
                    map[item.metadata.name] = item;
                }
            })
            return Object.values(map);
        },
        fetchAppGroupItemIngresses(data){
            let exists = new Set((data || []).map(i=>i?.metadata?.name).filter(Boolean));
            let names = this.getAppGroupIngressNames().filter(name=>!exists.has(name));
            return Promise.all(names.map(name=>{
                return k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+ this.namespaceActive +'/ingresses/'+name, {noAlert:true, loading:true})
                    .then(res=>res?.data)
                    .catch(()=>null);
            })).then(list=>list.filter(Boolean));
        },
        getList(callback){

            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups',{loading:true}).then(res=>{
                let allGroup = [];
                let allAppList = {};
                let list = res?.data?.items || [];
                list.map(item=>{
                    allGroup.push({
                        name: item.metadata.name,
                        title: item?.spec?.title || item.metadata.name,
                    })
                    allAppList[item.metadata.name] = filterAppGroupWorkloadItems(item?.status?.items || []).map(i=>{
                        return {
                            title: i.title || i.name,
                            name: i.name,
                            kind: i.kind?.toLowerCase()+'s',
                        }
                    });
                })
                this.allGroup = allGroup;
                this.allAppList = allAppList;
                if(!this.inRvproxy){
                    let group = list.find(i=>i?.metadata?.name==this.$route.params?.group);
                    if(group){
                        this.groupData = group;
                        this.appList = filterAppGroupWorkloadItems(group?.status?.items || []).map(i=>{
                            return {
                                title: i.title || i.name,
                                name: i.name,
                                kind: i.kind?.toLowerCase()+'s',
                            }
                        });
                        this.init();
                    }
                }
            }).finally(()=>{
                if(this.inRvproxy){
                    k8sproxy.get('/apis/networking.higress.io/v1/namespaces/'+ this.namespaceActive +'/mcpbridges/'+this.$route.query.name,{loading:true}).then(async res=>{
                        let sr = res?.data?.spec?.registries || [];
                        this.agents = [];
                        let data = [];
                        for(let i=0; i<sr.length; i++){
                            this.agents.push({
                                title: sr[i].name + '.' + sr[i].type,
                                value: sr[i].name + '.' + sr[i].type,
                            })
                            let labelSelector = 'destination=' + sr[i].name + '&higress.io/resource-definer=higress'
                            await k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses?labelSelector='+labelSelector,{loading:true}).then(res=>{
                                data = data.concat(res?.data?.items || []);
                            })
                        }
                        this.getListData(data,callback);
                    });
                }else{
                    let search = 'group=' + this.$route.params?.group;
                    this.agents = [];
                    k8sproxy.get('/apis/networking.higress.io/v1/namespaces/'+ this.namespaceActive +'/mcpbridges',{loading:true}).then(res=>{
                        let list = res?.data?.items || [];
                        list.map(item=>{
                            let sr = item?.spec?.registries || [];
                            for(let i=0; i<sr.length; i++){
                                this.agents.push({
                                    title: sr[i].name + '.' + sr[i].type,
                                    value: sr[i].name + '.' + sr[i].type,
                                })
                            }
                        })
                    }).finally(()=>{
                        k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+ this.namespaceActive +'/ingresses?labelSelector='+search, {loading:true}).then(res=>{
                            let data = res?.data?.items || [];
                            this.fetchAppGroupItemIngresses(data).then(extra=>{
                                this.getListData(this.mergeIngressList(data, extra),callback);
                            })
                        });
                    })
                }
            })
        },
        getListData(data, callback){
            const parseConfig = (str)=>{
                return str.split('\n').reduce((obj, line) => {
                    const [k, v] = line.trim().split(/\s+/)
                    if(k){
                        obj[k] = (v==='true'||v==='false')? v==='true' : v;
                    }
                    return obj
                }, {})
            }
            this.dataList = JSON.parse(JSON.stringify(data));
            
            let nameMapPath = {};
            data.map(i=>nameMapPath[i.metadata.name] = i.spec?.rules?.[0]?.http?.paths?.[0]?.path)
            this.nameMapPath = nameMapPath;

            // 父级域名
            let list = data?.filter(i=>{
                if(!i?.metadata?.labels?.parents){return true;}
                let find = data.find(p=>p.metadata.name==i.metadata.labels.parents);
                if(!find){return true;}
                return false;
            })?.map(i=>{
                
                let is_auto_ssl = i?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';
                let redirect = i?.metadata?.annotations?.['w7.cc/ssl-redirect'] == 'true';
                
                let {domain, whiteDomain} = this.matchWhiteDomain(i?.spec?.rules?.[0]?.host);

                let part = [];

                let p = i?.spec?.rules?.[0]?.http?.paths?.[0];
                let index = 0;
                // i?.spec?.rules?.[0]?.http?.paths?.map((p,index)=>{})
                
                let matchMethod = i?.metadata?.annotations?.['higress.io/match-method'] || i?.metadata?.annotations?.['disabled.higress.io/match-method'] || '';
                matchMethod = matchMethod? matchMethod.split(' ') : [];
                let matchHeader = [];
                let matchQuery = [];
                let matchOpen = i?.metadata?.annotations?.['higress.io/match-method'] !== undefined;
                for(let f in i?.metadata?.annotations){
                    let match = f.match(/^(disabled\.)?higress\.io\/(prefix|exact|regex)\-match\-(query|header)\-([^-]+)$/);
                    if(!match){continue}
                    let o = {
                        type: match[2],
                        key: match[4],
                        value: i.metadata.annotations[f],
                    }
                    if(match[3]=='query'){ matchQuery.push(o) }
                    if(match[3]=='header'){ matchHeader.push(o) }
                }
                let grayRelease = this.filterGrayRelease({
                    data,
                    iname: i.metadata.name,
                    ipath: p.path,
                    type: i?.metadata?.annotations?.['higress.io/canary-type'] || 'header',
                })
                // console.log('grayRelease root',grayRelease)

                // 根子目录
                // let noReplace = i?.metadata?.annotations?.['w7.cc/not-replace'] !== 'true';
                let filecache = i?.metadata?.annotations?.['w7.cc/filecache'] == 'true';
                let registrycache = i?.metadata?.annotations?.['w7.cc/registrycache'] == 'true';

                let originType = i?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.name? 2 : 1;
                originType = i?.metadata?.labels['w7.cc/zhida'] == 'true' ? 3 : originType;

                let RHC = i?.metadata?.annotations?.['higress.io/request-header-control-add'] || i?.metadata?.annotations?.['disabled.higress.io/request-header-control-add'];
                RHC = RHC? parseConfig(RHC) : {};

                part.push({
                    is_root: index==0,
                    index: index,
                    name: i.metadata.name,
                    parentName: i.metadata.name,
                    // app: noReplace? (i?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.name || '') : i.metadata.annotations?.['higress.io/destination'],
                    app: i?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.name,
                    port: p?.backend?.service?.port?.number || '',
                    path: p.path,
                    
                    fullDomain: (is_auto_ssl?'https://':'http://') + i?.spec?.rules?.[0]?.host + p.path,

                    path_type: p.pathType=='Prefix'? (i.metadata.annotations?.['higress.io/use-regex']=='true'?'ImplementationSpecific':'Prefix') : p.pathType,
                    ingressclass: i.metadata.annotations?.['kubernetes.io/ingress.class'],
                    rewrite: i.metadata.annotations?.['higress.io/enable-rewrite'] == 'true',
                    rewrite_path: i.metadata.annotations?.['higress.io/rewrite-target'],
                    rewrite_host: i.metadata.annotations?.['higress.io/upstream-vhost'],
                    destination: i?.metadata?.annotations?.['higress.io/destination'],
                    same: i?.metadata?.annotations?.['same'],

                    originType: originType,
                    ...{
                        zdApp: RHC?.microapp_name,
                    },
                    
                    // noReplace: noReplace,
                    filecache: filecache,
                    registrycache: registrycache,
                    
                    matchHeader: matchHeader || [],
                    matchQuery: matchQuery || [],
                    matchMethod: matchMethod || [],
                    matchOpen: matchOpen,

                    grayRelease: grayRelease,
                })

                let children = JSON.parse(i.metadata.annotations?.['w7.cc/child-hosts'] || '[]');

                return {
                    api_version: i.apiVersion,
                    kind: i.kind,
                    namespace: i.metadata.namespace,
                    name: i.metadata.name,
                    app: i?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.name,
                    domain: domain,
                    whiteDomain: whiteDomain,
                    children: children,

                    host: i?.spec?.rules?.[0]?.host,
                    fullDomain: (is_auto_ssl?'https://':'http://') + i?.spec?.rules?.[0]?.host,
                    port: i?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number || '',
                    ingressclass: i.metadata.annotations?.['kubernetes.io/ingress.class'],
                    destination: i?.metadata?.annotations?.['higress.io/destination'],
                    rh: i?.metadata?.annotations?.['higress.io/upstream-vhost'],
                    is_auto_ssl: is_auto_ssl,
                    secretName: i?.spec?.tls?.[0]?.secretName || '',
                    redirect: redirect,
                    part: part,

                    hide: i?.metadata?.labels?.['w7.cc/hide'] === 'true',
                }
            });
            list = list.filter(i=>!i.hide)
            // 子目录
            data.map(i=>{
                if(!i.metadata.labels?.parents){return}
                if(i.metadata.labels.hasOwnProperty('parentsPath')){return}
                let find = data.find(p=>p.metadata.name==i.metadata.labels.parents);
                if(!find){return}
                
                let is_auto_ssl = i?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';

                let partItem = i;
                let part = [];
                let p = partItem?.spec?.rules?.[0]?.http?.paths?.[0];
                let index = 0;
                // partItem?.spec?.rules?.[0]?.http?.paths?.map((p,index)=>{})
                
                let matchMethod = i?.metadata?.annotations?.['higress.io/match-method'] || i?.metadata?.annotations?.['disabled.higress.io/match-method'] || '';
                matchMethod = matchMethod? matchMethod.split(' ') : [];
                let matchHeader = [];
                let matchQuery = [];
                let matchOpen = i?.metadata?.annotations?.['higress.io/match-method'] !== undefined;
                for(let f in partItem?.metadata?.annotations){
                    let match = f.match(/^(disabled\.)?higress\.io\/(prefix|exact|regex)\-match\-(query|header)\-([^-]+)$/);
                    if(!match){continue}
                    let o = {
                        type: match[2],
                        key: match[4],
                        value: i.metadata.annotations[f],
                    }
                    if(match[3]=='query'){ matchQuery.push(o) }
                    if(match[3]=='header'){ matchHeader.push(o) }
                }
                
                let grayRelease = this.filterGrayRelease({
                    data,
                    iname: partItem.metadata.name,
                    ipath: p.path,
                    type: partItem?.metadata?.annotations?.['higress.io/canary-type'] || 'header',
                })
                // console.log('grayRelease part ',p.path, grayRelease)

                // let noReplace = partItem?.metadata?.annotations?.['w7.cc/not-replace'] !== 'true';
                let filecache = partItem?.metadata?.annotations?.['w7.cc/filecache'] == 'true';
                let registrycache = partItem?.metadata?.annotations?.['w7.cc/registrycache'] == 'true';
                let originType = partItem?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.name? 2 : 1;
                originType = partItem?.metadata?.labels['w7.cc/zhida'] == 'true' ? 3 : originType;

                let RHC = partItem?.metadata?.annotations?.['higress.io/request-header-control-add'] || partItem?.metadata?.annotations?.['disabled.higress.io/request-header-control-add'];
                RHC = RHC? parseConfig(RHC) : {};
                
                part.push({
                    // is_root: index==0,
                    index: index,
                    name: partItem.metadata.name,
                    parentName: find.metadata.name,
                    // app: noReplace? (partItem?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.name || '') : partItem.metadata.annotations?.['higress.io/destination'],
                    app: partItem?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.name || '',
                    originType: originType,
                    ...{
                        zdApp: RHC?.microapp_name,
                    },

                    // noReplace: noReplace,
                    filecache: filecache,
                    registrycache: registrycache,

                    path: p.path,
                    port: p?.backend?.service?.port?.number || '',
                    
                    fullDomain: (is_auto_ssl?'https://':'http://') + i?.spec?.rules?.[0]?.host + p.path,

                    // path_type: p.pathType,
                    path_type: p.pathType=='Prefix'? (i.metadata.annotations?.['higress.io/use-regex']=='true'?'ImplementationSpecific':'Prefix') : p.pathType,
                    ingressclass: partItem.metadata.annotations?.['kubernetes.io/ingress.class'],
                    rewrite: partItem.metadata.annotations?.['higress.io/enable-rewrite'] == 'true',
                    rewrite_path: partItem.metadata.annotations?.['higress.io/rewrite-target'],
                    rewrite_host: partItem.metadata.annotations?.['higress.io/upstream-vhost'],
                    destination: partItem?.metadata?.annotations?.['higress.io/destination'],

                    matchHeader: matchHeader || [],
                    matchQuery: matchQuery || [],
                    matchMethod: matchMethod || [],
                    matchOpen: matchOpen,

                    grayRelease: grayRelease,
                })

                let liItem = list.find(i=>i.name==partItem.metadata.labels.parents)
                if(!liItem){return}
                liItem.part = liItem.part.concat(part);
            })

            let newList = [];
            list.map(i=>{
                if(!i.same){ newList.push(i); return; }

                let find = newList.find(nl=>nl.sameName==i.same);
                if(!find){
                    newList.push({
                        ...i,
                        sameName: i.same,
                        sameList: [{
                            name: i.name,
                            fullDomain: i.fullDomain,
                        }]
                    });
                    return;
                }else{
                    find.sameList.push({
                        name: i.name,
                        fullDomain: i.fullDomain
                    })
                }
            })

            this.newList = newList;
            this.list = list;

            this.getTitleByName();
            if(callback){ callback(); }
        },
        computedSubMd5(v){
            return CryptoJS.MD5(v).toString();
        },
        // 灰度发布
        filterGrayRelease({data,iname,ipath,type}){
            let list = data.filter(i=>{
                let lbs = i.metadata.labels;
                let parentsPath = lbs.parentsPath;
                if(parentsPath===''){
                    parentsPath = this.computedSubMd5('/');
                }
                return lbs.parents == iname && parentsPath == this.computedSubMd5(ipath); //ipath.replace(/^\//,'');
            }).map(i=>{
                let ann = i?.metadata?.annotations;
                let is_auto_ssl = ann?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';
                let pathtype = i?.spec?.rules?.[0]?.http?.paths?.[0]?.pathType;
                return {
                    name: i.metadata.name,
                    parent: i.metadata.name,
                    
                    path_type: pathtype=='Prefix'? (i.metadata.annotations?.['higress.io/use-regex']=='true'?'ImplementationSpecific':'Prefix') : pathtype,
                    app: i?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.name,
                    path: i?.spec?.rules?.[0]?.http?.paths?.[0]?.path,
                    agent: i.metadata?.labels?.['higress.io/destination'],
                    domain: i?.spec?.rules?.[0]?.host,
                    destination: i?.metadata?.annotations?.['higress.io/destination'],
                    originType: i?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.name? 2 : 1,
                    is_auto_ssl,

                    weight: ann?.['higress.io/canary-weight'] || '0',
                    headerName: ann?.['higress.io/canary-by-header'] || ann?.['higress.io/canary-by-cookie'] || '',
                    value: ann?.['higress.io/canary-by-header-value'] || 'always',
                    canary: ann?.['higress.io/canary'] || 'false',
                    type: type,
                }
            }).filter(i=>{
                return i.canary == 'true';
            });
            return list;
        },
        // 修改 w7.cc/domains
        patchApp(){
            if(this.inRvproxy){return}
            let arr = [];
            this.list.map(i=>{
                i.part.map(p=>{
                    arr.push(i.fullDomain + (p.path=="/"?'':p.path))
                })
            })
            arr = JSON.stringify(arr);
            if(this.groupData?.metadata?.annotations?.['w7.cc/domains'] == arr){
                this.refreshGroup();
                return;
            }
            
            k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.$route.params.group, {
                metadata: { annotations: {'w7.cc/domains': arr} }
            }, {
                headers: {'Content-Type': 'application/merge-patch+json'}
            }).then(()=>{
                this.$emit('refresh');
                this.refreshGroup();
            });
        },
        delPath(part,noMessage){
            return this.cleanupIngressPluginRules([part.name]).then(()=>k8sproxy.delete("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+part.name)).then(res=>{
                if(!res?.data){return}
                if(!noMessage){
                    this.$message.success('删除成功');
                    this.getList(this.patchApp);
                }
            })
        },
        // 修改添加域名
        domainFormShow(item){
            this.domainForm.appgroup = '';
            let originType = item.originType || (this.inRvproxy? 1 : 2);
            if(originType == 2 && !this.hasAppOptions){
                originType = this.inRvproxy? 1 : 3;
            }
            this.domainForm = {
                ...this.domainForm,
                is_default: !this.inRvproxy && this.appDefaultDomain==item.fullDomain,
                title: item.name?'修改域名':'添加域名',
                show: true,
                app: this.inRvproxy? '' : this.$route.params.id,

                originType: originType,
                appPorts: this.inRvproxy? '' : (this.appPorts?.[this.$route.params.id] || []),
                ingressclass: item.ingressclass || this.ingressclassList?.[0] || '',
                domain: item.domain || '',
                port: String(item.port || (this.inRvproxy? '' : (this.appPorts?.[this.$route.params.id]?.[0]||''))),
                auto_ssl: item.is_auto_ssl || false,
                name: item.name || '',
                path: '',
                whiteDomain: item.name? item.whiteDomain : 0,
                destination: item.destination,

                zdApp: this.inRvproxy? (item.zdApp || '') : this.currentDirectApp.name,
            }
            if(this.whiteList?.length && this.whiteList[this.domainForm?.whiteDomain]?.prefixRandom && !this.domainForm.domain){
                this.domainForm.domain = this.createShortUuid();
            }
        },
        // 提交域名
        async patchFirstAppStartParamsDomainUrl(domain){
            let app = this.appList?.[0];
            if(!app){ return; }

            let { data } = await k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ app.kind +"/"+ app.name);
            let containers = JSON.parse(JSON.stringify(data?.spec?.template?.spec?.containers || []));
            if(!containers?.[0]?.name){ return; }

            let env = containers[0]?.env || [];
            let envItem = env.find(i=>String(i?.name || '').toLowerCase() == 'domain_url');
            if(!envItem){
                env.push({ name: 'DOMAIN_URL', value: domain });
            }else{
                envItem.value = domain;
                delete envItem.valueFrom;
            }

            await k8sproxy.patch("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ app.kind +"/"+ app.name, {
                spec: {
                    template: {
                        spec: {
                            containers: [{
                                name: containers[0].name,
                                env,
                            }]
                        }
                    }
                }
            },{
                headers: {'Content-Type': 'application/strategic-merge-patch+json'}
            }).catch(()=>{})
        },
        submitDomainForm(eve){
            this.normalizeDirectAppTarget(this.domainForm);
            return new Promise((resolve,reject)=>{
                if(this.domainForm.originType == 2 && !this.hasAppOptions){
                    this.$message.warning('暂无应用可选');
                    reject();
                    return;
                }
                if(this.$refs.domainForm){
                    this.$refs.domainForm.validate((err) => {
                        if (err) { reject(); return; }
                        resolve();
                    });
                }else{
                    resolve();
                }
            }).then(async ()=>{
                let fullDomain = this.domainForm.domain;
                if(this.whiteList.length && this.domainForm.whiteDomain!=-1){
                    fullDomain = /\.$/.test(fullDomain)? fullDomain : (fullDomain + '.');
                    fullDomain = fullDomain + this.whiteList?.[this.domainForm.whiteDomain]?.domain;
                }
                if(this.domainForm.name){
                    let data = this.dataList.find(i=>i?.metadata?.name==this.domainForm.name)
                    if(!data || !data.spec){return}
                    data = JSON.parse(JSON.stringify(data))

                    if(!data.spec.rules){return}

                    data.spec.rules[0].host = fullDomain;
                    
                    delete data.metadata.resourceVersion;
                    delete data.metadata.generation;
                    delete data.metadata.creationTimestamp;
                    delete data.metadata.uid;
                    delete data.status;
                    
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
                            secretName: this.domainToname(fullDomain) + "-tls-secret"
                        }]
                    }else{
                        delete data.metadata.annotations['cert-manager.io/cluster-issuer'];
                        delete data.metadata.annotations['cert-manager.io/renew-before'];
                        delete data.spec.tls;
                    }
                    if(this.domainForm.ingressclass){
                        data.metadata.annotations['kubernetes.io/ingress.class'] = this.inRvproxy? 'higress' : (this.domainForm?.ingressclass || 'higress');
                    }
                    
                    // if(this.inRvproxy){
                    //     data.metadata.annotations['higress.io/destination'] = this.domainForm.destination;
                    //     data.metadata.annotations['destination'] = this.domainForm.destination?.replace(/\..*$/,'');
                    //     data.metadata.labels['higress.io/destination'] = this.domainForm.destination;
                    //     data.metadata.labels['destination'] =this.domainForm.destination?.replace(/\..*$/,'');
                    // }
                    
                    // 修改默认域名
                    if(this.domainForm.is_default){
                        let domain = (this.domainForm.auto_ssl?'https://':'http://') + fullDomain;
                        try{
                            await k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.$route.params.group, {
                                metadata: {
                                    annotations: { 'w7.cc/default-domain': domain }
                                }
                            },{
                                headers: {'Content-Type': 'application/merge-patch+json'}
                            })
                        }catch{}
                        try{
                            await this.patchFirstAppStartParamsDomainUrl(domain);
                        }catch{}
                    }
                    return k8sproxy.put("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+this.domainForm.name, data, {loading:true}).then(async res=>{
                        // 修改子目录 域名 ssl
                        let list = this.dataList.filter(i=>i?.metadata?.labels?.parents==res.data.metadata.name)
                        if(list.length){
                            useLoadingStore().loading = true;
                            await Promise.all(list.map(i=>{
                                let data = JSON.parse(JSON.stringify(i))
                                if(!data || !data.spec || !data.spec.rules){return}
                                
                                data.spec.rules[0].host = fullDomain;
                                delete data.metadata.creationTimestamp;
    
                                if(this.domainForm.auto_ssl){
                                    data.metadata.annotations['cert-manager.io/cluster-issuer'] = 'w7-letsencrypt-prod';
                                    data.metadata.annotations['cert-manager.io/renew-before'] = '30m';
                                    data.spec.tls = [{
                                        hosts: [fullDomain],
                                        secretName: this.domainToname(fullDomain) + "-tls-secret"
                                    }]
                                }else{
                                    delete data.metadata.annotations['cert-manager.io/cluster-issuer'];
                                    delete data.metadata.annotations['cert-manager.io/renew-before'];
                                    delete data.spec.tls;
                                }
    
                                return k8sproxy.put("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+data.metadata.name, data);
                            })).finally(()=>{
                                useLoadingStore().loading = false;
                            });
                        }

                        this.domainForm.show = false;
                        if(!eve.noMessage){
                            this.$message.success("修改成功");
                            this.getList(this.patchApp);
                        }
                        if(this.inRvproxy){return res;}
                        // 修改 ingressDomains
                        let find = this.ingressDomains.find(i=>i.ing_name==this.domainForm.name)
                        if(find && !eve.fromCard){
                            find.host = fullDomain;
                            find.auto_ssl = this.domainForm.auto_ssl;
                            
                            k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.$route.params.group,
                                {metadata: { annotations: {'w7.cc/ingress-domains': JSON.stringify(this.ingressDomains)}}},
                                {headers: {'Content-Type': 'application/merge-patch+json'}},
                            ).then(res=>{
                                this.refreshGroup();
                                this.$emit('refresh');
                            })
                        }
                        return res;
                    })
                } else {
                    let backend = {
                        "resource": {
                            "apiGroup": "networking.higress.io",
                            "kind": "McpBridge",
                            "name": "default"
                        }
                    };
                    if(this.domainForm.originType==2 && this.domainForm.app && this.domainForm.port){
                        backend = {
                            service: {
                                name: this.domainForm.app,
                                port: {number: Number(this.domainForm.port)},
                            }
                        }
                    }
                    if(this.domainForm.originType==3){ backend = type3Backend; }
                    let data = {
                        apiVersion: 'networking.k8s.io/v1',
                        kind: 'Ingress',
                        metadata: {
                            name: 'ing-'+this.createName(),
                            namespace: this.namespaceActive,
                            annotations: {
                                'kubernetes.io/ingress.class': this.inRvproxy? 'higress' : (this.domainForm?.ingressclass || 'higress'),
                                'higress.io/resource-definer': 'higress',
                            },
                            labels: {
                                'higress.io/resource-definer': 'higress',
                                app: this.inRvproxy? '' : this.$route.params.id,
                                group: this.inRvproxy? '' : this.$route.params.group,
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
                        data.metadata.annotations['w7.cc/ssl-redirect'] = 'false';
                        data.spec.tls = [{
                            hosts: [fullDomain],
                            secretName:  this.domainToname(fullDomain) + "-tls-secret"
                        }]
                    }

                    if(this.domainForm.originType==1){
                        data.metadata.annotations['higress.io/destination'] = this.domainForm.destination;
                        data.metadata.annotations['destination'] = this.domainForm.destination.replace(/\..*$/,'');
                        data.metadata.labels['higress.io/destination'] = this.domainForm.destination;
                        data.metadata.labels['destination'] =this.domainForm.destination.replace(/\..*$/,'');
                    }else if(this.domainForm.originType==2 || this.domainForm.originType==3){
                        delete data.metadata.annotations['higress.io/destination'];
                        delete data.metadata.labels['higress.io/destination'];
                        if(this.inRvproxy){
                            let agent = this.agents?.[0]?.value || '';
                            data.metadata.annotations['destination'] = agent.replace(/\..*$/,'');
                            data.metadata.labels['destination'] = agent.replace(/\..*$/,'');
                        }else{
                            delete data.metadata.annotations['destination'];
                            delete data.metadata.labels['destination'];
                        }
                    }
                    
                    if(this.domainForm.originType==3){
                        data.metadata.labels['w7.cc/zhida'] = "true";
                        
                        let ann = {
                            "higress.io/enable-header-control": "true",
                            "higress.io/request-header-control-add": [
                                `microapp_name ${this.domainForm.zdApp}`,
                                `microapp_do /`,
                                `microapp_leftmenu true`,
                                `microapp_breadcrumb true`,
                                'microapp_needlogin true',
                            ].join('\n')
                        }
                        data.metadata.annotations = {
                            ...data.metadata.annotations,
                            ...ann
                        }
                    }
                    
                    return k8sproxy.post("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses", data).then(res=>{
                        this.domainForm.show = false;
                        if(!eve.noMessage){
                            this.getList(this.patchApp);
                            this.$message.success("创建成功");
                        }
                        return res;
                    })
                }
            })
        },
        // 添加修改子目录
        domainShow(item){
            this.domain.appgroup = '';
            if(item.originType==2 && item.app && this.inRvproxy){
                let find = this.allGroup.find(i=>{
                    return this.allAppList[i.name].find(a=>a.name==item.app);
                })
                if(find){
                    this.domain.appgroup = find.name;
                }
            }
            
            // app: this.$route.params.id,
            // appPorts: this.inRvproxy? '' : (this.appPorts?.[this.$route.params.id] || []),
            this.domain = {
                ...this.domain,
                show: true,
                title: item?.path?'修改子目录':'添加子目录',
                is_create: !item.path,
                port: String(item?.port || ''),
                index: item.index || 0,

                filecache: item.filecache,
                registrycache: item.registrycache,

                app: item?.app || '',
                originType: item.originType || (this.inRvproxy? 1 : 2),
                zdApp: this.inRvproxy? (item?.zdApp || '') : this.currentDirectApp.name,

                appPorts: this.inRvproxy? [] : (this.appPorts[item.app] || []),
                isroot: item.is_root || false,
                path: item?.path?.replace(/^\//,'') || '',
                parent: item.name,
                path_type: item.path_type || 'Prefix',
                ingressclass: item.ingressclass || this.ingressclassList?.[0] || '',
                rewrite: item.rewrite || false,
                rewrite_path: item.rewrite_path || '',
                rewrite_host: item.rewrite_host || '',
                destination: item.destination || '',
                matchHeader: item?.matchHeader || [],
                matchQuery: item?.matchQuery || [],
                matchMethod: item?.matchMethod || [],
                openOther: item?.matchOpen || false,
            }
        },
        // 提交子目录
        submitForm(eve){
            this.normalizeDirectAppTarget(this.domain);
            const parseConfig = (str)=>{
                return str.split('\n').reduce((obj, line) => {
                    const [k, v] = line.trim().split(/\s+/)
                    if(k){
                        obj[k] = (v==='true'||v==='false')? v==='true' : v;
                    }
                    return obj
                }, {})
            }
            return new Promise((resolve,reject)=>{
                if(this.$refs.dialog){
                    this.$refs.dialog.validate((err) => {
                        if (err) { reject(); return; }
                        resolve();
                    });
                }else{
                    resolve();
                }
            }).then(async ()=>{
                let data = null;
                // 添加子目录 = 创建新域名 设置metadata.labels.parents
                
                let backend = {
                    "resource": {
                        "apiGroup": "networking.higress.io",
                        "kind": "McpBridge",
                        "name": "default"
                    }
                };
                if(this.domain.originType==2){
                    backend = {
                        service: {
                            name: this.domain.app,
                            port: { number: Number(this.domain.port), },
                        }
                    }
                }
                if(this.domain.originType==3){ backend = type3Backend; }

                const setAnn = (data)=>{
                    if(this.domain.originType==1){
                        data.metadata.annotations['higress.io/destination'] = this.domain.destination;
                        data.metadata.annotations['destination'] = this.domain.destination.replace(/\..*$/,'');
                        data.metadata.labels['higress.io/destination'] = this.domain.destination;
                        data.metadata.labels['destination'] =this.domain.destination.replace(/\..*$/,'');
                    }else if(this.domain.originType==2 || this.domain.originType==3){
                        delete data.metadata.annotations['higress.io/destination'];
                        delete data.metadata.labels['higress.io/destination'];
                        if(this.inRvproxy){
                            let agent = this.agents?.[0]?.value || '';
                            data.metadata.annotations['destination'] = agent.replace(/\..*$/,'');
                            data.metadata.labels['destination'] = agent.replace(/\..*$/,'');
                        }else{
                            delete data.metadata.annotations['destination'];
                            delete data.metadata.labels['destination'];
                        }
                    }
                    if(this.domain.originType==3){
                        data.metadata.labels['w7.cc/zhida'] = 'true';
                        
                        let key = (data.metadata.annotations['higress.io/enable-header-control']==='true')? 'higress.io/request-header-control-add' : 'disabled.higress.io/request-header-control-add';
                        let obj = parseConfig(data.metadata?.annotations?.[key] || '');
                        obj = {
                            ...obj,
                            microapp_name: this.domain.zdApp,
                            microapp_do: '/',
                            microapp_leftmenu:  true,
                            microapp_breadcrumb: true,
                            microapp_needlogin: true,
                        }
                        data.metadata.annotations[key] = Object.entries(obj).map(([k,v])=>`${k} ${v}`).join('\n');
                    }else{
                        
                        delete data.metadata.labels?.['w7.cc/zhida'];
                        let key = (data.metadata.annotations['higress.io/enable-header-control']==='true')? 'higress.io/request-header-control-add' : 'disabled.higress.io/request-header-control-add';
                        let obj = parseConfig(data.metadata?.annotations?.[key] || '');
                        delete obj.microapp_name;
                        delete obj.microapp_do;
                        delete obj.microapp_leftmenu;
                        delete obj.microapp_breadcrumb;
                        delete obj.microapp_needlogin;
                        data.metadata.annotations[key] = Object.entries(obj).map(([k,v])=>`${k} ${v}`).join('\n');
                    }
                }


                if(this.domain.is_create){
                    data = this.dataList.find(i=>i?.metadata?.name==this.domain.parent)
                    if(!data || !data.spec || !data.spec.rules){return}
                    data = JSON.parse(JSON.stringify(data))

                    // 正则匹配也是Prefix 并且 higress.io/use-regex == true
                    data.metadata.annotations['higress.io/use-regex'] = String(this.domain.path_type=='ImplementationSpecific')

                    data.spec.rules[0].http.paths = [{
                        path: '/' + this.domain.path.replace(/^\//,''),
                        pathType: this.domain.path_type=='ImplementationSpecific'? 'Prefix' : this.domain.path_type,
                        backend: backend,
                    }];
                    
                    delete data.metadata.resourceVersion;
                    delete data.metadata.generation;
                    delete data.metadata.creationTimestamp;
                    delete data.metadata.uid;
                    delete data.status;
                    
                    for(let i in data.metadata?.annotations){
                        if(/^higress\.io\/(prefix|exact|regex)\-match\-(header|query)\-[^-]+$/.test(i)){
                            delete data.metadata.annotations[i];
                        }
                    }
                    // 请求方法
                    delete data.metadata.annotations[(this.domain.openOther?'disabled.':'') + 'higress.io/match-method'];
                    data.metadata.annotations[(this.domain.openOther?'':'disabled.') + 'higress.io/match-method'] = this.domain.matchMethod.join(' ');
                    // 请求头
                    for(let i in data.metadata.annotations){
                        if(/(disabled\.)?higress\.io\/(prefix|exact|regex)-match-header-.+/.test(i)){ delete data.metadata.annotations[i]; }
                    }
                    this.domain.matchHeader.filter(i=>i.key&&i.value).map(i=>{
                        let key = (this.domain.openOther?'':'disabled.') + 'higress.io/' + i.type +'-match-header-' + i.key;
                        data.metadata.annotations[key] = i.value;
                    });
                    // 请求参数
                    for(let i in data.metadata.annotations){
                        if(/(disabled\.)?higress\.io\/(prefix|exact|regex)-match-query-.+/.test(i)){ delete data.metadata.annotations[i]; }
                    }
                    this.domain.matchQuery.filter(i=>i.key&&i.value).map(i=>{
                        let key = (this.domain.openOther?'':'disabled.') + 'higress.io/'+ i.type +'-match-query-' + i.key;
                        data.metadata.annotations[key] = i.value;
                    });

                    data.metadata.labels.parents = this.domain.parent;
                    data.metadata.name = 'ing-'+this.createName();
                    // if(data?.spec?.tls?.length){
                    //     let arr = data.spec.tls[0];
                    //     arr.secretName = data.metadata.name + "-tls-secret";
                    // }
                    data.metadata.annotations['higress.io/enable-rewrite'] = this.domain.rewrite? 'true' : 'false';
                    data.metadata.annotations['higress.io/rewrite-target'] = this.domain.rewrite? this.domain.rewrite_path : '';
                    data.metadata.annotations['higress.io/upstream-vhost'] = this.domain.rewrite? this.domain.rewrite_host : '';
                    if(this.domain.ingressclass){
                        data.metadata.annotations['kubernetes.io/ingress.class'] = this.domain.ingressclass;
                    }
                    
                    setAnn(data)
                    
                    return k8sproxy.post("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses", data).then(res=>{
                        this.domain.show = false;
                        if(!eve.noMessage){
                            this.$message.success("创建成功");
                            this.getList(this.patchApp);
                        }
                        return res;
                    })
                } else {
                    data = this.dataList.find(i=>i?.metadata?.name==this.domain.parent)
                    if(!data || !data.spec || !data.spec.rules){return}
                    data = JSON.parse(JSON.stringify(data))
                    
                    // 正则匹配也是Prefix 并且 higress.io/use-regex == true
                    data.metadata.annotations['higress.io/use-regex'] = String(this.domain.path_type=='ImplementationSpecific')

                    data.spec.rules[0].http.paths[this.domain.index] = {
                        path: '/' + this.domain.path.replace(/^\//,''),
                        // pathType: this.domain.path_type,
                        pathType: this.domain.path_type=='ImplementationSpecific'? 'Prefix' : this.domain.path_type,
                        backend: backend,
                    };
                    
                    delete data.metadata.resourceVersion;
                    delete data.metadata.generation;
                    delete data.metadata.creationTimestamp;
                    delete data.metadata.uid;
                    delete data.status;
                    
                    for(let i in data.metadata?.annotations){
                        if(/^higress\.io\/(prefix|exact|regex)\-match\-(header|query)\-[^-]+$/.test(i)){
                            delete data.metadata.annotations[i];
                        }
                    }
                    // 请求方法
                    delete data.metadata.annotations[(this.domain.openOther?'disabled.':'') + 'higress.io/match-method'];
                    data.metadata.annotations[(this.domain.openOther?'':'disabled.') + 'higress.io/match-method'] = this.domain.matchMethod.join(' ');
                    // 请求头
                    for(let i in data.metadata.annotations){
                        if(/(disabled\.)?higress\.io\/(prefix|exact|regex)-match-header-.+/.test(i)){ delete data.metadata.annotations[i]; }
                    }
                    this.domain.matchHeader.filter(i=>i.key&&i.value).map(i=>{
                        let key = (this.domain.openOther?'':'disabled.') + 'higress.io/' + i.type +'-match-header-' + i.key;
                        data.metadata.annotations[key] = i.value;
                    });
                    // 请求参数
                    for(let i in data.metadata.annotations){
                        if(/(disabled\.)?higress\.io\/(prefix|exact|regex)-match-query-.+/.test(i)){ delete data.metadata.annotations[i]; }
                    }
                    this.domain.matchQuery.filter(i=>i.key&&i.value).map(i=>{
                        let key = (this.domain.openOther?'':'disabled.') + 'higress.io/'+ i.type +'-match-query-' + i.key;
                        data.metadata.annotations[key] = i.value;
                    });

                    data.metadata.annotations['higress.io/enable-rewrite'] = this.domain.rewrite ? 'true' : 'false';
                    data.metadata.annotations['higress.io/rewrite-target'] = this.domain.rewrite? this.domain.rewrite_path : '';
                    data.metadata.annotations['higress.io/upstream-vhost'] = this.domain.rewrite? this.domain.rewrite_host : '';
                    if(this.domain.ingressclass){
                        data.metadata.annotations['kubernetes.io/ingress.class'] = this.domain.ingressclass;
                    }

                    setAnn(data)
                    
                    return k8sproxy.put("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+this.domain.parent, data, {loading:true}).then(res=>{
                        this.domain.show = false;
                        if(!eve.noMessage){
                            this.$message.success("修改成功");
                            this.getList(this.patchApp);
                        }
                        return res;
                    })
                }
            });
        },
        overStrategy(){
            if(!this.checkList?.length || this.checkList.length<=1){return}
            
        },
        openStrategy(item){
            if(!item && this.checkList.length){

                let data = this.dataList.find(i=>i?.metadata?.name==this.checkList[0]) || {};
                if(!data || !data.spec){return}
                this.strategy = {
                    show: false,
                    data: data,
                    multiple: true,
                }
                this.$nextTick(async ()=>{
                    let ann = this.$refs.domainstrategy.multipleAsync();
                    let operations = [{
                        op: 'replace',
                        path: '/metadata/annotations',
                        value: ann,
                    }]
                    // console.log(ann);
                    // return;
                    for(let i in this.checkList){
                        let name = this.checkList[i];
                        await k8sproxy.patch('/apis/networking.k8s.io/v1/namespaces/'+ this.namespaceActive +'/ingresses/'+name, operations, {
                            headers: {'Content-Type': 'application/json-patch+json'},
                            loading: true,
                        }).then(res=>{}).catch(()=>{});
                    }
                    
                    this.$message.success("操作成功");
                    this.multipleStrategyShow = false;
                    this.getList();
                })
                return;
            }
            let data = this.dataList.find(i=>i?.metadata?.name==item.name) || {};
            if(!data || !data.spec){
                this.$message.warning('数据异常，无法编辑策略');
                return;
            }
            this.strategy.multiple = false;
            this.strategy.data = data;
            this.strategy.submit = (operations, callback)=>{
                k8sproxy.patch('/apis/networking.k8s.io/v1/namespaces/'+ this.namespaceActive +'/ingresses/'+item.name, operations, {
                    headers: {'Content-Type': 'application/json-patch+json'},
                }).then(res=>{
                    this.$message.success("保存成功");
                    if(callback){
                        callback();
                    }
                    this.getList(()=>{
                        let data = this.dataList.find(i=>i?.metadata?.name==item.name) || {};
                        this.strategy.data = data;
                    });
                });
            }
            this.strategy.show = true;
        },
        async toDelete(row,opt){
            if(row.part.length>1){
                // return this.$message.warning('请先删除子目录');
                for(let i=0; i<row.part.length; i++){
                    if(row.part[i]?.is_root){continue}
                    await this.delPath(row.part[i], true);
                }
            }
            await this.cleanupIngressPluginRules([row.name]);
            return k8sproxy.delete("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+ row.name).then(res=>{
                if(!res?.data){return}
                if(!opt?.noMessage){ this.$message.success('删除成功'); }
                
                if(this.inRvproxy){
                    if(!opt?.noMessage){ this.getList(); }
                    return;
                }else if(this.fileCache.exist){
                    try{
                        axios.post(this.fileCache.backendUrl + '/api/setting/del',{
                            group: row.host,
                            path_prefix: row.part?.[0]?.path,
                        },{
                            noAlert: true,
                            customToken: this.fileCache.token,
                        })
                    }catch{}
                }

                // 删除group w7.cc/ingress-domains
                let find = this.ingressDomains.find(i=>i.ing_name==row.name);
                if(!find){
                    if(!opt?.noMessage){this.getList(this.patchApp);}
                    return;
                }

                this.ingressDomains.splice(this.ingressDomains.findIndex(i=>i.ing_name==row.name),1);

                return k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.$route.params.group,
                    {metadata:{annotations: {'w7.cc/ingress-domains': JSON.stringify(this.ingressDomains)}}},
                    {headers: {'Content-Type': 'application/merge-patch+json'}}
                ).then(res=>{
                    if(!opt?.noMessage){
                        this.getList(this.patchApp);
                    }
                });
            })
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
        domainToname(str){
            return str.replace(/\*/g,'x').replace(/(\.|\/|_)/g,'-').toLowerCase();
        },
    },
}
</script>

<style scoped>
.topcard{width:400px;margin:10px 20px 0 0;}
.topcard .listbox .item{min-height:28px;}
.direct-app-option{
    display: flex;
    flex-direction: column;
    padding: 3px 0;
    line-height: 20px;
}
.direct-app-option small{
    color: var(--color-text-3);
    font-size: 11px;
    line-height: 16px;
}
.table-expand-btn{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    margin-right: 16px;
    padding: 0;
    color: var(--color-text-2);
    font-size: 12px;
    line-height: 14px;
    background-color: var(--color-neutral-3);
    border: 1px solid transparent;
    border-radius: 2px;
    outline: none;
    cursor: pointer;
    transition: background-color .1s cubic-bezier(0,0,1,1)
}
.table-expand-btn:hover{
    color: var(--color-text-1);
    background-color: var(--color-neutral-4);
    border-color: transparent;
}
</style>
<style>
.arco-card.topcard .arco-card-body{height:146px; overflow:auto;}
.domain-table .first-checkbox.arco-checkbox-checked .arco-checkbox-icon{background:rgb(var(--orange-5));}
</style>
