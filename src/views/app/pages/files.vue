<template>
    <div>
        <!-- <div class="page-title df ai-c">文件管理</div> -->
        <div class="padding-20 bg-white">
            <!-- <route-breadcrumb :data="{id:title}" /> -->
            
            <div v-if="noCommand || appStatus!=1" class="bg-white ">
                <div class="df df-c ai-c c-99 fs-18" style="margin-top:90px;">
                    <icon-exclamation-circle class="c-cc" style="font-size:60px;" />
                    <div class="mt-20">暂无数据</div>
                </div>
            </div>
            <div v-else class="bg-white ">
                <div class="df jc-b">
                    <div class="df">
                        <a-button-group class="btn-groups" size="small" type="outline" status="normal">
                            <a-button @click="openUpload">上传文件</a-button>

                            <a-dropdown @select="handleSelect">
                                <a-button type="outline">
                                    <span>新建</span>
                                    <icon-down class="ml-4"/>
                                </a-button>
                                <template #content>
                                    <a-doption @click="openCreateFile(false)">新建文件</a-doption>
                                    <!-- <a-doption @click="openCreateFile(true)">新建文件（永久）</a-doption> -->
                                    <a-doption @click="openCreateDir">新建文件夹</a-doption>
                                </template>
                            </a-dropdown>

                        </a-button-group>
                        
                        <a-button v-if="outEditorLink" type="outline" class="ml-20" size="small" :href="outEditorLink" target="_blank">
                            <template #icon>
                                <icon-code />
                            </template>
                            <span>开发编辑器</span>
                        </a-button>
                    </div>
                    <div class="df">
                        <div v-if="fileCatch.length || mfEdit" class="df ai-c ml-20">
                            <a-alert class="commit-alert">您提交的永久文件目前是预览模式，尚未生效，点击“立即生效”后等待几分钟生效！</a-alert>
                            <a-button type="outline" class="ml-20" size="small" @click="submitCatch">立即生效</a-button>
                        </div>
                        <a-button-group v-if="selectedKeys.length>0 || copy || shear" class="btn-groups ml-20" size="small" type="outline" status="normal">
                            <a-button v-if="selectedKeys.length>0" :disabled="selectedKeys.length!=1" @click="copyAct({name:selectedKeys[0]})">
                                <icon-copy />
                                <span class="ml-4">复制</span>
                            </a-button>
                            <a-button v-if="selectedKeys.length>0" :disabled="selectedKeys.length!=1" @click="shearAct({name:selectedKeys[0]})">
                                <icon-cut />
                                <span class="ml-4">剪切</span>
                            </a-button>
                            <a-button v-if="copy||shear" @click="toPaste">
                                <icon-paste />
                                <span class="ml-4">粘贴</span>
                            </a-button>
                            <a-button v-if="selectedKeys.length>0" @click="compressAct(null, true)">
                                <icon-import />
                                <span class="ml-4">压缩</span>
                            </a-button>
                            <a-button v-if="selectedKeys.length>0" @click="authorityEdit(null, true)">
                                <icon-user-group />
                                <span class="ml-4">权限</span>
                            </a-button>
                            <a-popconfirm v-if="selectedKeys.length>0" :content="'确认要删除选中内容吗'" @ok="deleteFile(null, true)" position="lt">
                                <a-button><icon-delete /><span class="ml-4">删除</span></a-button>
                            </a-popconfirm>
                        </a-button-group>
                    </div>
                </div>
                
                <div class="df mt-20">
                    <a-breadcrumb separator="/" class="pathbox bg-white fc" style="overflow:hidden;">
                        <a-breadcrumb-item @click="toPath('root')" class="item cursor">根目录</a-breadcrumb-item>
                        <a-breadcrumb-item v-for="(item,index) in pathArr" :key="item" class="item cursor" @click="toPath(index)">{{ item }}</a-breadcrumb-item>
                    </a-breadcrumb>
                </div>
                
                <a-table :data="fileList" class="mt-20 filetable" :row-selection="rowSelection" v-model:selectedKeys="selectedKeys" :pagination="false">
                    <template #columns>
                        <a-table-column title="名称">
                            <template #cell="{ record }">
                                <div class="df ai-c">
                                    <a-tooltip v-if="record.type!=='symlink'" :content="form.isMount || testForever(partPath + record.name)?'永久文件':'临时文件'">
                                        <span v-if="form.isMount || testForever(partPath + record.name)" class="point green"></span>
                                        <span v-else class="point gray"></span>
                                    </a-tooltip>
                                    <a-tooltip v-else :content="testSymlink(record)?'永久文件':'临时文件'">
                                        <span v-if="testSymlink(record)" class="point green"></span>
                                        <span v-else class="point gray"></span>
                                    </a-tooltip>

                                    <img v-if="record.type=='directory'" src="@/assets/image/_dir.png" style="width:20px;height:20px;" class="icon" />
                                    <img v-else-if="record.is_zip" src="@/assets/image/_zip.png" style="width:20px;height:20px;" class="icon" />
                                    <!-- dir link -->
                                    <img v-else-if="record.type=='symlink' && record.is_dir" src="@/assets/image/_ldir.png" style="width:20px;height:20px;" class="icon" />
                                    <!-- file link -->
                                    <img v-else-if="record.type=='symlink' &&!record.is_dir" src="@/assets/image/_lfile.png" style="width:20px;height:20px;" class="icon" />
                                    <img v-else src="@/assets/image/_file.png" style="width:20px;height:20px;" class="icon" />

                                    <input v-if="rename.row && rename.row === record" type="text" class="renameinput" v-model="rename.name" @blur="renameSubmit" @keydown.enter="renameSubmit" :spellcheck="false" />
                                    <span v-else class="ml-10 filename fs-14 one-hide" :title="record.name" style="display:-webkit-box;" @click="intoFile(record)">{{ record.name }}</span>
                                </div>
                            </template>
                        </a-table-column>
                        <a-table-column title="权限/所有者">
                            <template #cell="{ record }">{{ record.power }} / {{ record.user }}</template>
                        </a-table-column>
                        <a-table-column title="大小" data-index="filesize"></a-table-column>
                        <a-table-column title="修改时间" data-index="utime"></a-table-column>
                        <a-table-column title="操作" :width="320">
                            <template #cell="{ record }">
                                <div class="options">
                                    <a-tooltip v-if="record.type=='file' && !record.fromFileCatch" content="下载">
                                        <i class="opt-icon" @click="downzip(record)"><icon-download /></i>
                                    </a-tooltip>
                                    <a-tooltip v-if="!record.fromFileCatch" content="复制">
                                        <i class="opt-icon" @click="copyAct(record)"><icon-copy /></i>
                                    </a-tooltip>
                                    <a-tooltip v-if="!record.fromFileCatch" content="剪切">
                                        <i class="opt-icon" @click="shearAct(record)"><icon-scissor /></i>
                                    </a-tooltip>
                                    <a-tooltip content="重命名">
                                        <i class="opt-icon" @click="renameEdit(record)"><icon-pen /></i>
                                    </a-tooltip>
                                    <a-tooltip v-if="!record.fromFileCatch" content="压缩">
                                        <i class="opt-icon" @click="compressAct(record)"><icon-import /></i>
                                    </a-tooltip>
                                    <a-tooltip v-if="record.is_zip" content="解压">
                                        <i class="opt-icon" @click="uncompressAct(record)"><icon-export /></i>
                                    </a-tooltip>
                                    <a-tooltip content="权限">
                                        <i class="opt-icon" @click="authorityEdit(record)"><icon-user-group /></i>
                                    </a-tooltip>
                                    <a-popconfirm :content="'确认要删除'+ record.name +'吗'" @ok="deleteFile(record)" position="lt">
                                        <a-tooltip content="删除">
                                            <i class="opt-icon"><icon-delete /></i>
                                        </a-tooltip>
                                    </a-popconfirm>
                                </div>
                            </template>
                        </a-table-column>
                    </template>
                </a-table>
            </div>
            
        </div>
        
        <a-modal :visible="file.dialog" width="1400px" top="3vh" @cancel="handleModalCancel" :mask-closable="false" :popup-container="false?'#allmodalbox':'body'" modal-class="editor-modal" body-class="editor-modal-body" :footer="false">
            <template #title>
                <div class="editor-header">
                    <span class="editor-title-text">文本编辑器</span>
                    <span class="editor-current-file" v-if="currentTab">{{ currentTab.name }}</span>
                </div>
            </template>
            <div class="editor-wrapper">
                <div class="editor-container">
                    <!-- 左侧文件列表 -->
                    <div class="editor-sidebar">
                        <div class="sidebar-header">
                            <icon-folder /> 文件列表
                            <span class="sidebar-refresh" @click="refreshSidebar" title="刷新">
                                <icon-refresh :spin="file.sidebarLoading" />
                            </span>
                            <span class="sidebar-back" @click="sidebarGoBack" v-if="file.sidebarPath && file.sidebarPath !== '/'">
                                <icon-up /> 返回
                            </span>
                        </div>
                        <div class="sidebar-path" v-if="file.sidebarPath">
                            <span class="path-text">{{file.sidebarPath}}</span>
                        </div>
                        <div class="sidebar-content" v-if="file.sidebarFiles.length > 0">
                            <div 
                                v-for="(item, index) in file.sidebarFiles" 
                                :key="index"
                                class="sidebar-file-item"
                                :class="{'active': isFileActive(item), 'is-dir': item.is_dir, 'is-symlink': item.is_symlink}"
                                @click="openSidebarFile(item)"
                                :title="getItemTitle(item)"
                            >
                                <icon-storage v-if="item.is_symlink" />
                                <icon-file v-else-if="!item.is_dir" />
                                <icon-folder v-else />
                                <span class="file-name">{{item.name}}</span>
                                <span class="file-size" v-if="!item.is_dir && item.size">{{formatSize(item.size)}}</span>
                            </div>
                        </div>
                        <div class="sidebar-content" v-else-if="file.sidebarLoading">
                            <div class="sidebar-loading">
                                <icon-loading /> 加载中...
                            </div>
                        </div>
                        <div class="sidebar-content" v-else-if="file.sidebarError">
                            <div class="sidebar-error">
                                <icon-close-circle /> {{file.sidebarError}}
                                <!-- <div class="sidebar-error-actions">
                                    <a-button size="small" @click="refreshSidebar">重试</a-button>
                                </div> -->
                            </div>
                        </div>
                        <div class="sidebar-content" v-else>
                            <div class="sidebar-empty">
                                <icon-empty /><span>暂无文件</span>
                                <span class="sidebar-back-empty" @click="sidebarGoBack" v-if="file.sidebarPath && file.sidebarPath !== '/'">
                                    <icon-up /><span>返回上级</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <!-- 右侧编辑器 -->
                    <div class="editor-main">
                        
                        <!-- 标签栏 -->
                        <div class="editor-tabs-bar">
                            <span class="tabs-scroll-btn" @click="scrollTabs(-150)" v-show="showTabsScrollLeft">
                                <icon-left />
                            </span>
                            <div class="editor-tabs-scroll" ref="tabsScrollRef" @scroll="updateTabsScrollButtons">
                                <div 
                                    v-for="(tab, index) in file.openTabs" 
                                    :key="index"
                                    class="editor-tab"
                                    :class="{'active': index === file.activeTabIndex, 'modified': tab.modified}"
                                    @click="switchTab(index)"
                                    :title="tab.path"
                                >
                                    <span class="tab-name">{{ tab.name }}</span>
                                    <span class="tab-close" @click.stop="closeTab(index)" v-if="file.openTabs.length > 1">
                                        <icon-close />
                                    </span>
                                </div>
                            </div>
                            <span class="tabs-scroll-btn" @click="scrollTabs(150)" v-show="showTabsScrollRight">
                                <icon-right />
                            </span>
                        </div>
                        <!-- 搜索面板 -->
                        <div class="search-panel" v-if="searchPanel.visible">
                            <div class="search-panel-row">
                                <a-input 
                                    v-model="searchPanel.query" 
                                    placeholder="搜索..." 
                                    size="small"
                                    ref="searchInputRef"
                                    @input="doSearch"
                                    @keydown.enter="findNext"
                                    @keydown.escape="closeSearchPanel"
                                    allow-clear
                                >
                                    <template #prefix><icon-search /></template>
                                </a-input>
                                <a-input 
                                    v-if="searchPanel.showReplace" 
                                    v-model="searchPanel.replace" 
                                    placeholder="替换为..." 
                                    size="small"
                                    @keydown.enter="replaceNext"
                                    allow-clear
                                />
                                <div class="search-actions">
                                    <a-tooltip content="替换 (Ctrl+H)" v-if="!searchPanel.showReplace">
                                        <a-button size="small" @click="searchPanel.showReplace = true">
                                            <icon-swap />
                                        </a-button>
                                    </a-tooltip>
                                    <a-tooltip content="查找下一个 (Enter)">
                                        <a-button size="small" @click="findNext">
                                            <icon-down />
                                        </a-button>
                                    </a-tooltip>
                                    <a-tooltip content="查找上一个 (Shift+Enter)">
                                        <a-button size="small" @click="findPrev">
                                            <icon-up />
                                        </a-button>
                                    </a-tooltip>
                                    <a-tooltip content="全部替换" v-if="searchPanel.showReplace">
                                        <a-button size="small" @click="replaceAll">
                                            全部
                                        </a-button>
                                    </a-tooltip>
                                    <a-tooltip content="关闭 (Esc)">
                                        <a-button size="small" @click="closeSearchPanel">
                                            <icon-close />
                                        </a-button>
                                    </a-tooltip>
                                </div>
                            </div>
                            <div class="search-info" v-if="searchPanel.query">
                                <span v-if="searchPanel.matchCount > 0">
                                    {{ searchPanel.currentMatch }} / {{ searchPanel.matchCount }} 个匹配
                                </span>
                                <span v-else class="no-match">无匹配</span>
                                <label class="search-option">
                                    <a-checkbox v-model="searchPanel.caseSensitive" @change="doSearch">区分大小写</a-checkbox>
                                </label>
                                <label class="search-option">
                                    <a-checkbox v-model="searchPanel.wholeWord" @change="doSearch">全词匹配</a-checkbox>
                                </label>
                                <label class="search-option">
                                    <a-checkbox v-model="searchPanel.useRegex" @change="doSearch">正则表达式</a-checkbox>
                                </label>
                            </div>
                        </div>
                        <div id="editor_textarea"></div>
                        <!-- 改进的底部工具栏 -->
                        <div class="editor-toolbar" v-if="currentTab">
                            <!-- 左侧设置 -->
                            <div class="toolbar-right">
                                
                                <a-checkbox v-if="!file.fromFileCatch&&origin!='nodes'" v-model="file.forever" :disabled="form.isMount && !file.mf">
                                    <template #checkbox="{ checked }">
                                        <span class="toolbar-toggle" :class="{'active': checked, 'disabled':form.isMount && !file.mf}">
                                            <span style="font-size:11px;">永久文件</span>
                                        </span>
                                    </template>
                                </a-checkbox>
                                
                                <a-tooltip content="搜索">
                                    <span class="toolbar-toggle" @click="openSearchPanel">
                                        <icon-search />
                                        <span>搜索</span>
                                    </span>
                                </a-tooltip>
                                
                                <a-tooltip content="自动换行">
                                    <span class="toolbar-toggle" :class="{'active': file.wordWrap}" @click="toggleWordWrap">
                                        <icon-indent :style="file.wordWrap ? 'color: #165dff' : ''" />
                                        <span>换行</span>
                                    </span>
                                </a-tooltip>
                                <a-dropdown trigger="click">
                                    <span class="toolbar-encoding">
                                        {{ file.encoding }}
                                        <icon-down />
                                    </span>
                                    <template #content>
                                        <a-doption v-for="enc in encodingOptions" :key="enc" :value="enc" @click="changeEncoding(enc)">{{ enc }}</a-doption>
                                    </template>
                                </a-dropdown>
                                <span class="status-hint">Ctrl+S 保存</span>
                            </div>
                            <!-- 中间状态信息 -->
                            <div class="toolbar-center">
                                <span v-if="currentTab.readOnly" class="status-readonly">
                                    <icon-lock /> 只读
                                </span>
                                <span v-if="currentTab.modified" class="status-modified">
                                    ● 已修改
                                </span>
                                <span class="status-cursor" v-if="editorCursor.line > 0">
                                    行 {{ editorCursor.line }}, 列 {{ editorCursor.column }}
                                </span>
                                <span class="status-language" v-if="editorLanguage">
                                    {{ editorLanguage }}
                                </span>
                                <span class="status-size" v-if="currentTab.size">
                                    {{ formatSize(currentTab.size) }}
                                </span>
                            </div>
                            <!-- 右侧操作按钮 -->
                            <div class="toolbar-left">
                                <a-button type="primary" size="small" @click="savefile" :disabled="currentTab.readOnly">
                                    <template #icon><icon-save /></template>
                                    保存
                                </a-button>
                                <a-button size="small" @click="closeEditor">
                                    <template #icon><icon-close /></template>
                                    关闭
                                </a-button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </a-modal>

        <a-modal v-model:visible="upload.show" width="500px" @cancel="upload.show=false;" :footer="false" :popup-container="false?'#allmodalbox':'body'">
            <template #title>上传文件</template>
            <a-form v-model="upload" class="" label-width="100px">
                <a-form-item label="文件目录：">
                    <a-input readonly v-model="upload.dir" />
                </a-form-item>
                <a-form-item label="上传文件：">
                    <div>
                        <div class="upload">
                            <div v-if="upload.filename" class="c-blue lh-1" style="padding:9px 0; width:360px;word-wrap: break-word; ">{{upload.filename}}</div>
                            <a-button v-else :loading="upload.uploading" >{{upload.uploading? '上传中' : '上传'}}</a-button>
                            <input id="uploadfileinput" type="file" :disabled="upload.uploading" @change="selectFile" />
                        </div>
                        <a-checkbox v-model="upload.forever" :disabled="form.isMount || origin=='nodes'" class="mt-10">永久文件</a-checkbox>
                    </div>
                </a-form-item>
                
                <div class="txt-r">
                    <a-button type="primary" @click="downloadzip" :loading="upload.uploading">开始上传</a-button>
                </div>
            </a-form>
        </a-modal>

        <a-drawer :visible="authority.show" width="900px" @ok="changeAuthority" @cancel="authority.show=false;" :popup-container="false?'#allmodalbox':'body'">
            <template #title>修改权限</template>
            <a-form layout="vertical">
                <div class="df padding-10">
                    <div class="fc">
                        <a-card title="所有者">
                            <a-checkbox-group v-model="authority.a1" direction="vertical">
                                <a-checkbox value="4">读取</a-checkbox>
                                <a-checkbox value="2">写入</a-checkbox>
                                <a-checkbox value="1">执行</a-checkbox>
                            </a-checkbox-group>
                        </a-card>
                    </div>
                    <div class="fc ml-20">
                        <a-card title="用户组">
                            <a-checkbox-group v-model="authority.a2" direction="vertical">
                                <a-checkbox value="4">读取</a-checkbox>
                                <a-checkbox value="2">写入</a-checkbox>
                                <a-checkbox value="1">执行</a-checkbox>
                            </a-checkbox-group>
                        </a-card>
                    </div>
                    <div class="fc ml-20">
                        <a-card title="公共">
                            <a-checkbox-group v-model="authority.a3" direction="vertical">
                                <a-checkbox value="4">读取</a-checkbox>
                                <a-checkbox value="2">写入</a-checkbox>
                                <a-checkbox value="1">执行</a-checkbox>
                            </a-checkbox-group>
                        </a-card>
                    </div>
                </div>
                <a-divider />
                <a-row :gutter="16">
                    <a-col :span="8">
                        <a-form-item label="权限值">
                            <a-input v-model="authority.chmod" :max-length="3" placeholder="如：755" />
                        </a-form-item>
                    </a-col>
                    <a-col :span="8">
                        <a-form-item label="所有者">
                            <a-auto-complete
                                v-model="authority.chown"
                                :data="userArr.map(u => ({ label: u.name, value: String(u.id) }))"
                                :filter-option="(inputValue, option) => {
                                    if (!inputValue) return true;
                                    return option.label.toLowerCase().startsWith(inputValue.toLowerCase()) || 
                                           option.value.startsWith(inputValue);
                                }"
                                placeholder="输入用户名或UID搜索"
                                allow-clear
                            />
                        </a-form-item>
                    </a-col>
                    <a-col :span="8">
                        <a-form-item label="递归">
                            <a-checkbox v-model="authority.recursive">包含子目录</a-checkbox>
                        </a-form-item>
                    </a-col>
                </a-row>
            </a-form>
        </a-drawer>
        
        <a-modal v-model:visible="compress.show" width="600px" @cancel="compress.show=false;" :footer="false" :popup-container="false?'#allmodalbox':'body'">
            <template #title>压缩</template>
            <a-form :model="compress" label-width="100px">
                <a-form-item label="压缩类型">
                    <a-select v-model="compress.type" style="width:100%;" @change="onCompressTypeChange">
                        <a-option label="zip（通用格式）" value="zip"></a-option>
                        <a-option label="tar（无压缩）" value="tar"></a-option>
                        <a-option label="tar.gz（gzip压缩）" value="tar.gz"></a-option>
                        <a-option label="tar.xz（xz压缩）" value="tar.xz"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="压缩路径">
                    <a-input v-model="compress.path" :spellcheck="false"></a-input>
                </a-form-item>
                <a-form-item style="margin-top:30px;">
                    <a-button @click="zipAct" type="primary" style="width:80px;">压缩</a-button>
                </a-form-item>
            </a-form>
        </a-modal>
        
        <a-modal v-model:visible="uncompress.show" width="600px" @cancel="uncompress.show=false;" :footer="false" :popup-container="false?'#allmodalbox':'body'">
            <template #title>解压</template>
            <a-form v-if="uncompress.show" label-width="100px">
                <a-form-item label="文件名">
                    <a-input readonly :default-value="decodeURIComponent(showPath+uncompress.row.name)"></a-input>
                </a-form-item>
                <a-form-item label="解压到">
                    <a-input v-model="uncompress.path"></a-input>
                </a-form-item>
                <!-- <a-form-item label="">
                    <a-checkbox v-model="uncompress.gbk">转换gbk文件名</a-checkbox>
                </a-form-item> -->
                <a-form-item style="margin-top:30px;">
                    <a-button @click="unzipAct" type="primary" style="width:80px;">解压</a-button>
                </a-form-item>
            </a-form>
        </a-modal>
        
        <a-modal v-model:visible="createFilePrompt.show" width="" @ok="createFilePrompt.ok" @cancel="createFilePrompt.show=false;"  :popup-container="false?'#allmodalbox':'body'">
            <template #title>{{createFilePrompt.type=='file'?'新建文件':'新建文件夹'}}</template>
            <div>
                <div>{{createFilePrompt.type=='file'?'请输入文件名称':'请输入文件夹名称'}}</div>
                <a-input v-model="createFilePrompt.name" style="width:100%;margin-top:10px;" :spellcheck="false" placeholder="请输入名称" />
                <a-checkbox v-if="createFilePrompt.type=='file'" v-model="createFilePrompt.isConfig" :disabled="createFilePrompt.disabeld || origin=='nodes'" class="mt-10">永久文件</a-checkbox>
            </div>
        </a-modal>
        
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import axios from 'axios'
import {basicSetup} from "codemirror"
import {EditorView, keymap, Decoration} from "@codemirror/view"
import {Compartment, StateEffect, EditorSelection} from "@codemirror/state"
import { StreamLanguage, HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { javascript } from "@codemirror/lang-javascript"
import { html } from "@codemirror/lang-html"
import { css } from "@codemirror/lang-css"
import { json } from "@codemirror/lang-json"
import { yaml } from "@codemirror/lang-yaml"
import { markdown } from "@codemirror/lang-markdown"
import { python } from "@codemirror/lang-python"
import { php } from "@codemirror/lang-php"
import { sql } from "@codemirror/lang-sql"
import { xml } from "@codemirror/lang-xml"
import { cpp, java } from "@codemirror/legacy-modes/mode/clike"
import { shell } from "@codemirror/legacy-modes/mode/shell"
import { go } from "@codemirror/legacy-modes/mode/go"
import { rust } from "@codemirror/legacy-modes/mode/rust"
import { tags } from "@lezer/highlight"
import { useNamespaceStore,useLoadingStore } from '@/store'
import { getToken } from '@/utils/auth';
import { compressFiles, extractFiles } from '@/api/cluster';

const fileRouteName = 'app-detail-files';

export default {
    props: ['data','title','origin','ip','is_component','componentData','appList'],
    components: {},
    data(){
        return {
            namespaceActive: '',
            form: {
                pod_name: '',
                containerName: '',
                namespace: '',
                path: '/',
                isMount: false,
                pid: 1,
            },
            fileList: [],
            rowSelection: {
                type: 'checkbox',
                showCheckedAll: true,
                title: '全选',
                width: 80,
            },
            selectedKeys: [],
            loading: false,
            
            contList: [],
            file:{
                dialog: false,
                title: '',
                sidebarFiles: [],  // 侧边栏文件列表
                sidebarLoading: false,  // 侧边栏加载状态
                sidebarPath: '',  // 侧边栏当前浏览路径
                sidebarError: '',  // 侧边栏错误信息
                currentFile: '',  // 当前编辑的文件名
                openTabs: [],  // 打开的标签页列表 [{name, path, content, modified, readOnly, is_symlink, size}]
                activeTabIndex: 0,  // 当前激活的标签索引
                forever: false,  // 永久文件
                fromFileCatch: false,
                wordWrap: false,  // 自动换行
                encoding: 'UTF-8',  // 文件编码
            },
            editor: null,
            editorLanguage: null,  // 当前编辑器语言
            editorCursor: { line: 0, column: 0 },  // 光标位置
            encodingOptions: ['UTF-8', 'GBK', 'GB2312', 'ISO-8859-1', 'BIG5'],  // 编码选项
            wordWrapCompartment: null,  // 自动换行配置槽

            // 搜索面板
            searchPanel: {
                visible: false,
                query: '',
                replace: '',
                showReplace: false,
                caseSensitive: false,
                wholeWord: false,
                useRegex: false,
                matchCount: 0,
                currentMatch: 0,
            },
            searchDecorator: null,  // CodeMirror 搜索装饰器

            // 标签页滚动
            showTabsScrollLeft: false,
            showTabsScrollRight: false,

            upload:{
                show: false,
                file: '',
                filename: '',
                uploading: false,
                forever: false,
            },

            rename:{
                row: null,
                name: '',
            },

            authority:{
                show: false,
                row: null,
                chmod: '000',
                chown: '',
                a1: [],
                a2: [],
                a3: [],
                recursive: true,
                customInput: false,
            },

            copy: null,
            shear: null,
            csChmod: '', // 复制权限
            csChown: '', // 复制用户
            compress:{
                show: false,
                type: 'zip',
                row: null,
                zipname: '',
            },
            uncompress:{
                show: false,
                row: null,
                gbk: false,
            },

            commondFile:{
                loading: false,
                cupSize: 1024 * 1024 / 2,
            },

            createFilePrompt:{
                show: false,
                type: '',
                name: '',
                ok: null,
            },
            // 暂存文件列表
            fileCatch: [],
            // 挂载目录
            mfDirs: [],
            // 挂载文件
            mfList: [],
            mfEdit: false,

            root: '/',

            noCommand: false,

            userArr: [],
            outEditorInfo: null,
            outEditorLink: '',

            appData: null,
        }
    },
    async created(){
        this.namespaceActive = useNamespaceStore().namespace;
        if((this.$route.name=='dialog-files' || this.is_component) && this.origin!='nodes'){
            // 单独弹窗需要先获取app data
            await this.getData();
        }else{
            this.appData = this.data;
        }
        this.getDataVm();
        await this.first();
        this.getUserByWebDAV();
    },
    beforeDestroy() {
        if (this.editor) {
            this.editor?.destroy();
            this.editor = null;
        }
    },
    // components: { aShit },
    computed:{
        pathArr(){
            if(!this.form.path){ return []; }
            let re = new RegExp('^'+this.root);
            let arr = this.form.path.replace(re,'').replace(/(^\/)|(\/$)/g,'').split('/');
            return arr;
        },
        showPath(){
            let p = '/' + this.form.path.slice(this.root.length);
            return p.replace(/\/$/,'') + '/';
        },
        partPath(){
            return this.form.path.replace(/\/$/,'') + '/';
        },
        appStatus(){
            if(this.origin=='nodes'){return 1}
            let id = this.is_component? this.componentData.id : this.$route.params.id;
            let find = this.appList?.find(i=>i.name==id);
            return find?.status || 1;
        },
        currentTab(){
            return this.file.openTabs[this.file.activeTabIndex] || null;
        },
    },
    watch:{
        data(v,ov){
            if(!ov||!Object.keys(ov)?.length){
                this.appData = v;
                this.getDataVm();
                this.first();
            }
        },
        'form.path'(v,ov){
            // console.log(v);
            this.fileList = [];
            if(/\/\.(\/|$)/.test(v)){this.form.path = v.replace(/\/\.(\/|$)/,'$1') || '/'; return; }
            if(/\/\.\.(\/|$)/.test(v)){ this.form.path = v.replace(/(\/[^/]+)?\/\.\.(\/|$)/,'$2') || '/'; return; }
            this.form.isMount = this.testForever(v, true);
            this.getFileList();
            if(!this.is_component){
                this.$router.push({query:this.$route.query,hash:'#path='+ encodeURIComponent(this.form.path)});
            }
            let o = this.outEditorInfo;
            if(o){
                let wsBaseUrl = `${o.origin}/panel-api/v1/exec`;
                this.outEditorLink = `${o.origin}/ui/plugin/codeblitz/editor.html?ws-base-url=${encodeURIComponent(wsBaseUrl)}&api-url=${o.webdavUrl?.replace(/\/$/,'')}&api-base-path=${o.webdavBasePath?.replace(/\/$/,'')}&initial-path=${encodeURIComponent(v)}&api-token=${encodeURIComponent(o.webdavToken || '')}`;
            }
        },
        'upload.show'(v){
            if(v){return}
            if(document.getElementById('uploadfileinput')){
                document.getElementById('uploadfileinput').value = '';
            }
        },
        'authority.chmod'(v){
            if(!/^[0-7]{3}$/.test(v)){return}
            let arr = [ "", "1", "2", "12", "4", "14", "24", "124" ];
            this.authority.a1 = arr[v[0]].split('');
            this.authority.a2 = arr[v[1]].split('');
            this.authority.a3 = arr[v[2]].split('');
        },
        "fileCatch.length"(v){
            if(v){
                this.$message.info({
                    content: '您提交的永久文件目前是预览模式，尚未生效，点击“立即生效”后等待几分钟生效！',
                    duration: 3000,
                })
            }
            this.refreshCatch();
        },
        'authority.a1':'chengeAuthority',
        'authority.a2':'chengeAuthority',
        'authority.a3':'chengeAuthority',
        mfEdit(v){
            if(v){
                this.$message.info({
                    content: '您提交的永久文件目前是预览模式，尚未生效，点击“立即生效”后等待几分钟生效！',
                    duration: 3000,
                })
            }
        },
    },
    methods:{
        getData(){
            if(this.origin=='nodes'){return}
            let kind = this.is_component? this.componentData.kind : this.$route.params.kind;
            let id = this.is_component? this.componentData.id : this.$route.params.id;
            return k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+kind+"/"+id ).then(res=>{
                let data = res?.data || {};
                this.appData = data;
            }).catch(()=>{
            })
        },
        first(){
            return this.getContList2().then(res=>{
                this.getFileList()
            });
            // if(this.$route.name==fileRouteName){
            //     this.getContList2().then(res=>{
            //         this.getFileList()
            //         this.getUser();
            //     });
            // }else{
            //     this.getContList().then(res=>{
            //         this.getFileList();
            //         this.getUser();
            //     });
            // }
        },
        // getUser(){
        //     if (this.userArr && this.userArr.length > 0) {
        //         return;
        //     }
        //     this.getUserByExec();
        // },
        // getUserByExec(){
        //     let cmd = `cat /etc/passwd`;
        //     if (this.form.pod_name && this.form.namespace) {
        //         panelApi.post(`/exec2`,{
        //             podName: this.form.pod_name,
        //             containerName: this.form.containerName,
        //             tty: false,
        //             namespace: this.form.namespace,
        //             command: ['sh', '-c', cmd],
        //         },{responseType: 'text', noAlert:true}).then(res=>{
        //             if(res?.data){
        //                 this.userArr = this.parseUserInfo(res.data || '');
        //             }
        //         }).catch(()=>{
        //             this.getUserByWebDAV();
        //         });
        //     } else {
        //         this.getUserByWebDAV();
        //     }
        // },
        getUserByWebDAV(){
            let url = `${this.outEditorInfo.origin}${this.outEditorInfo.webdavUrl}/etc/passwd`;
            axios.get(url, { timeout: 5000 }).then(res=>{
                const data = res?.data || '';
                if(data.includes('No such file') || data.includes('<!DOCTYPE') || data.includes('<html') || !data.includes(':') || data.length < 10){
                    console.warn('WebDAV returned invalid data for /etc/passwd');
                    return;
                }
                this.userArr = this.parseUserInfo(data);
            }).catch(err => {
                console.error('获取用户列表失败:', err);
            });
        },
        // 是挂载目录 / 属于挂载目录
        testForever(path, isNotFile){
            path = '/' + path.slice(this.root.length);
            let isMf = false;
            if(this.origin=='nodes'){
                // let p = '/host';
                // isMf = Boolean(path.startsWith(p) && (path.length === p.length || path[p.length] === '/'));
                isMf = false;
            }else{
                isMf = Boolean(this.mfDirs.find(i=>{
                    return path.startsWith(i.mountPath) && (path.length === i.mountPath.length || path[i.mountPath.length] === '/')
                }));
            }
            if(isMf){return true;}
            if(isNotFile){return false;}
            return Boolean(this.mfList.find(i=>i.mountPath == path));
        },
        testSymlink(row){
            let toname = row.name.replace(/^\s*(\S*)\s*->.*$/,'$1');
            let fp = this.partPath + toname;
            return this.testForever(fp, row.is_dir);
        },
        refreshCatch(){
            let list = this.fileList.filter(i=>!i.fromFileCatch);
            list.forEach((item,index)=>{
                if(!item.mf){return}
                let find = this.mfList.find(i=>i.name==item.mf);
                if(find?.delete){ list.splice(index,1); return; }
                if(find?.rename){ item.name = find.rename; }
                if(find?.configMap?.defaultMode){ item.power = find.configMap.defaultMode.toString(8);  }
            })
            list = list.concat(this.fileCatch.filter(i=>i.path==this.showPath).map(i=>{
                return {
                    fromFileCatch: true,
                    disabled: true,
                    key: i.fileName,
                    type: 'file',
                    is_zip: false,
                    power: i.prower,
                    user: i.user,
                    name: i.fileName,
                    value: i.fileValue,
                    size: '',
                    filesize: '',
                    utime: '',
                }
            }))
            // 排序
            list = list.sort((i,j)=>{
                if(i.type!="directory" && j.type=="directory"){return 1;}
                else if(i.type=="directory" && j.type!="directory"){return -1;}
                return i>j;
            })
            this.fileList = list;
        },
        chengeAuthority(){
            let chmod = [0,0,0];
            this.authority.a1.map(i=>{ chmod[0] += Number(i) })
            this.authority.a2.map(i=>{ chmod[1] += Number(i) })
            this.authority.a3.map(i=>{ chmod[2] += Number(i) })
            this.authority.chmod = chmod.join('');
        },
        downzip(row){
            // let data = {
            //     from: (this.origin=='nodes'?'/host':'') + '/proc/'+ this.form.pid+'/root' + (this.form.subPid?`/proc/${this.form.subPid}/root`:'') + this.partPath + row.name,
            //     to: row.name,
            //     upload: 0,
            //     namespace: this.namespaceActive,
            //     podName: this.form.pod_name,
            // }
            // const params = new URLSearchParams();
            // for (let key in data) {
            //     params.append(key, data[key]);
            // }
            // panelApi.post('/cp',params.toString(),{
            //     headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            // }).then(res=>{
            //     const token = getToken();
            //     window.open('/panel-api/v1/download/'+row.name+'?api-token='+token).focus()
            // })

            axios.get(`${this.outEditorInfo.origin}${this.outEditorInfo.webdavUrl}${encodeURI(this.partPath+row.name)}`,{
                responseType: 'blob'
            }).then(async res=>{
                try{
                    const urlObj = URL.createObjectURL(res.data);
                    const a = document.createElement('a');
                    a.href = urlObj;
                    a.download = row.name; // 自定义文件名（带后缀，如test.xlsx）
                    a.click();
                    URL.revokeObjectURL(urlObj);
                }catch(error){
                    console.log('下载失败',error)
                }
            })

        },
        // 容器列表
        // async getContList(){
        //     if(this.origin=='nodes'){
        //         let ip = this.ip;
        //         return k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods",{
        //             params:{
        //                 labelSelector: `w7.cc/daemonset=w7`
        //             },
        //             loading:true,
        //         }).then(res=>{
        //             let items = res?.data?.items || [];
        //             let find = items.find(i=>{
        //                 if(!i?.status?.hostIP){return false}
        //                 return i.status.hostIP==ip;
        //             })
        //             find && this.initPod(find);
        //         });
        //     }
            
        //     if(!this.appData||!Object.keys(this.appData)?.length){return}
        //     let selector = this.appData?.spec?.selector?.matchLabels || {};
        //     let label = Object.keys(selector).map(key=>`${key}=${selector[key]}`).join(',');
        //     return k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods",{
        //         params:{
        //             labelSelector: label
        //         },
        //         loading:true,
        //     }).then(res=>{
        //         let items = res?.data?.items || [];
        //         items = items.filter(i=>i.status?.phase?.toUpperCase()=='RUNNING');
        //         items.sort((a,b)=>b.metadata?.creationTimestamp - a.metadata?.creationTimestamp);
        //         let first = items?.[0];
        //         if(first){
        //             return this.initPod(first);
        //         }
        //     })
        // },
        // 容器列表-2
        async getContList2(){
            let selector = this.appData?.spec?.selector?.matchLabels || {};
            let label = Object.keys(selector).map(key=>`${key}=${selector[key]}`).join(',');
            
            if(this.origin=='nodes'){
                return panelApi.get('/pid',{
                    params:{
                        namespace: this.namespaceActive,
                        HostIp: this.$route.query.ip,
                    },
                    loading: true,
                }).then(async res=>{
                    let origin = window.location.origin;
                    this.outEditorInfo = {
                        origin: origin,
                        agentUrl: res.data.agentUrl,
                        webdavUrl: res.data.webdavUrl,
                        webdavToken: res.data.webdavToken,
                        webdavBasePath: res.data.webdavBasePath,
                        compressUrl: res.data.compressUrl,
                        permissionUrl: res.data.permissionUrl,
                        pod_name: res.data.podName,
                        containerName: res.data.containerName,
                        namespace: res.data?.namespace,
                    }

                    this.form.pod_name = res.data?.podName;
                    this.form.containerName = res.data?.containerName;
                    this.form.namespace = res.data?.namespace;
                    this.form.pid = res.data.pid;
                    

                    this.form.subPid = res.data.subPid;
                    this.form.preCmd = '$KO_DATA_PATH/shell/filesys.sh sh';
                    this.form.path = res.data?.pwd.trim() || '/';
                    this.root = '/';

                    if(this.$route.query.path){
                        this.form.path = this.root.replace(/\/$/,'') + decodeURIComponent(this.$route.query.path);
                    }else if(/path=[^&]+(&|$)/.test(this.$route.hash)){
                        let path = this.$route.hash.match(/path=([^&]+)/)?.[1];
                        this.form.path = this.root.replace(/\/$/,'') + decodeURIComponent(path);
                    }
                    localStorage.setItem('webdavToken',res.data.webdavToken)
                    // if (res.data.users && res.data.users.length > 0) {
                    //     this.userArr = res.data.users;
                    // }
                    let wsBaseUrl = `${origin}/panel-api/v1/exec`;
                    this.outEditorLink = `${origin}/ui/plugin/codeblitz/editor.html?ws-base-url=${encodeURIComponent(wsBaseUrl)}&api-url=${res.data.webdavUrl?.replace(/\/$/,'')}&api-base-path=${res.data.webdavBasePath?.replace(/\/$/,'')}&initial-path=${encodeURIComponent(this.form.path || '/')}&api-token=${encodeURIComponent(res.data.webdavToken)}`;
                })
                return;
            }
            return k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods",{
                params: {labelSelector: label},
                loading: true
            }).then(res=>{
                let items = res?.data?.items || [];
                let list = items.map(item=>{
                    return {
                        status: item?.status?.phase?.toUpperCase() || '',
                        namespace: item?.metadata?.namespace,
                        hostIp: item?.status?.hostIP,
                        containerId: item.status?.containerStatuses?.[0]?.containerID,
                        containerName: item.status?.containerStatuses?.[0]?.name,
                        creationTimestamp: item?.metadata?.creationTimestamp,
                        name: item?.metadata?.name,
                    }
                }).filter(i=>i.status=='RUNNING');
                list.sort((a,b)=>b.creationTimestamp - a.creationTimestamp);
                
                let d = list?.[0] || null;
                if(this.$route.query.ip){
                    d = list?.find(i=>i.hostIp==this.$route.query.ip) || d;
                }
                return d;
            }).then(d=>{
                if(!d || !d?.hostIp){ return Promise.reject(); }
                return panelApi.get('/pid',{
                    params:{
                        namespace: d.namespace,
                        HostIp: d.hostIp,
                        containerId: d.containerId,
                        containerName: d.containerName,
                        podName: d.name,
                    },
                    loading: true,
                }).then(async res=>{
                    let origin = window.location.origin;
                    this.outEditorInfo = {
                        origin: origin,
                        agentUrl: res.data.agentUrl,
                        webdavUrl: res.data.webdavUrl,
                        webdavToken: res.data.webdavToken,
                        webdavBasePath: res.data.webdavBasePath,
                        compressUrl: res.data.compressUrl,
                        permissionUrl: res.data.permissionUrl,
                        pod_name: d.name,
                        containerName: d.containerName,
                        namespace: res.data?.namespace,
                    }

                    this.form.pod_name = res.data?.podName;
                    this.form.containerName = res.data?.containerName;
                    this.form.namespace = res.data?.namespace;
                    this.form.pid = res.data.pid;
                    if(this.origin=='nodes'){
                        let pid = 1;
                        try{
                            let {data} = await panelApi.get('/nodepid',{params:{
                                namespace: this.namespaceActive,
                                podName: this.$route.query.podName
                            }})
                            pid = data?.pid || 1;
                        }catch{}
                        
                        this.outEditorInfo.webdavUrl = this.outEditorInfo.webdavUrl.replace('/'+this.form.pid+'/','/'+ pid +'/');
                        this.form.pid = pid;
                    }

                    this.form.subPid = res.data.subPid;
                    this.form.preCmd = '$KO_DATA_PATH/shell/filesys.sh sh';
                    this.form.path = res.data?.pwd.trim() || '/';
                    this.root = '/';

                    // if(this.$route.query.path){
                    //     this.form.path = this.root.replace(/\/$/,'') + decodeURIComponent(this.$route.query.path);
                    // }else if(/path=[^&]+(&|$)/.test(this.$route.hash)){
                    //     let path = this.$route.hash.match(/path=([^&]+)/)?.[1];
                    //     this.form.path = this.root.replace(/\/$/,'') + decodeURIComponent(path);
                    // }
                    
                    let path = '';
                    if(!this.is_component && /path=[^&]+(&|$)/.test(this.$route.hash)){
                        path = this.$route.hash.match(/path=([^&]+)/)?.[1];
                    }
                    if(this.is_component && this.componentData?.path){
                        path = this.componentData.path;
                    }
                    if(path){
                        this.form.path = this.root.replace(/\/$/,'') + decodeURIComponent(path);
                    }
                    localStorage.setItem('webdavToken',res.data.webdavToken)
                    // if (res.data.users && res.data.users.length > 0) {
                    //     this.userArr = res.data.users;
                    // }
                    let wsBaseUrl = `${origin}/panel-api/v1/exec`;
                    this.outEditorLink = `${origin}/ui/plugin/codeblitz/editor.html?ws-base-url=${encodeURIComponent(wsBaseUrl)}&api-url=${res.data.webdavUrl?.replace(/\/$/,'')}&api-base-path=${res.data.webdavBasePath?.replace(/\/$/,'')}&initial-path=${encodeURIComponent(this.form.path || '/')}&api-token=${encodeURIComponent(res.data.webdavToken)}`;
                })
            })
        },
        getDir(){
            let token = getToken();
            let sendPropfindRequest = async (url)=>{
                useLoadingStore().loading = true;
                try {
                    const response = await fetch(url, {
                        method: 'PROPFIND',
                        headers: {
                            'Content-Type': 'text/xml; charset=utf-8',
                            Authorization: `Bearer ${token}`,
                            Depth: '1'
                        },
                    });

                    useLoadingStore().loading = false;
                    
                    if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
                    const responseText = await response.text();
                    
                    return responseText;
                }catch{
                    useLoadingStore().loading = false;
                }
            }
            return sendPropfindRequest(`${this.outEditorInfo.origin}${this.outEditorInfo.webdavUrl}${this.form.path}`).then(result =>{
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(result, 'application/xml');
                const hrefElements = xmlDoc.getElementsByTagNameNS('DAV:', 'response');
                let list = [];
                const basePath = `${this.outEditorInfo.webdavUrl}${this.form.path}`.replace(/\/+$/, '');
                const selfPath = basePath + '/';
                const decodedBasePath = decodeURIComponent(basePath);
                const decodedSelfPath = decodedBasePath + '/';
                for(let i=0; i<hrefElements.length; i++){
                    const response = hrefElements[i];
                    let href = response?.getElementsByTagNameNS('DAV:', 'href')?.[0]?.textContent?.trim();
                    // 解码href后再比较，解决中文路径过滤问题
                    const decodedHref = decodeURIComponent(href);
                    if(decodedHref === decodedSelfPath || decodedHref === decodedBasePath){continue;}
                    if(decodedBasePath.endsWith(href) || decodedSelfPath.endsWith(href)){continue;}
                    
                    const propstat = response?.getElementsByTagNameNS('DAV:', 'propstat')?.[0];
                    const prop = propstat?.getElementsByTagNameNS('DAV:', 'prop')?.[0];
                    let path = prop?.getElementsByTagNameNS('DAV:', 'displayname')?.[0]?.textContent?.trim();
                    let key = path;
                    if(!path||!key){continue}
                    let size = 0;
                    let sizeTxt = '-';
                    if(!href.endsWith('/')){
                        size = prop?.getElementsByTagNameNS('DAV:', 'getcontentlength')?.[0]?.textContent;
                        size = Number(size)
                        if(size < 1024){
                            sizeTxt = size + ' B';
                        }else if(size > 1024 * 1024){
                            sizeTxt = (size/(1024*1024)).toFixed(2) + ' MB';
                        }else{
                            sizeTxt = (size / 1024).toFixed(2) + ' KB';
                        }
                    }
                    let date = prop?.getElementsByTagNameNS('DAV:', 'getlastmodified')?.[0]?.textContent;
                    let time = '';
                    if(date){
                        let timestamp = new Date(date).getTime();
                        time = window.formatDate(timestamp);
                    }
                    let user = prop?.getElementsByTagName('user')?.[0]?.textContent || prop?.getElementsByTagNameNS('w7panel', 'user')?.[0]?.textContent;
                    let power = prop?.getElementsByTagName('mode')?.[0]?.textContent || prop?.getElementsByTagNameNS('w7panel', 'mode')?.[0]?.textContent;
                    list.push({
                        key: key,
                        name: key,
                        type: href.endsWith('/')? 'directory' : 'file',
                        is_dir: href.endsWith('/'),
                        is_zip: /\.(zip|tar|tgz|tar\.gz|tbz2|tar\.bz2|txz|tar\.xz)$/.test(path),
                        size: size,
                        filesize: sizeTxt,
                        utime: time,
                        user: this.userArr.find?.(i=>i.value==String(user))?.label || user,
                        power: power,
                    })
                }
                list.sort((a,b)=>a.key.localeCompare(b.key));
                return list;
            }).catch(error =>{
                console.error('Failed:', error)
                return [];
            });
        },
        initPod(pod){
            this.form.pod_name = pod?.metadata?.name;
            this.form.containerName = pod?.spec?.containers?.[0]?.name;
            this.form.namespace = pod?.metadata?.namespace;
            this.form.pid = 1;
            this.form.preCmd = '$KO_DATA_PATH/shell/filesys.sh sh';

            if(!this.is_component && /path=[^&]+(&|$)/.test(this.$route.hash)){
                this.form.path = this.$route.hash.match(/path=([^&]+)/)?.[1];
            }else if(this.origin!='nodes' && this.is_component && this.componentData.path){
                this.form.path = this.componentData.path;
            }else if(this.origin=='nodes'){
                this.root = '/';
                this.form.path = '/';
            }else{
                this.root = '/';
                this.form.path = '/';
            }
        },
        // 文件列表
        async getFileList(){
            this.selectedKeys = [];
            this.loading = true;
            
            let list = await this.getDir();
            this.parseList(list);

            // if(this.$route.name==fileRouteName){
            //     let list = await this.getDir();
            //     this.parseList(list);
            // }else{
            //     let command = `${this.form.preCmd} --pid=${this.form.pid} --subPid=${this.form.subPid} --cmd=ls --srcPath='${this.showPath}'`;
            //     this.command(command, res=>{
            //         this.loading = false;
            //         let data = res?.data;
            //         if(!data){return}
            //         let list = this.parseLsOutput(data);
            //         console.log(list)
            //         this.parseList(list);
            //     },()=>{
            //         this.loading = false;
            //         this.$message.error('获取文件列表失败');
            //     });
            // }
            
        },
        parseList(list){
            // 排序
            list = list.sort((i,j)=>{
                if(i.type!="directory" && j.type=="directory"){return 1;}
                else if(i.type=="directory" && j.type!="directory"){return -1;}
                return i>j;
            })
            this.fileList = list;
            // item.mf 永久文件
            this.fileList.map(i=>{
                if(i.type=='file' || (i.type=='symlink' && !i.is_dir)){
                    let file = this.showPath + i.key;
                    if(i.type=='symlink' && !i.is_dir){
                        let toname = i.name.replace(/^\s*(\S*)\s*->.*$/,'$1');
                        file = this.showPath + toname;
                    }
                    this.mfList.map(m=>{
                        let mp = '/' + m.mountPath.replace(/^\//,'');
                        if(file == mp){
                            i.mf = m.name;
                        }
                    })
                }
            })
            this.refreshCatch();
        },
        // 获取挂载文件（永久文件）+ 挂载目录
        getDataVm(){
            if(!this.appData||!Object.keys(this.appData)?.length){return}
            if(this.origin=='nodes'){return}
            let mounts = [];
            let mountsFile = [];

            let templateSpec = this.appData?.spec?.template?.spec;
            let vm = templateSpec?.containers?.[0]?.volumeMounts || [];
            let volumes = templateSpec?.volumes || [];

            vm.forEach(m=>{
                let find = volumes.find(v=>v.name==m.name);
                
                if(find?.configMap?.name || find?.secret?.secretName){
                    let type = find?.configMap?.name? 'configmap' : 'secret';
                    // 挂载文件
                    mountsFile.push({
                        name: find.name,
                        mountPath: m.mountPath,
                        subPath: m.subPath,
                        configMap: JSON.parse(JSON.stringify(find?.configMap || {})),
                        secret: JSON.parse(JSON.stringify(find?.secret || {})),

                        f_type: type,
                        f_name: {configmap: find?.configMap?.name, secret: find?.secret?.secretName}[type],
                        
                        rename: "", // 重命名
                        delete: false, // 删除标记，点立即生效后删除
                        edit: false,
                        editValue: '',
                    })
                }else{
                    // 挂载目录
                    mounts.push({
                        name: find.name,
                        mountPath: m.mountPath,
                        subPath: m.subPath || ''
                    });
                }
            })
            this.mfDirs = mounts;
            this.mfList = mountsFile;
            this.mfEdit = false;
            this.form.isMount = this.testForever(this.form.path, true);
        },
        // 解析ls返回内容
        parseLsOutput(lsOutput) {
            let result = [];
            const lines = lsOutput.trim().split('\n').slice(1); // 去掉第一行的总计信息，然后按行分割

            lines.forEach(line => {
                const parts = line.trim().split(/\s+/); // 拆分行为部分，使用正则表达式匹配空白字符
                
                let typeName = parts.slice(8).join(' '); // 名称，可能包含空格
                let name = typeName.replace(/(\/|\*)$/, '');

                // 文件类型，第一个字符
                const type = parts[0][0];
                let getType = "file";
                if(type == 'd'){
                    getType = "directory";
                }else if(type == 'l'){
                    getType = "symlink";
                }

                // 权限字符串，去除类型字符后的部分
                const permissions = parts[0].slice(1);
                permissions.slice();
                let mode = '';
                for (let i = 0; i < (permissions.length<=9?permissions.length:9); i+=3) {
                    let o = {'r':4,'w':2,'s':1,'x':1,'t':1,'-':0,'S':0}
                    let n = o[permissions[i]] + o[permissions[i+1]] + o[permissions[i+2]];
                    mode += n;
                }

                // 所有者
                const owner = parts[2];
                // const group = parts[3]; // 组

                // 大小
                const size = parseInt(parts[4]);
                let sizeTxt = size;
                if(size < 1024){
                    sizeTxt = size + ' B';
                }else if(size > 1024 * 1024){
                    sizeTxt = (size/(1024*1024)).toFixed(2) + ' MB';
                }else{
                    sizeTxt = (size / 1024).toFixed(2) + ' KB';
                }
                if(getType=='directory'){ sizeTxt = '-'; }

                // 修改时间部分
                const modifiedTime = parts.slice(5, 8).join(' ');
                const modifiedTimestamp = new Date(modifiedTime).getTime();
                const time = window.formatDate(modifiedTimestamp);

                // 构造对象
                const item = {
                    key: name,
                    type: getType,
                    is_zip: /\.(zip|tar|tgz|tar\.gz|tbz2|tar\.bz2|txz|tar\.xz)$/.test(name),
                    is_dir: /\/$/.test(typeName),
                    power: mode,
                    user: owner,
                    size: size,
                    filesize: sizeTxt,
                    name: name,
                    utime: time
                };
                item.index = result.length;
                result.push(item);
            });

            return result;
        },
        // 命令
        command(command, callback, error){
            // let pre = this.origin=='nodes'? 'nsenter -t 1 --mount --uts --ipc --net --pid -- ' : '';
            command = `${command}`;

            // let cmd = command.split(' ');
            // cmd = cmd.map(i=>('command='+i));
            // cmd = cmd.join('&');
            
            this.loading = true;
            // let params = `podName=${this.form.pod_name}&containerName=${this.form.containerName}&tty=false&namespace=${this.form.namespace}&${cmd}`;
            return panelApi.post(`/exec2`,{
                podName: this.form.pod_name,
                containerName: this.form.containerName,
                tty: false,
                namespace: this.form.namespace,
                command: ['sh', '-c', command],
            },{responseType: 'text', loading:true, noAlert:true}).then(res=>{
                this.loading = false;
                callback && callback(res);
            }).catch((e)=>{
                this.loading = false;
                let msg = e.response?.data?.error;
                if(msg.includes('failed to start exec')){
                    this.noCommand = true;
                }
                error && error();
            });
        },
        // 点击文件
        async intoFile(row){
            if(row.type == 'directory'){
                this.form.path = this.partPath + row.name;
            }else if(row.type == 'file'){
                if(row.size && row.size > 1024 * 1024){ this.$message.warning('当前文件大小超过1M，不支持在线编辑，请下载编辑后重新上传！'); return; }
                if(row.fromFileCatch){
                    this.file.dialog = true;
                    this.file.title = row.name;
                    this.file.path = this.form.path;
                    this.file.fromFileCatch = true;
                    this.file.forever = true;
                    this.file.sidebarPath = '';
                    this.init(()=>{
                        this.inputContent(row.value);
                    });
                    return;
                }else{
                    this.file.fromFileCatch = false;
                }
                if(row.mf){
                    let find = this.mfList?.find(i=>i.name == row.mf)
                    if(!find.delete){
                        if(find.edit){
                            this.file.dialog = true;
                            this.file.title = row.name;
                            this.file.mf = row.mf;
                            this.file.power = row.power;
                            this.file.forever = row.mf || this.form.isMount || false;
                            this.file.sidebarPath = '';
                            this.init(()=>{
                                this.inputContent(find.editValue);
                            });
                            return;
                        }
                        let configmapName = find?.configMap?.name;
                        if(!configmapName){ this.$message.error('configmap不存在'); return;}
                        k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+configmapName).then(res=>{
                            let data = res?.data?.data?.['default-cnf'];
                            this.file.dialog = true;
                            this.file.title = row.name;
                            this.file.mf = row.mf;
                            this.file.power = row.power;
                            this.file.forever = row.mf || this.form.isMount || false;
                            this.file.sidebarPath = '';
                            this.init(()=>{
                                this.inputContent(data);
                            });
                        })
                        return;
                    }
                }
                
                // if(this.$route.name==fileRouteName){
                    axios.get(`${this.outEditorInfo.origin}${this.outEditorInfo.webdavUrl}${encodeURI(this.partPath+row.name)}`).then(res=>{
                        let data = res?.data;
                        
                        this.file.dialog = true;
                        this.file.row = row;
                        this.file.title = row.name;
                        this.file.mf = row.mf;
                        this.file.power = row.power;
                        this.file.forever = row.mf || this.form.isMount || false;
                        this.file.sidebarPath = '';
                        this.init(()=>{
                            if(typeof data=='object'){
                                try{
                                    data = JSON.stringify(data,false,4);                            
                                    this.inputContent(data);
                                }catch(e){
                                    console.log(e)
                                }
                            }else{
                                this.inputContent(data);
                            }
                        });
                    }).catch((e)=>{
                        console.log(e)
                    })
                    return;
                // }
                // // 获取内容打开编辑器
                // this.command(`${this.form.preCmd} --pid=${this.form.pid} --subPid=${this.form.subPid} --cmd=cat --srcPath='${this.partPath+row.name}'`,(res)=>{
                //     let data = res?.data || '';
                //     if(typeof data!="string"){
                //         try{
                //             data = JSON.stringify(data, null, 4);
                //         }catch(e){
                //             data = data.toString();
                //         }
                //     }
                //     this.file.dialog = true;
                //     this.file.row = row;
                //     this.file.title = row.name;
                //     this.file.mf = row.mf;
                //     this.file.power = row.power;
                //     this.file.forever = row.mf || this.form.isMount || false;
                //     this.init(()=>{
                //         this.inputContent(data);
                //     });
                // });
            }else if(row.type=='symlink'){
                let toname = row.name.replace(/^\s*(\S*)\s*->.*$/,'$1');
                let fp = this.partPath + toname;
                // if(/^\//.test(toname)){ fp = toname;}
                
                if(row.is_dir){ this.form.path = fp; return; }
                this.command(`${this.form.preCmd} --pid=${this.form.pid} --subPid=${this.form.subPid} --cmd=du --srcPath='${decodeURIComponent(fp)}'`,(res)=>{
                    let data = res?.data || '';
                    let size = data.replace(/^\s*(\d+)\s+.*/,'$1');
                    if(size && size > 50 * 1024){ this.$message.warning('请下载修改'); return; }
                    // 获取内容打开编辑器
                    this.command(`${this.form.preCmd} --pid=${this.form.pid} --subPid=${this.form.subPid} --cmd=cat --srcPath='${decodeURIComponent(fp)}'`,(res)=>{
                        let data = res?.data || '';
                        if(typeof data!="string"){
                            try{
                                data = JSON.stringify(data, null, 4);
                            }catch(e){
                                data = data.toString();
                            }
                        }
                        this.file.dialog = true;
                        this.file.title = toname.replace(/^\//,'');
                        this.file.power = row.power;
                        
                        let file = this.showPath + toname;
                        this.mfList.map(m=>{
                            let mp = '/' + m.mountPath.replace(/^\//,'');
                            if(file == mp){
                                this.file.mf = m.name;
                            }
                        })

                        this.init(()=>{
                            this.inputContent(data);
                        });
                    });
                });
                
            }
        },
        // 跳转路径
        toPath(index){
            if(index=='root'){ this.form.path = this.root; return; }
            if(index+1 == this.pathArr.length){ return }
            let path = this.root + this.pathArr.slice(0,index+1).join('/');
            this.form.path = path;
        },
        // 保存编辑的内容
        async savefile(){
            if(!this.editor || !this.currentTab){return}
            
            const currentTab = this.currentTab;
            
            // 只读文件不能保存
            if (currentTab.readOnly) {
                this.$message.warning('此文件是只读的，无法保存');
                return;
            }
            
            let txt = this.editor.state.doc.toString();
            
            // 更新标签内容
            currentTab.content = txt;
            currentTab.modified = false;
            
            // 更新文件标题（用于兼容旧代码）
            this.file.title = currentTab.name;
            this.file.currentFile = currentTab.name;
            
            if(this.file.fromFileCatch){
                let find = this.fileCatch.find(i=>i.fileName == currentTab.name && i.path == this.showPath);
                if(find){
                    find.fileValue = txt;
                    this.$message.success('保存成功');
                    this.refreshCatch();
                }
                return;
            }
            if(this.file.mf){
                if(this.file.forever){
                    // 永久文件
                    let find = this.mfList?.find(i=>i.name==this.file.mf);
                    find.edit = true;
                    find.editValue = txt;
                    this.mfEdit = true;
                    this.refreshCatch();
                    this.$message.success('保存成功');
                    return;
                }else{
                    // 永久文件转普通文件
                    let find = this.mfList.find(i=>i.name==this.file.mf);
                    if(find){
                        find.delete = true;
                        this.mfEdit = true;
                        this.refreshCatch();
                    }
                }
            }else if(this.file.forever && !this.form.isMount){
                // 普通文件转永久文件
                let ct = this.partPath + currentTab.name;
                ct = decodeURIComponent(ct);
                this.command(`${this.form.preCmd} --pid=${this.form.pid} --subPid=${this.form.subPid} --cmd=rm ${decodeURIComponent(ct)}`, (res)=>{
                    this.getFileList();
                    this.fileCatch.push({
                        fileName: currentTab.name,
                        fileValue: txt,
                        path: this.showPath,
                        prower: this.file.power || '777',
                        user: 'root',
                    })
                    this.refreshCatch();
                    this.$message.success('保存成功');
                });
                return;
            }

            // console.log('fffffffffffffffffff',this.file);
            
            // 使用当前标签的路径
            const savePath = currentTab.path.startsWith('/') ? encodeURI(currentTab.path) : encodeURI(this.partPath + currentTab.name);

            axios.put(`${this.outEditorInfo.origin}${this.outEditorInfo.webdavUrl}${savePath}`, txt, {
                headers: {
                    "content-type": "application/octet-stream",
                    "Authorization": `Bearer ${this.outEditorInfo.webdavToken}`
                },
                transformRequest: [(data) => data],
            }).then(res=>{
                this.loading = false;
                this.$message.success('保存成功');
                // 刷新文件列表
                this.getFileList();
            }).catch(err=>{
                this.loading = false;
                this.$message.error('保存失败: ' + (err.response?.data?.message || err.message || '未知错误'));
            })
            return;

            // let onlyTitle = this.file.title.replace(/^.*\/([^/]+)$/,'$1');
            // const blob = new Blob([txt], { type: 'text/plain' });
            // const file = new File([blob], onlyTitle, { type: 'text/plain' });

            // let data = new FormData();
            // data.append('file', file);
            // data.append('key', 'upload/'+onlyTitle);

            // this.file.dialog = false;
            // this.loading = true;
            // let to = (this.origin=='nodes'?'/host':'') + '/proc/'+ this.form.pid+'/root' + (this.form.subPid?`/proc/${this.form.subPid}/root`:'') + this.partPath + this.file.title;
            // axios.post('/s3bucket',data).then(res=>{
            //     let data = {
            //         from: 'upload/'+onlyTitle,
            //         to: decodeURIComponent(to),
            //         // fromOrTo: 'to',
            //         upload: 1,
            //         namespace: this.namespaceActive,
            //         podName: this.form.pod_name,
            //     }
            //     const params = new URLSearchParams();
            //     for (let key in data) {
            //         params.append(key, data[key]);  
            //     }
            //     panelApi.post('/cp',params.toString(),{headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).then(async res=>{
            //         // 修改用户组
            //         let row = this.file.row;
            //         console.log(row);
            //         if(!row){return}
            //         let chown = this.userArr?.find(i=>i.name==row.user)?.id;
            //         let chomd = row.power;
            //         let ct = `'${this.partPath}${row.name}'`;
            //         ct = decodeURIComponent(ct);
            //         await this.command(`${this.form.preCmd} --pid=${this.form.pid} --subPid=${this.form.subPid} --cmd=chown ${chown} ${ct}`);
            //         await this.command(`${this.form.preCmd} --pid=${this.form.pid} --subPid=${this.form.subPid} --cmd=chmod ${chomd} ${ct}`);
            //     }).then(res=>{
            //         this.loading = false;
            //         this.$message.success('操作成功')
            //     }).catch(()=>{
            //         this.loading = false;
            //     })
            // }).catch(()=>{this.loading = false;})
        },
        // // 取消挂载
        // deleteMf(){
        //     if(this.origin=='nodes'){return}
        //     let kind = this.is_component? this.componentData.kind : this.$route.params.kind;
        //     let id = this.is_component? this.componentData.id : this.$route.params.id;
        //     k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ kind +"/"+ id ).then(async res=>{
        //         let data = res?.data;
        //         let spec = data?.spec?.template?.spec;
        //         let itemIndex = spec?.containers?.[0]?.volumeMounts?.findIndex(i=>i.name == this.file.mf);
        //         let volumeIndex = spec?.volumes?.findIndex(i=>i?.name == this.file.mf);

        //         if(volumeIndex<0 || itemIndex<0){
        //             return;
        //         }
        //         spec.volumes.splice(volumeIndex,1);
        //         spec.containers[0].volumeMounts.splice(itemIndex,1);
                
        //         k8sproxy.put("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ kind +"/"+ id, data ).then(res=>{
        //             this.$message.success('操作成功');
        //             // 删除configmap
        //             let configmapName = this.mfList?.find(i=>i.name == this.file.mf)?.configMap?.name;
        //             k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+configmapName, {noAlert:true}).finally(()=>{
        //                 this.$emit('refresh');
        //             });
        //         })
        //     })
        // },
        // 编辑器初始化
        init(callback){
            // 初始化标签页
            const filePath = decodeURIComponent(this.showPath) + this.file.title;
            this.file.openTabs = [{
                name: this.file.title,
                path: filePath,
                content: '',
                modified: false,
                readOnly: false,
                is_symlink: false,
                size: 0
            }];
            this.file.activeTabIndex = 0;
            
            // 加载侧边栏文件列表
            this.loadSidebarFiles();
            
            // 设置快捷键
            this.setupEditorShortcuts();
            
            this.$nextTick(()=>{
                this.createEditor('');
                callback && callback();
            })
        },
        // 创建编辑器
        createEditor(content, readOnly = false){
            document.getElementById("editor_textarea").innerHTML = "";
            
            // 标记为初始化中，避免触发 modified 状态
            this._editorInitializing = true;
            
            // 检测当前主题（浅色/深色）
            const isDarkTheme = this.isDarkTheme();
            
            // 定义语法高亮样式（使用 HighlightStyle）
            const darkSyntaxColors = HighlightStyle.define([
                { tag: tags.keyword, color: '#569cd6' },
                { tag: tags.string, color: '#ce9178' },
                { tag: tags.number, color: '#b5cea8' },
                { tag: tags.comment, color: '#6a9955' },
                { tag: tags.operator, color: '#d4d4d4' },
                { tag: tags.variableName, color: '#9cdcfe' },
                { tag: tags.propertyName, color: '#9cdcfe' },
                { tag: tags.function(tags.variableName), color: '#dcdcaa' },
                { tag: tags.definition(tags.variableName), color: '#dcdcaa' },
                { tag: tags.typeName, color: '#4ec9b0' },
                { tag: tags.className, color: '#4ec9b0' },
                { tag: tags.labelName, color: '#c8c8c8' },
                { tag: tags.meta, color: '#808080' },
                { tag: tags.attributeName, color: '#9cdcfe' },
                { tag: tags.attributeValue, color: '#ce9178' },
                { tag: tags.heading, color: '#569cd6', fontWeight: 'bold' },
                { tag: tags.quote, color: '#6a9955' },
                { tag: tags.link, color: '#3794ff', textDecoration: 'underline' },
                { tag: tags.invalid, color: '#f44747' },
                { tag: tags.bool, color: '#569cd6' },
                { tag: tags.null, color: '#569cd6' },
                { tag: tags.punctuation, color: '#d4d4d4' },
                { tag: tags.bracket, color: '#ffd700' },
                // StreamLanguage 兼容
                { tag: tags.keyword, class: 'tok-keyword' },
                { tag: tags.string, class: 'tok-string' },
                { tag: tags.number, class: 'tok-number' },
                { tag: tags.comment, class: 'tok-comment' },
            ]);
            
            const lightSyntaxColors = HighlightStyle.define([
                { tag: tags.keyword, color: '#cf222e' },
                { tag: tags.string, color: '#0a3069' },
                { tag: tags.number, color: '#0550ae' },
                { tag: tags.comment, color: '#6e7781' },
                { tag: tags.operator, color: '#24292f' },
                { tag: tags.variableName, color: '#953800' },
                { tag: tags.propertyName, color: '#0550ae' },
                { tag: tags.function(tags.variableName), color: '#8250df' },
                { tag: tags.definition(tags.variableName), color: '#8250df' },
                { tag: tags.typeName, color: '#116329' },
                { tag: tags.className, color: '#116329' },
                { tag: tags.labelName, color: '#24292f' },
                { tag: tags.meta, color: '#6e7781' },
                { tag: tags.attributeName, color: '#0550ae' },
                { tag: tags.attributeValue, color: '#0a3069' },
                { tag: tags.heading, color: '#0550ae', fontWeight: 'bold' },
                { tag: tags.quote, color: '#6e7781' },
                { tag: tags.link, color: '#0969da', textDecoration: 'underline' },
                { tag: tags.invalid, color: '#cf222e' },
                { tag: tags.bool, color: '#cf222e' },
                { tag: tags.null, color: '#cf222e' },
                { tag: tags.punctuation, color: '#24292f' },
                { tag: tags.bracket, color: '#6639ba' },
            ]);
            
            // 编辑器基础样式（背景、选择等）
            const editorTheme = EditorView.theme({
                '&': { backgroundColor: isDarkTheme ? '#1e1e1e' : '#ffffff', color: isDarkTheme ? '#d4d4d4' : '#24292f' },
                '.cm-content': { caretColor: isDarkTheme ? '#aeafad' : '#165dff', fontFamily: 'Consolas, Monaco, "Courier New", monospace', fontSize: '14px' },
                '.cm-cursor': { borderLeftColor: isDarkTheme ? '#aeafad' : '#165dff' },
                '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: isDarkTheme ? '#264f78' : '#e8f3ff' },
                // '.cm-activeLine': { backgroundColor: isDarkTheme ? '#2a2d2e' : '#f6f8fa' },
                '.cm-gutters': { backgroundColor: isDarkTheme ? '#252526' : '#f6f8fa', color: isDarkTheme ? '#858585' : '#6e7781', border: 'none' },
                '.cm-activeLineGutter': { backgroundColor: isDarkTheme ? '#37373d' : '#eaeef2' },
                '.cm-search-match': { backgroundColor: isDarkTheme ? '#515c6a' : '#fff8c5', color: isDarkTheme ? '#ffffff' : '#24292f' },
            }, {dark: isDarkTheme});

            // 缩进函数 - 增加缩进并保持选择
            const indentSelection = (view) => {
                const { state } = view;
                const { selection } = state;
                const indentStr = '\t'; // 使用制表符缩进
                
                const changes = [];
                let addedChars = 0;
                const lineCounts = new Map(); // 记录每行增加的字符数
                
                selection.ranges.forEach(range => {
                    const fromLine = state.doc.lineAt(range.from);
                    const toLine = state.doc.lineAt(range.to);
                    
                    for (let lineNum = fromLine.number; lineNum <= toLine.number; lineNum++) {
                        const line = state.doc.line(lineNum);
                        changes.push({ from: line.from, insert: indentStr });
                        lineCounts.set(lineNum, (lineCounts.get(lineNum) || 0) + indentStr.length);
                    }
                });
                
                // 计算新的选择范围
                let newRanges = [];
                let charOffset = 0;
                let processedLines = new Set();
                
                selection.ranges.forEach(range => {
                    const fromLine = state.doc.lineAt(range.from);
                    const toLine = state.doc.lineAt(range.to);
                    
                    // 计算from位置的偏移
                    let fromOffset = 0;
                    for (let ln = 1; ln <= fromLine.number; ln++) {
                        if (lineCounts.has(ln)) {
                            fromOffset += lineCounts.get(ln);
                        }
                    }
                    
                    // 计算to位置的偏移
                    let toOffset = 0;
                    for (let ln = 1; ln <= toLine.number; ln++) {
                        if (lineCounts.has(ln)) {
                            toOffset += lineCounts.get(ln);
                        }
                    }
                    
                    newRanges.push(EditorSelection.range(range.from + fromOffset, range.to + toOffset));
                });
                
                view.dispatch({
                    changes,
                    selection: EditorSelection.create(newRanges, selection.mainIndex),
                });
                
                return true;
            };
            
            // 取消缩进函数 - 减少缩进并保持选择
            const unindentSelection = (view) => {
                const { state } = view;
                const { selection } = state;
                
                const changes = [];
                const lineRemoves = new Map(); // 记录每行删除的字符数
                
                selection.ranges.forEach(range => {
                    const fromLine = state.doc.lineAt(range.from);
                    const toLine = state.doc.lineAt(range.to);
                    
                    for (let lineNum = fromLine.number; lineNum <= toLine.number; lineNum++) {
                        const line = state.doc.line(lineNum);
                        const lineContent = line.text;
                        
                        // 检查行开头是否有制表符或空格
                        let removeLen = 0;
                        if (lineContent.startsWith('\t')) {
                            removeLen = 1;
                        } else if (lineContent.startsWith('  ')) {
                            removeLen = 2;
                        } else if (lineContent.startsWith(' ')) {
                            removeLen = 1;
                        }
                        
                        if (removeLen > 0) {
                            changes.push({ from: line.from, to: line.from + removeLen });
                            lineRemoves.set(lineNum, removeLen);
                        }
                    }
                });
                
                if (changes.length > 0) {
                    // 计算新的选择范围
                    let newRanges = [];
                    
                    selection.ranges.forEach(range => {
                        const fromLine = state.doc.lineAt(range.from);
                        const toLine = state.doc.lineAt(range.to);
                        
                        // 计算from位置的偏移
                        let fromOffset = 0;
                        for (let ln = 1; ln < fromLine.number; ln++) {
                            if (lineRemoves.has(ln)) {
                                fromOffset += lineRemoves.get(ln);
                            }
                        }
                        // 如果from在当前行被删除的部分之后，也要减去
                        if (lineRemoves.has(fromLine.number) && range.from > fromLine.from) {
                            const removeLen = lineRemoves.get(fromLine.number);
                            if (range.from >= fromLine.from + removeLen) {
                                fromOffset += removeLen;
                            } else {
                                fromOffset += range.from - fromLine.from;
                            }
                        }
                        
                        // 计算to位置的偏移
                        let toOffset = 0;
                        for (let ln = 1; ln < toLine.number; ln++) {
                            if (lineRemoves.has(ln)) {
                                toOffset += lineRemoves.get(ln);
                            }
                        }
                        if (lineRemoves.has(toLine.number) && range.to > toLine.from) {
                            const removeLen = lineRemoves.get(toLine.number);
                            if (range.to >= toLine.from + removeLen) {
                                toOffset += removeLen;
                            } else {
                                toOffset += range.to - toLine.from;
                            }
                        }
                        
                        const newFrom = Math.max(0, range.from - fromOffset);
                        const newTo = Math.max(newFrom, range.to - toOffset);
                        newRanges.push(EditorSelection.range(newFrom, newTo));
                    });
                    
                    view.dispatch({
                        changes,
                        selection: EditorSelection.create(newRanges, selection.mainIndex),
                    });
                }
                
                return true;
            };
            
            // 快捷键配置
            const saveKeymap = keymap.of([
                {
                    key: 'Mod-w',
                    run: () => {
                        if (this.file.openTabs.length > 1) {
                            this.closeTab(this.file.activeTabIndex);
                        } else {
                            this.closeEditor();
                        }
                        return true;
                    }
                },
                {
                    key: 'Mod-f',
                    run: () => {
                        this.openSearchPanel();
                        return true;
                    }
                },
                {
                    key: 'Mod-h',
                    run: () => {
                        this.searchPanel.showReplace = true;
                        this.openSearchPanel();
                        return true;
                    }
                },
                {
                    key: 'Escape',
                    run: () => {
                        if (this.searchPanel.visible) {
                            this.closeSearchPanel();
                            return true;
                        }
                        return false;
                    }
                },
                {
                    key: 'F3',
                    run: () => {
                        if (this.searchPanel.visible) {
                            this.findNext();
                        } else {
                            this.openSearchPanel();
                        }
                        return true;
                    }
                },
                {
                    key: 'Shift-F3',
                    run: () => {
                        if (this.searchPanel.visible) {
                            this.findPrev();
                        }
                        return true;
                    }
                },
                {
                    key: 'Tab',
                    run: indentSelection,
                    shift: unindentSelection,
                },
            ]);
            
            // 光标和内容变化监听
            const updateListener = EditorView.updateListener.of((update) => {
                if (update.selectionSet) {
                    this.updateCursorPosition();
                }
                if (update.docChanged && this.currentTab && !this._editorInitializing) {
                    // 标记为已修改
                    if (!this.currentTab.modified) {
                        this.currentTab.modified = true;
                    }
                }
            });
            
            // 使用语法高亮
            const syntaxHighlightingExt = syntaxHighlighting(isDarkTheme ? darkSyntaxColors : lightSyntaxColors);
            const fileName = this.file?.openTabs?.[this.file?.activeTabIndex]?.name || '';
            const langExtension = this.getLanguageExtension(fileName);
            
            // 初始化自动换行配置槽
            this.wordWrapCompartment = new Compartment();

            this.editor = new EditorView({
                doc: content,
                extensions: [
                    basicSetup,
                    editorTheme,
                    syntaxHighlightingExt,
                    langExtension,
                    saveKeymap,
                    updateListener,
                    EditorView.editable.of(!readOnly),
                    this.wordWrapCompartment.of(this.file.wordWrap ? EditorView.lineWrapping : []),
                ],
                parent: document.getElementById("editor_textarea"),
            });
            
            // 初始化光标位置
            this.$nextTick(() => {
                this.updateCursorPosition();
                // 初始化完成，允许 modified 状态更新
                this._editorInitializing = false;
            });
        },
        // 设置编辑器快捷键
        setupEditorShortcuts(){
            // 移除旧的监听器
            if (this._editorKeydownHandler) {
                document.removeEventListener('keydown', this._editorKeydownHandler);
            }
            
            this._editorKeydownHandler = (e) => {
                if (!this.file.dialog) return;
                
                // Ctrl+S 保存
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    this.savefile();
                }
                // Ctrl+W 关闭标签
                if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                    e.preventDefault();
                    if (this.file.openTabs.length > 1) {
                        this.closeTab(this.file.activeTabIndex);
                    } else {
                        this.closeEditor();
                    }
                }
                // Escape 关闭
                if (e.key === 'Escape') {
                    this.closeEditor();
                }
            };
            
            document.addEventListener('keydown', this._editorKeydownHandler);
        },
        // 关闭编辑器（带确认）
        closeEditor(){
            const hasModified = this.file.openTabs.some(t => t.modified);
            if (hasModified) {
                this.$modal.confirm({
                    title: '提示',
                    content: '有未保存的修改，确定要关闭吗？',
                    onOk: () => {
                        this.doCloseEditor();
                    }
                });
            } else {
                this.doCloseEditor();
            }
        },
        // Modal取消事件处理
        handleModalCancel(){
            this.closeEditor();
        },
        // 实际关闭编辑器
        doCloseEditor(){
            this.file.dialog = false;
            this.file.openTabs = [];
            this.file.activeTabIndex = 0;
            this.searchPanel.visible = false;
            if (this.editor) {
                this.editor.destroy();
                this.editor = null;
            }
            if (this._editorKeydownHandler) {
                document.removeEventListener('keydown', this._editorKeydownHandler);
            }
        },
        // 切换标签
        switchTab(index){
            if (index === this.file.activeTabIndex) return;
            
            // 保存当前编辑器内容
            if (this.editor && this.currentTab) {
                this.currentTab.content = this.editor.state.doc.toString();
            }
            
            this.file.activeTabIndex = index;
            
            // 切换到新标签
            this.$nextTick(() => {
                this.createEditor(this.currentTab?.content || '', this.currentTab?.readOnly);
                this.updateTabsScrollButtons();
                this.scrollToActiveTab();
            });
        },
        scrollToActiveTab() {
            const scrollEl = this.$refs.tabsScrollRef;
            if (!scrollEl) return;
            const activeTab = scrollEl.querySelector('.editor-tab.active');
            if (activeTab) {
                const scrollLeft = scrollEl.scrollLeft;
                const scrollWidth = scrollEl.clientWidth;
                const tabLeft = activeTab.offsetLeft;
                const tabWidth = activeTab.offsetWidth;
                if (tabLeft < scrollLeft) {
                    scrollEl.scrollTo({ left: tabLeft - 10, behavior: 'smooth' });
                } else if (tabLeft + tabWidth > scrollLeft + scrollWidth) {
                    scrollEl.scrollTo({ left: tabLeft + tabWidth - scrollWidth + 10, behavior: 'smooth' });
                }
            }
        },
        // 关闭标签
        closeTab(index){
            const tab = this.file.openTabs[index];
            if (tab?.modified) {
                this.$modal.confirm({
                    title: '提示',
                    content: `文件 "${tab.name}" 有未保存的修改，确定要关闭吗？`,
                    onOk: () => {
                        this.doCloseTab(index);
                    }
                });
            } else {
                this.doCloseTab(index);
            }
        },
        doCloseTab(index){
            // 保存当前内容
            if (this.editor && this.file.openTabs[index]) {
                this.file.openTabs[index].content = this.editor.state.doc.toString();
            }
            
            // 移除标签
            this.file.openTabs.splice(index, 1);
            
            // 调整活动标签索引
            if (this.file.activeTabIndex >= this.file.openTabs.length) {
                this.file.activeTabIndex = this.file.openTabs.length - 1;
            }
            
            // 如果没有标签了，关闭编辑器
            if (this.file.openTabs.length === 0) {
                this.closeEditor();
                return;
            }
            
            // 切换到新的活动标签
            this.$nextTick(() => {
                this.createEditor(this.currentTab?.content || '', this.currentTab?.readOnly);
            });
        },
        // 判断文件是否激活
        isFileActive(item){
            return this.currentTab && 
                   this.currentTab.name === item.name && 
                   this.file.sidebarPath + item.name === this.currentTab.path;
        },
        // 获取项目标题
        getItemTitle(item){
            let title = item.name;
            if (item.is_symlink) title += ' (符号链接)';
            if (item.is_dir) title += '/';
            return title;
        },
        // 格式化文件大小
        formatSize(size){
            if (size < 1024) return size + ' B';
            if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
            return (size / (1024 * 1024)).toFixed(1) + ' MB';
        },
        // 刷新侧边栏
        refreshSidebar(){
            this.loadSidebarFiles();
        },
        // 检测当前是否为深色主题
        isDarkTheme(){
            // 方法1: 检查 body 的 arco-theme 属性
            const bodyTheme = document.body.getAttribute('arco-theme');
            if (bodyTheme === 'dark') return true;
            if (bodyTheme === 'light') return false;
            
            // 方法2: 检查 CSS 变量
            const style = window.getComputedStyle(document.body);
            const bg1 = style.getPropertyValue('--color-bg-1').trim();
            
            // 如果背景色是深色，则判断为深色主题
            if (bg1 && (bg1 === '#1e1e1e' || bg1 === '#232324' || bg1.startsWith('#1') || bg1.startsWith('#2'))) {
                return true;
            }
            
            // 方法3: 检查实际背景色亮度
            const bgColor = style.backgroundColor;
            if (bgColor) {
                const rgb = bgColor.match(/\d+/g);
                if (rgb && rgb.length >= 3) {
                    const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                    return brightness < 128;
                }
            }
            
            // 默认返回 false（浅色主题）
            return false;
        },
        // 根据文件名获取语言扩展
        getLanguageExtension(filename){
            const ext = filename.split('.').pop().toLowerCase();
            this.editorLanguage = null;
            
            const langMap = {
                'js': () => { this.editorLanguage = 'JavaScript'; return javascript(); },
                'jsx': () => { this.editorLanguage = 'JavaScript (JSX)'; return javascript({ jsx: true }); },
                'ts': () => { this.editorLanguage = 'TypeScript'; return javascript({ typescript: true }); },
                'tsx': () => { this.editorLanguage = 'TypeScript (TSX)'; return javascript({ jsx: true, typescript: true }); },
                'mjs': () => { this.editorLanguage = 'JavaScript'; return javascript(); },
                'cjs': () => { this.editorLanguage = 'JavaScript'; return javascript(); },
                'html': () => { this.editorLanguage = 'HTML'; return html(); },
                'htm': () => { this.editorLanguage = 'HTML'; return html(); },
                'vue': () => { this.editorLanguage = 'HTML (Vue)'; return html(); },
                'css': () => { this.editorLanguage = 'CSS'; return css(); },
                'scss': () => { this.editorLanguage = 'CSS (SCSS)'; return css(); },
                'less': () => { this.editorLanguage = 'CSS (Less)'; return css(); },
                'json': () => { this.editorLanguage = 'JSON'; return json(); },
                'jsonc': () => { this.editorLanguage = 'JSON'; return json(); },
                'yaml': () => { this.editorLanguage = 'YAML'; return yaml(); },
                'yml': () => { this.editorLanguage = 'YAML'; return yaml(); },
                'md': () => { this.editorLanguage = 'Markdown'; return markdown(); },
                'markdown': () => { this.editorLanguage = 'Markdown'; return markdown(); },
                'py': () => { this.editorLanguage = 'Python'; return python(); },
                'php': () => { this.editorLanguage = 'PHP'; return php(); },
                'sql': () => { this.editorLanguage = 'SQL'; return sql(); },
                'xml': () => { this.editorLanguage = 'XML'; return xml(); },
                'svg': () => { this.editorLanguage = 'XML (SVG)'; return xml(); },
                'sh': () => { this.editorLanguage = 'Shell'; return StreamLanguage.define(shell); },
                'bash': () => { this.editorLanguage = 'Shell'; return StreamLanguage.define(shell); },
                'zsh': () => { this.editorLanguage = 'Shell'; return StreamLanguage.define(shell); },
                'go': () => { this.editorLanguage = 'Go'; return StreamLanguage.define(go); },
                'rs': () => { this.editorLanguage = 'Rust'; return StreamLanguage.define(rust); },
                'java': () => { this.editorLanguage = 'Java'; return StreamLanguage.define(java); },
                'c': () => { this.editorLanguage = 'C++'; return StreamLanguage.define(cpp); },
                'cpp': () => { this.editorLanguage = 'C++'; return StreamLanguage.define(cpp); },
                'cc': () => { this.editorLanguage = 'C++'; return StreamLanguage.define(cpp); },
                'cxx': () => { this.editorLanguage = 'C++'; return StreamLanguage.define(cpp); },
                'h': () => { this.editorLanguage = 'C++'; return StreamLanguage.define(cpp); },
                'hpp': () => { this.editorLanguage = 'C++'; return StreamLanguage.define(cpp); },
                'conf': () => { this.editorLanguage = 'Config'; return StreamLanguage.define(shell); },
                'cnf': () => { this.editorLanguage = 'Config'; return StreamLanguage.define(shell); },
                'cfg': () => { this.editorLanguage = 'Config'; return StreamLanguage.define(shell); },
                'ini': () => { this.editorLanguage = 'Config'; return StreamLanguage.define(shell); },
                'env': () => { this.editorLanguage = 'Config'; return StreamLanguage.define(shell); },
            };
            
            if (langMap[ext]) {
                try {
                    return langMap[ext]();
                } catch (e) {
                    console.warn('Failed to load language:', ext, e);
                }
            }
            
            return [];
        },
        // 加载侧边栏文件列表
        async loadSidebarFiles(){
            if (!this.outEditorInfo?.webdavUrl) return;
            
            // 使用 sidebarPath（如果已设置），否则使用当前 partPath
            let targetPath = this.file.sidebarPath || decodeURIComponent(this.showPath);
            if (!targetPath) {
                targetPath = decodeURIComponent(this.partPath);
            }
            // console.log(targetPath,this.showPath)
            this.file.sidebarPath = targetPath;
            this.file.sidebarLoading = true;
            this.file.sidebarFiles = [];
            this.file.sidebarError = '';
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                // 使用 sidebarPath 进行请求
                const encodedPath = targetPath.split('/').map(p => p ? encodeURIComponent(p) : '').join('/');
                const response = await fetch(
                    `${this.outEditorInfo.origin}${this.outEditorInfo.webdavUrl}${encodedPath}`,
                    {
                        method: 'PROPFIND',
                        headers: {
                            'Authorization': `Bearer ${this.outEditorInfo.webdavToken}`,
                            'Depth': '1',
                            'Content-Type': 'text/xml; charset=utf-8'
                        },
                        signal: controller.signal
                    }
                );
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const text = await response.text();
                const files = this.parseWebDAVResponse(text, `${this.outEditorInfo.webdavUrl}${encodedPath}`);
                
                // 显示文件和子目录
                this.file.sidebarFiles = files.map(f => ({
                    name: f.name,
                    is_dir: f.isDir,
                    is_symlink: f.isSymlink || false,
                    size: f.size || 0
                }));
                
                if (this.file.sidebarFiles.length === 0) {
                    this.file.sidebarError = '当前目录为空';
                }
                
            } catch (e) {
                console.error('Failed to load sidebar files:', e);
                this.file.sidebarFiles = [];
                this.file.sidebarError = '无法加载文件列表: ' + (e.message || '未知错误');
            } finally {
                this.file.sidebarLoading = false;
            }
        },
        // 解析WebDAV响应
        // requestPath: 请求的路径，用于排除目录本身
        parseWebDAVResponse(xml, requestPath = ''){
            const parser = new DOMParser();
            const doc = parser.parseFromString(xml, 'application/xml');
            const responses = doc.getElementsByTagNameNS('DAV:', 'response');
            const files = [];
            
            // 规范化请求路径用于比较
            const normalizedRequestPath = (requestPath || '').replace(/\/+$/, '');
            
            for (let i = 0; i < responses.length; i++) {
                const response = responses[i];
                const hrefElements = response.getElementsByTagNameNS('DAV:', 'href');
                const href = hrefElements[0]?.textContent || '';
                
                // 解码 href
                const decodedHref = decodeURIComponent(href || '');
                const normalizedHref = decodedHref.replace(/\/+$/, '');
                
                // 排除目录本身（比较规范化后的路径）
                if (normalizedRequestPath && normalizedRequestPath.endsWith(normalizedHref)) {
                    continue;
                }
                
                // 提取文件名
                const name = decodedHref.split('/').filter(Boolean).pop() || '';
                
                if (!name) continue;
                
                const propstat = response.getElementsByTagNameNS('DAV:', 'propstat')[0];
                const prop = propstat?.getElementsByTagNameNS('DAV:', 'prop')[0];
                
                const resourcetype = prop?.getElementsByTagNameNS('DAV:', 'resourcetype')[0];
                const isDirectory = resourcetype?.getElementsByTagNameNS('DAV:', 'collection').length > 0;
                
                const contentLength = prop?.getElementsByTagNameNS('DAV:', 'getcontentlength')[0]?.textContent;
                const size = contentLength ? parseInt(contentLength, 10) : 0;
                
                files.push({ name, isDir: isDirectory, size });
            }
            
            // 排序：目录在前，然后按名称排序
            return files.sort((a, b) => {
                if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        },
        // 从侧边栏打开文件
        async openSidebarFile(item){
            if (item.is_dir) {
                // 如果是目录，在侧边栏中加载该目录的文件列表
                this.file.sidebarLoading = true;
                this.file.sidebarFiles = [];
                
                // 计算新路径
                const currentPath = this.file.sidebarPath || '/';
                const newPath = currentPath.endsWith('/') 
                    ? currentPath + item.name + '/'
                    : currentPath + '/' + item.name + '/';
                
                this.file.sidebarPath = newPath;
                
                // 重新加载文件列表
                this.file.sidebarLoading = false;
                await this.loadSidebarFiles();
                return;
            }
            
            // 检查是否已在标签页中打开
            const existingTabIndex = this.file.openTabs.findIndex(t => t.name === item.name && t.path === this.file.sidebarPath + item.name);
            if (existingTabIndex >= 0) {
                // 切换到已存在的标签
                this.switchTab(existingTabIndex);
                return;
            }
            
            // 保存当前编辑器内容
            if (this.editor && this.currentTab) {
                this.currentTab.content = this.editor.state.doc.toString();
            }
            
            const filePath = this.file.sidebarPath + item.name;
            
            try {
                const response = await fetch(
                    `${this.outEditorInfo.origin}${this.outEditorInfo.webdavUrl}${filePath}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.outEditorInfo.webdavToken}`
                        }
                    }
                );
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                let content = await response.text();
                let readOnly = false;
                
                // 检查是否是特殊文件
                if (content.includes('seeker can\'t seek') || content.includes('operation not supported')) {
                    content = `# 此文件是特殊文件，不支持直接读取\n# 文件: ${item.name}\n# 类型: ${item.is_symlink ? '符号链接' : '特殊文件'}`;
                    readOnly = true;
                }
                
                this.file.openTabs.push({
                    name: item.name,
                    path: filePath,
                    content: content,
                    modified: false,
                    readOnly: readOnly,
                    is_symlink: item.is_symlink || false,
                    size: item.size
                });
                this.file.activeTabIndex = this.file.openTabs.length - 1;
                
                this.$nextTick(() => {
                    this.createEditor(content, readOnly);
                    this.updateTabsScrollButtons();
                    this.scrollToActiveTab();
                });
                
                if (readOnly) {
                    this.$message.warning('此文件是特殊文件，已设为只读');
                }
            } catch (e) {
                console.error('Failed to load file:', e);
                this.$message.error('加载文件失败: ' + (e.message || '未知错误'));
            }
        },
        // 侧边栏返回上级目录
        async sidebarGoBack(){
            if (!this.file.sidebarPath || this.file.sidebarPath === '/') return;
            
            // 计算上级路径
            const parts = this.file.sidebarPath.split('/').filter(p => p);
            parts.pop();
            const parentPath = parts.length > 0 ? '/' + parts.join('/') + '/' : '/';
            
            this.file.sidebarLoading = true;
            this.file.sidebarFiles = [];
            
            try {
                const encodedPath = parentPath.split('/').map(p => p ? encodeURIComponent(p) : '').join('/');
                const response = await fetch(
                    `${this.outEditorInfo.origin}${this.outEditorInfo.webdavUrl}${encodedPath}`,
                    {
                        method: 'PROPFIND',
                        headers: {
                            'Authorization': `Bearer ${this.outEditorInfo.webdavToken}`,
                            'Depth': '1',
                            'Content-Type': 'text/xml; charset=utf-8'
                        }
                    }
                );
                
                if (response.ok) {
                    const text = await response.text();
                    const files = this.parseWebDAVResponse(text, `${this.outEditorInfo.webdavUrl}${encodedPath}`);
                    
                    this.file.sidebarFiles = files.map(f => ({
                        name: f.name,
                        is_dir: f.isDir,
                        size: f.size || 0
                    }));
                    
                    // 更新路径
                    this.file.sidebarPath = parentPath;
                    this.file.currentPath = parentPath;
                }
            } catch (e) {
                console.error('Failed to go back:', e);
            } finally {
                this.file.sidebarLoading = false;
            }
        },
        // 切换自动换行
        toggleWordWrap(){
            this.file.wordWrap = !this.file.wordWrap;
            if (this.editor) {
                this.editor.dispatch({
                    effects: this.wordWrapCompartment.reconfigure(
                        this.file.wordWrap ? EditorView.lineWrapping : []
                    )
                });
            }
        },
        // 改变编码
        changeEncoding(encoding){
            this.file.encoding = encoding;
            // 编码改变时重新加载文件
            if (this.currentTab) {
                this.$message.info(`编码已切换为 ${encoding}，重新加载文件...`);
                // 可以在这里触发重新加载文件
            }
        },
        // 标签页滚动
        scrollTabs(delta) {
            const scrollEl = this.$refs.tabsScrollRef;
            if (scrollEl) {
                scrollEl.scrollBy({ left: delta, behavior: 'smooth' });
            }
        },
        updateTabsScrollButtons() {
            const scrollEl = this.$refs.tabsScrollRef;
            if (scrollEl) {
                this.showTabsScrollLeft = scrollEl.scrollLeft > 0;
                this.showTabsScrollRight = scrollEl.scrollLeft < scrollEl.scrollWidth - scrollEl.clientWidth - 5;
            }
        },
        // 打开搜索面板
        openSearchPanel() {
            this.searchPanel.visible = true;
            this.searchPanel.showReplace = false;
            // 如果有选中文本，自动填入搜索框
            if (this.editor) {
                const selection = this.editor.state.selection.main;
                if (selection.from !== selection.to) {
                    this.searchPanel.query = this.editor.state.doc.sliceString(selection.from, selection.to);
                }
            }
            this.$nextTick(() => {
                if (this.$refs.searchInputRef) {
                    this.$refs.searchInputRef.focus();
                }
            });
            this.doSearch();
        },
        closeSearchPanel() {
            this.searchPanel.visible = false;
            this.searchPanel.query = '';
            this.searchPanel.replace = '';
            this.clearSearchHighlight();
        },
        // 执行搜索
        doSearch() {
            if (!this.editor || !this.searchPanel.query) {
                this.clearSearchHighlight();
                this.searchPanel.matchCount = 0;
                this.searchPanel.currentMatch = 0;
                return;
            }
            const query = this.buildSearchQuery();
            if (!query) {
                this.clearSearchHighlight();
                return;
            }
            const state = this.editor.state;
            const matches = [];
            const text = state.doc.toString();
            query.lastIndex = 0;
            let match;
            while ((match = query.exec(text)) !== null) {
                matches.push({ from: match.index, to: match.index + match[0].length });
                if (query.lastIndex === match.index) query.lastIndex++;
            }
            this.searchPanel.matchCount = matches.length;
            this.searchPanel.currentMatch = matches.length > 0 ? 1 : 0;
            this.highlightSearchMatches(matches);
            if (matches.length > 0) {
                this.editor.dispatch({
                    selection: { anchor: matches[0].from, head: matches[0].to },
                    scrollIntoView: true
                });
            }
        },
        buildSearchQuery() {
            let query = this.searchPanel.query;
            if (!query) return null;
            let flags = 'g';
            if (!this.searchPanel.caseSensitive) {
                flags += 'i';
            }
            if (!this.searchPanel.useRegex) {
                query = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
            if (this.searchPanel.wholeWord) {
                query = `\\b${query}\\b`;
            }
            try {
                return new RegExp(query, flags);
            } catch (e) {
                return null;
            }
        },
        highlightSearchMatches(matches) {
            this.clearSearchHighlight();
            if (!this.editor || matches.length === 0) return;
            // 使用 setDocumentDecoration
            const decorations = matches.map(m => 
                Decoration.mark({ class: 'cm-search-match' }).range(m.from, m.to)
            );
            this.searchDecorator = Decoration.set(decorations);
            this.editor.dispatch({
                effects: StateEffect.appendConfig.of(
                    EditorView.decorations.of(this.searchDecorator)
                )
            });
        },
        clearSearchHighlight() {
            if (this.editor && this.searchDecorator) {
                // 重建编辑器以清除装饰
                const content = this.editor.state.doc.toString();
                const tab = this.currentTab;
                if (tab) {
                    this.createEditor(content, tab.readOnly);
                }
                this.searchDecorator = null;
            }
        },
        // 查找下一个
        findNext() {
            if (!this.editor || this.searchPanel.matchCount === 0) return;
            const query = this.buildSearchQuery();
            if (!query) return;
            const state = this.editor.state;
            const currentPos = state.selection.main.head;
            const text = state.doc.toString();
            let found = false;
            let firstMatch = null;
            let match;
            query.lastIndex = 0;
            while ((match = query.exec(text)) !== null) {
                if (!firstMatch) firstMatch = { from: match.index, to: match.index + match[0].length };
                if (match.index > currentPos) {
                    this.editor.dispatch({
                        selection: { anchor: match.index, head: match.index + match[0].length },
                        scrollIntoView: true
                    });
                    this.updateCurrentMatch(match.index);
                    found = true;
                    break;
                }
                if (query.lastIndex === match.index) query.lastIndex++;
            }
            if (!found && firstMatch) {
                this.editor.dispatch({
                    selection: { anchor: firstMatch.from, head: firstMatch.to },
                    scrollIntoView: true
                });
                this.searchPanel.currentMatch = 1;
            }
        },
        // 查找上一个
        findPrev() {
            if (!this.editor || this.searchPanel.matchCount === 0) return;
            const query = this.buildSearchQuery();
            if (!query) return;
            const state = this.editor.state;
            const currentPos = state.selection.main.from;
            const text = state.doc.toString();
            const matches = [];
            let match;
            query.lastIndex = 0;
            while ((match = query.exec(text)) !== null) {
                matches.push({ from: match.index, to: match.index + match[0].length });
                if (query.lastIndex === match.index) query.lastIndex++;
            }
            let prevMatch = null;
            for (let i = matches.length - 1; i >= 0; i--) {
                if (matches[i].to < currentPos) {
                    prevMatch = matches[i];
                    break;
                }
            }
            if (!prevMatch && matches.length > 0) {
                prevMatch = matches[matches.length - 1];
            }
            if (prevMatch) {
                this.editor.dispatch({
                    selection: { anchor: prevMatch.from, head: prevMatch.to },
                    scrollIntoView: true
                });
                this.updateCurrentMatch(prevMatch.from);
            }
        },
        updateCurrentMatch(pos) {
            const query = this.buildSearchQuery();
            if (!query) return;
            const text = this.editor.state.doc.toString();
            let count = 0;
            let match;
            query.lastIndex = 0;
            while ((match = query.exec(text)) !== null) {
                count++;
                if (match.index <= pos && match.index + match[0].length >= pos) {
                    this.searchPanel.currentMatch = count;
                    return;
                }
                if (query.lastIndex === match.index) query.lastIndex++;
            }
        },
        // 替换下一个
        replaceNext() {
            if (!this.editor || !this.searchPanel.query || !this.searchPanel.replace) return;
            const selection = this.editor.state.selection.main;
            if (selection.from !== selection.to) {
                const selectedText = this.editor.state.doc.sliceString(selection.from, selection.to);
                const query = this.buildSearchQuery();
                if (query && query.test(selectedText)) {
                    this.editor.dispatch({
                        changes: { from: selection.from, to: selection.to, insert: this.searchPanel.replace }
                    });
                    if (this.currentTab) {
                        this.currentTab.modified = true;
                    }
                    this.findNext();
                    return;
                }
            }
            this.findNext();
        },
        // 全部替换
        replaceAll() {
            if (!this.editor || !this.searchPanel.query) return;
            const query = this.buildSearchQuery();
            if (!query) return;
            const text = this.editor.state.doc.toString();
            const matches = [];
            let match;
            query.lastIndex = 0;
            while ((match = query.exec(text)) !== null) {
                matches.push({ from: match.index, to: match.index + match[0].length });
                if (query.lastIndex === match.index) query.lastIndex++;
            }
            if (matches.length === 0) return;
            // 从后向前替换
            const changes = [];
            for (let i = matches.length - 1; i >= 0; i--) {
                changes.push({ from: matches[i].from, to: matches[i].to, insert: this.searchPanel.replace });
            }
            this.editor.dispatch({ changes });
            if (this.currentTab) {
                this.currentTab.modified = true;
            }
            this.$message.success(`已替换 ${matches.length} 处`);
            this.searchPanel.matchCount = 0;
            this.searchPanel.currentMatch = 0;
            this.clearSearchHighlight();
        },
        // 更新光标位置
        updateCursorPosition(){
            if (this.editor) {
                const pos = this.editor.state.selection.main.head;
                const line = this.editor.state.doc.lineAt(pos);
                this.editorCursor = {
                    line: line.number,
                    column: pos - line.from + 1
                };
            }
        },
        // 创建文件
        openCreateFile(){
            this.createFilePrompt = {
                show: true,
                name: "",
                type: "file",
                isConfig: this.form.isMount,
                disabeld: this.form.isMount,
                ok: ()=>{this.createFile()}
            }
        },
        // 提交创建文件
        createFile(){
            if(!this.createFilePrompt.name){return;}
            if(/\//.test(this.createFilePrompt.name)){this.$message.warning('文件名称格式有误'); return;}
            if(!this.form.isMount && this.createFilePrompt.isConfig){
                this.fileCatch.push({
                    fileName: this.createFilePrompt.name,
                    fileValue: '',
                    prower: '777',
                    user: 'root',
                    path: this.showPath,
                })
                this.createFilePrompt.show = false;
                this.refreshCatch();
                return;
            }

            axios.put(`${this.outEditorInfo.origin}${this.outEditorInfo.webdavUrl}${encodeURI(this.partPath+this.createFilePrompt.name)}`, '', {
                headers: {
                    "content-type": "application/octet-stream",
                },
                transformRequest: [(data) => data],
            }).then(res=>{
                this.$message.success('操作成功');
                this.createFilePrompt.show = false;
                this.getFileList();
            })

            // this.command(`${this.form.preCmd} --pid=${this.form.pid} --subPid=${this.form.subPid} --cmd=touch --srcPath='${decodeURIComponent(this.partPath+this.createFilePrompt.name)}'`,(res)=>{
            //     this.$message.success('操作成功');
            //     this.createFilePrompt.show = false;
            //     this.getFileList();
            // });
        },
        // 立即生效
        submitCatch(){
            Promise.all(this.fileCatch.map(i=>{
                return this.createConfig(i);
            })).then(async (namearr)=>{
                let kind = this.is_component? this.componentData.kind : this.$route.params.kind;
                let id = this.is_component? this.componentData.id : this.$route.params.id;
                let { data } = await k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ kind +"/"+ id );
                let spec = data?.spec?.template?.spec;
                if(!spec){return}

                spec.volumes = spec.volumes || [];
                spec.containers[0].volumeMounts = spec.containers[0]?.volumeMounts || [];
                if(this.mfEdit){
                    // 清除挂载文件,重新push
                    spec.volumes = spec.volumes.filter(v=>!v.configMap);
                    spec.containers[0].volumeMounts = spec.containers[0].volumeMounts.filter(v=>{
                        return spec.volumes.find(i=>i.name==v.name)
                    })
                    for(let idx=0; idx<this.mfList.length; idx++){
                        let i = this.mfList[idx];
                        if(i.delete){
                            // 删除configmap
                            let configmapName = i.configMap?.name;
                            await k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+configmapName, {noAlert:true});
                            continue;
                        }
                        if(i.edit){
                            let txt = i.editValue;
                            let configmapName = i.configMap?.name;
                            await k8sproxy.patch("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+configmapName,{data:{'default-cnf':txt}},{
                                loading: true,
                                headers: {'Content-Type': 'application/strategic-merge-patch+json'},
                            });
                        }
                        if(i.rename){
                            i.configMap.items[0].path = i.rename;
                        }
                        spec.volumes.push({
                            name: i.name,
                            configMap: i.configMap,
                        });
                        spec.containers[0].volumeMounts.push({
                            mountPath: i.rename? i.mountPath.replace(/[^\/]+$/,i.rename) : i.mountPath,
                            subPath: i.rename || i.subPath,
                            name: i.name,
                        });
                    }
                    this.mfEdit = false;
                }

                namearr.forEach(i=>{
                    spec.volumes.push({
                        name: i.name.replace(/\./g,'') + '-volume',
                        configMap: {
                            name: i.name,
                            items: [{
                                key: 'default-cnf',
                                path: i.title,
                            }],
                            defaultMode: parseInt(i.prower,8),
                        }
                    })
                    spec.containers[0].volumeMounts?.push({
                        mountPath: i.path.replace(/\/$/,'') + '/' + i.title,
                        subPath: i.title,
                        name: i.name.replace(/\./g,'') + '-volume',
                    })
                })
                // return;
                // console.log(data);
                return k8sproxy.put("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ kind +"/"+ id, data);
            }).then((ref)=>{
                if(!ref?.data){return}
                this.$message.success('操作成功');
                this.fileCatch = [];
                this.$emit('refresh');
            });
        },
        // 创建configmap
        createConfig(item){
            let title = item.fileName;

            let newTitle = this.createName() + (/^\./.test(title)?'':'-') + title.toLowerCase().replace(/_/g,'-');
            // metadata.name加标识防止重复，annotations.title不加
            let o = {
                apiVersion: 'v1',
                kind: 'ConfigMap',
                metadata: {
                    name: newTitle,
                    labels: { type: 'file' },
                    annotations: {
                        title: title,
                        type: 'file'
                    }
                },
            }
            if(item.isImg){
                // o.data = {
                //     'default-cnf': item.fileValue,
                // };
                o.binaryData = {
                    'default-cnf': item.fileValue,
                };
            }else{
                o.data = {
                    'default-cnf': item.fileValue,
                };
            }
            
            return k8sproxy.post("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps", o,{loading:true}).then(res=>{
                return {
                    title: title,
                    name: newTitle,
                    path: item.path,
                    prower: item.prower,
                    user: item.user,
                }
            });
        },

        createName(n){
            let len = n || 8;
            let s = 'abcdefghijklmnopqrstuvwxyz';
            let p = '';
            for(var i=0; i<len; i++){
                p = p + s[parseInt(Math.random()*s.length)]
            }
            return p;
        },
        // 重命名 - 使用 WebDAV MOVE 替代 exec2
        async renameSubmit(){
            let oldname = this.rename.row.type=='symlink'? this.rename.row.name.replace(/\s*->\s*.*$/,'') : this.rename.row.name;
            if(this.rename.name == oldname || !this.rename.name){
                this.rename.row = null;
                this.rename.name = '';
                return;
            }
            if(this.rename.row.fromFileCatch){
                let find = this.fileCatch.find(i=>i.fileName == this.rename.row.name && i.path==this.showPath);
                if(find){
                    find.fileName = this.rename.name;
                    this.$message.success('操作成功');
                    this.refreshCatch();
                }
                this.rename.row = null;
                this.rename.name = '';
                return;
            }
            if(!this.form.isMount && this.rename.row.mf){
                let find = this.mfList.find(i=>i.name == this.rename.row.mf);
                if(find){
                    find.rename = this.rename.name;
                    this.mfEdit = true;
                    this.refreshCatch();
                }
                this.rename.row = null;
                this.rename.name = '';
                return;
            }
            
            // 使用 WebDAV MOVE 替代 exec2 mv
            const srcPath = decodeURIComponent(this.partPath + oldname);
            const dstPath = decodeURIComponent(this.partPath + this.rename.name);
            
            try {
                let base = ('/' + this.outEditorInfo.webdavBasePath).replace(/^\/+/,'/');
                await axios({
                    url: `${this.outEditorInfo.origin}${this.outEditorInfo.webdavUrl}${srcPath}`,
                    method: 'MOVE',
                    headers: {
                        'Destination': `${base}${dstPath}`,
                        'Overwrite': 'T'
                    }
                });
                this.$message.success('重命名成功');
                this.getFileList();
            } catch (err) {
                console.error('重命名失败:', err);
                this.$message.error('重命名失败: ' + (err.response?.data?.msg || err.message));
            }
            
            this.rename.row = null;
            this.rename.name = '';
        },
        // 删除
        async deleteFile(row, multiple){
            let ct = '';
            if(!row && multiple){
                let arr = [];
                this.selectedKeys.forEach(item=>{
                    let fdrow = this.fileList.find(i=>i.key == item);
                    if(!this.form.isMount && fdrow?.mf){
                        let mf = this.mfList.find(i=>i.name == fdrow.mf)
                        if(mf){
                            mf.delete = true;
                            this.mfEdit = true;
                            this.refreshCatch();
                        }
                    }else{
                        arr.push(encodeURI(`${this.partPath + item}`));
                    }
                })
                ct = arr;//.join(' ');
            }else{
                ct = encodeURI(`${this.partPath + row.name}`);
                // 如果是挂载文件
                if(row?.mf){
                    let mf = this.mfList.find(i=>i.name == row.mf);
                    if(mf){
                        mf.delete = true;
                        this.mfEdit = true;
                        this.refreshCatch();
                    }
                    return;
                }
            }
            if(row?.fromFileCatch){
                let index = this.fileCatch.findIndex(i=>i.fileName == row.name && i.path==this.showPath);
                if(index>=0){
                    this.fileCatch.splice(index,1);
                    this.$message.success('操作成功');
                    this.refreshCatch();
                }
                return;
            }
            if(!ct){return}
            if(!Array.isArray(ct)){ ct = [ct]; }

            for(let i in ct){
                await axios.delete(`${this.outEditorInfo.origin}${this.outEditorInfo.webdavUrl}${ct[i]}`).catch(()=>{})
            }

            this.$message.success("删除成功");
            this.getFileList();


            // ct = decodeURIComponent(ct);
            // this.command(`${this.form.preCmd} --pid=${this.form.pid} --subPid=${this.form.subPid} --cmd=rm ${ct}`,(res)=>{
            //     this.$message.success("删除成功");
            //     this.getFileList();
            // });
        },
        // 新建文件夹
        openCreateDir(){
            this.createFilePrompt = {
                show: true,
                name: "",
                type: "dir",
                ok: ()=>{this.createDir()}
            }
        },
        // 提交新建文件夹
        createDir(){
            if(!this.createFilePrompt.name){return;}
            if(/\//.test(this.createFilePrompt.name)){this.$message.warning('文件夹名称格式有误'); return;}
            
            axios({
                url: `${this.outEditorInfo.origin}${this.outEditorInfo.webdavUrl}${this.partPath+ this.createFilePrompt.name}/`,
                method: 'MKCOL',
            }).then(()=>{                
                this.$message.success('操作成功');
                this.getFileList();
            })
            // this.command(`${this.form.preCmd} --pid=${this.form.pid} --subPid=${this.form.subPid} --cmd=mkdir --srcPath='${decodeURIComponent( this.partPath+ this.createFilePrompt.name )}'`,(res)=>{
            //     this.$message.success('操作成功');
            //     this.getFileList();
            // });
        },
        // 打开压缩dialog
        compressAct(row,multiple){
            const ext = this.compress.type || 'zip';
            if(!row && multiple){
                this.compress.row = null;
                this.compress.zipname = decodeURIComponent(Date.now() + '.' + ext);
                this.compress.path = decodeURIComponent(this.showPath + this.compress.zipname);
            }else{
                this.compress.row = row;
                this.compress.zipname = decodeURIComponent(/[^.]\.\w+$/.test(row.name)? row.name.replace(/\.\w+$/, '.' + ext) : (row.name + '.' + ext));
                this.compress.path = decodeURIComponent(this.showPath + this.compress.zipname);
            }
            this.compress.show = true;
        },
        // 压缩类型改变时更新路径
        onCompressTypeChange(newType){
            if(this.compress.path){
                const ext = newType || 'zip';
                this.compress.path = this.compress.path.replace(/\.(zip|tar(\.(gz|xz))?)$/, '.' + ext);
            }
        },
        // 压缩 - 使用 Go 后端接口
        async zipAct(){
            let output = "";
            let sources = [];
            const ext = this.compress.type || 'zip';
            const extPattern = ext === 'tar' ? '\\.tar$' : `\\.${ext.replace('.', '\\.')}$`;
            const regex = new RegExp(`^(\\/([^/]+\\/)*)?([^/]+${extPattern})`);
            let match = this.compress.path.match(regex);
            if(!match){ 
                this.$message.warning('压缩路径格式有误，请使用 .' + ext + ' 扩展名'); 
                return; 
            }

            if(/^\//.test(this.compress.path)){
                output = this.compress.path;
            }else{
                output = this.showPath + this.compress.path;
            }
            
            if(this.compress.row){
                sources.push(this.partPath + this.compress.row.name);
            }else{
                this.selectedKeys.forEach(item=>{
                    sources.push(this.partPath + item);
                })
            }
            
            output = decodeURIComponent(output);
            
            try {
                await compressFiles(this.outEditorInfo.compressUrl, sources, output);
                
                this.$message.success('操作成功');
                this.compress = {
                    show: false,
                    type: 'zip',
                    row: null,
                }
                this.getFileList();
            } catch (err) {
                console.error('压缩失败:', err);
                this.$message.error('压缩失败: ' + (err.response?.data?.msg || err.message));
            }
        },
        uncompressAct(row){
            this.uncompress = {
                row: row,
                show: true,
                gbk: false,
                path: decodeURIComponent(this.form.path),
            }
        },
        // 解压 - 使用 Go 后端接口
        async unzipAct(){
            let row = this.uncompress.row;
            
            let match = this.uncompress.path.match(/^((\/[^/]+)*\/?)|\/$/);
            if(!match){ this.$message.warning('解压路径格式有误'); return; }
            
            const sourcePath = decodeURIComponent(this.partPath + row.name);
            const targetPath = decodeURIComponent(this.uncompress.path);
            
            try {
                await extractFiles(this.outEditorInfo.compressUrl, sourcePath, targetPath);
                
                this.$message.success('操作成功');
                this.uncompress = {row:null, show:false,};
                this.getFileList();
            } catch (err) {
                console.error('解压失败:', err);
                this.$message.error('解压失败: ' + (err.response?.data?.msg || err.message));
            }
        },
        // 粘贴 - 使用 WebDAV COPY/MOVE 替代 exec2
        async toPaste(){
            const isCopy = !!this.copy;
            // 先编码再解码，确保中文路径正确处理
            const srcPath = decodeURIComponent(encodeURI(this.copy || this.shear));
            const fileName = srcPath.replace(/^.*\//, '');
            const dstPath = decodeURIComponent(encodeURI(this.form.path.replace(/\/$/, '') + '/' + fileName));
            const webdavUrl = `${this.outEditorInfo.origin}${this.outEditorInfo.webdavUrl}`;
            
            try {
                if (isCopy) {
                    // 复制操作 - 使用 WebDAV COPY
                    await axios({
                        url: `${webdavUrl}${srcPath}`,
                        method: 'COPY',
                        headers: {
                            'Destination': `${webdavUrl}${dstPath}`,
                            'Overwrite': 'T'
                        }
                    });
                } else {
                    // 剪切操作 - 使用 WebDAV MOVE
                    await axios({
                        url: `${webdavUrl}${srcPath}`,
                        method: 'MOVE',
                        headers: {
                            'Destination': `${webdavUrl}${dstPath}`,
                            'Overwrite': 'T'
                        }
                    });
                }
                
                this.$message.success("粘贴成功");
                this.copy = null;
                this.shear = null;
                this.getFileList();
            } catch (err) {
                console.error('粘贴失败:', err);
                this.$message.error('粘贴失败: ' + (err.response?.data?.msg || err.message));
            }
        },
        copyAct(row){
            this.copy = this.partPath + row.name;
            let record = this.fileList.find(i=>i.name==row.name);
            this.csChmod = record.power;
            this.csChown = record.user;
            this.shear = null;
            this.$message.success('复制成功');
        },
        shearAct(row){
            this.copy = null;
            this.shear = this.partPath + row.name;
            let record = this.fileList.find(i=>i.name==row.name);
            this.csChmod = record.power;
            this.csChown = record.user;
            this.$message.success('剪切成功');
        },
        // 权限
        authorityEdit(row,multiple){
            let arr = [ "", "1", "2", "12", "4", "14", "24", "124" ];
            if(!row && multiple){
                let u = this.fileList?.find(i=>i.key==this.selectedKeys?.[0])?.user || '';
                let user = this.userArr?.find(i=>i.name === u);

                this.authority.row = null;
                this.authority.chmod = '';
                this.authority.chown = user ? String(user.id) : u;
                this.authority.a1 = [];
                this.authority.a2 = [];
                this.authority.a3 = [];
            }else{
                let user = this.userArr?.find(i=>i.name === row.user);
                this.authority.row = row;
                this.authority.chmod = row.power;
                this.authority.chown = user ? String(user.id) : (row.user || '');
                this.authority.a1 = arr[row.power[0]].split('');
                this.authority.a2 = arr[row.power[1]].split('');
                this.authority.a3 = arr[row.power[2]].split('');
            }
            this.authority.show = true;
        },
        // 权限修改
        async changeAuthority(){
            let chmod = false;
            let chown = false;
            let ct = '';
            if(this.authority.row){
                if(this.authority?.row?.fromFileCatch){
                    let find = this.fileCatch.find(i=>i.fileName==this.authority.row.name && i.path==this.showPath);
                    if(find){
                        find.prower = this.authority.chmod;
                        find.user = this.authority.chown;
                        this.$message.success('操作成功');
                        this.refreshCatch();
                    }
                    this.authority.show = false;
                    return;
                }
                if(!this.form.isMount && this.authority?.row?.mf){
                    let find = this.mfList.find(i=>i.mountPath == this.showPath + this.authority?.row?.key);
                    if(find){
                        find.configMap.defaultMode = parseInt(this.authority.chmod,8);
                        this.mfEdit = true;
                        this.refreshCatch();
                    }
                    return;
                }
                ct = `'${this.partPath}${this.authority.row.name}'`;
            }else{
                let arr = [];
                this.selectedKeys.forEach(item=>{
                    let fdrow = this.fileList.find(i=>i.key == item);
                    if(!this.form.isMount && fdrow?.mf){
                        let mf = this.mfList.find(i=>i.name == fdrow.mf)
                        if(mf){
                            mf.configMap.defaultMode = parseInt(this.authority.chmod,8);
                            this.mfEdit = true;
                            this.refreshCatch();
                        }
                    }else{
                        arr.push(`'${this.partPath}${item}'`);
                    }
                })
                ct = arr.join(' ');
            }
            if(!ct){
                this.authority.show = false;
                return;
            }
            ct = decodeURIComponent(ct);
            
            // 使用 permission-agent API 替代 exec2
            if (this.outEditorInfo?.permissionUrl) {
                const origin = this.outEditorInfo.origin;
                const permissionUrl = this.outEditorInfo.permissionUrl;
                const recursive = this.authority.recursive;
                
                // 处理单个文件或多个文件
                let paths = [];
                if (this.authority.row) {
                    paths = [encodeURI(this.partPath + this.authority.row.name)];
                } else {
                    paths = this.selectedKeys.map(item => encodeURI(this.partPath + item));
                }
                
                // 并行执行 chmod 和 chown
                const chmodPromises = paths.map(path => {
                    return axios.post(`${origin}${permissionUrl}/chmod`, {
                        path: path,
                        mode: this.authority.chmod,
                        recursive: recursive
                    }, { noAlert: true }).then(() => true).catch(() => false);
                });
                
                const chownPromises = paths.map(path => {
                    if (!this.authority.chown) return Promise.resolve(true);
                    return axios.post(`${origin}${permissionUrl}/chown`, {
                        path: path,
                        owner: this.authority.chown.toString(),
                        recursive: recursive
                    }, { noAlert: true }).then(() => true).catch(() => false);
                });
                
                const chmodResults = await Promise.all(chmodPromises);
                const chownResults = await Promise.all(chownPromises);
                
                chmod = chmodResults.every(r => r);
                chown = chownResults.every(r => r);
            } else {
                // 兼容：如果没有 permissionUrl，回退到旧的 exec2 方式
                await this.command(`${this.form.preCmd} --pid=${this.form.pid} --subPid=${this.form.subPid} --cmd=chmod ${this.authority.chmod} ${ct}`, ()=>{ chmod = true; });
                await this.command(`${this.form.preCmd} --pid=${this.form.pid} --subPid=${this.form.subPid} --cmd=chown ${this.authority.chown} ${ct}`, ()=>{ chown = true; });
            }
            
            chmod && chown && this.$message.success("操作成功");
            this.authority.show = false;
            this.getFileList();
        },
        renameEdit(row){
            // console.log(row.name)
            this.rename.row = row;
            this.rename.name = row.type=='symlink'? row.name.replace(/\s*->\s*.*$/,'') : row.name;
            this.$nextTick(()=>{
                document.querySelector('.renameinput')?.select();
            });
        },
        // input file 选择文件
        selectFile(event){
            let files = event.target.files;
            if(!files.length){return}
            if(files.length==1){
                this.upload.file = files[0];
                this.upload.filename = files[0].name.replace(/\s/g,'');;
                this.upload.uploading = false;
            }
        },
        // 上传文件提交
        async downloadzip(){
            if(!this.upload.filename){
                this.$message.warning("请先选择文件");
                return;
            }
            

            let isImg = /^image\//.test(this.upload.file.type)
            
            if(!this.form.isMount && this.upload.forever){
                const fileSizeInBytes = this.upload.file.size;
                const oneMBInBytes = 1024 * 1024;
                if (fileSizeInBytes > oneMBInBytes) {
                    this.$message.warning("上传永久文件不能大于1M");
                    return;
                }
                const reader = new FileReader();
                reader.onload = ()=>{
                    let value = reader.result;
                    this.fileCatch.push({
                        isImg: isImg,
                        fileName: this.upload.filename,
                        fileValue: isImg? value.replace(/^.*base64,/,'') : value,
                        prower: '777',
                        user: 'root',
                        path: this.showPath,
                    })
                    this.refreshCatch();
                    this.upload.show = false;
                };
                reader[isImg?'readAsDataURL':'readAsText'](this.upload.file);
                
                return;
            }

            const { handleFileUpload } = await import('./files.upload.js');
            handleFileUpload(this);

            // let data = new FormData();
            // data.append('file',this.upload.file);
            // data.append('X-Amz-Credential', 'AKIAIOSFODNN7EXAMPLE/20151229/us-east-1/s3/aws4_request');
            // data.append('X-Amz-Algorithm', 'AWS4-HMAC-SHA256')
            // data.append('key', 'upload/'+this.upload.filename);
            // this.upload.uploading = true;
            // panelApi.post('/s3bucket',data).then(res=>{
            //     let data = {
            //         from: 'upload/'+this.upload.filename,
            //         to: (this.origin=='nodes'?'/host':'') + '/proc/'+ this.form.pid+'/root' + (this.form.subPid?`/proc/${this.form.subPid}/root`:'') + this.partPath +  this.upload.filename,
            //         // fromOrTo: 'to',
            //         upload: 1,
            //         namespace: this.namespaceActive,
            //         podName: this.form.pod_name,
            //     }
            //     const params = new URLSearchParams();
            //     for (let key in data) {  
            //         params.append(key, data[key]);  
            //     }
            //     panelApi.post('/cp',params.toString(),{headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).then(res=>{
            //         this.upload.uploading = false;
            //         this.$message.success('操作成功')
            //         this.upload.show = false;
            //         this.getFileList();
            //     }).catch(()=>{
            //         this.upload.uploading = false;
            //     })
            // }).catch(()=>{this.upload.uploading = false;})
        },
        openUpload(){
            this.upload = {
                show: true,
                file: null,
                filename: '',
                uploading: false,
                forever: this.form.isMount,
                dir: '根目录'+this.showPath,
            }
        },
        inputContent(file){
            if(!this.editor){return}
            let txt = this.editor.state.doc.toString();
            this.editor.dispatch({ changes: {from: 0, to:txt.length, insert:String(file)}});
        },
        
        // reloadApp(){
        //     axios.patch("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/deployments/"+this.$route.params.id, {
        //         "spec": {"template": {"metadata":{"annotations":{"reload":String(Date.now())}}}}
        //     },{
        //         headers: {'Content-Type': 'application/strategic-merge-patch+json'},
        //     }).then(res=>{
        //         this.$emit('refresh');
        //     }).catch(()=>{})
        // },
        parseUserInfo(text) {
            const lines = text.split('\n');
            const userArray = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line) {
                    const parts = line.split(':');
                    const name = parts[0];
                    const id = parseInt(parts[2], 10);
                    userArray.push({ name, id });
                }
            }

            return userArray;
        }
    },
}
</script>

<style>
.btn-groups .arco-btn-outline{padding:0 10px; border-color:var(--color-border-3); color:var(--color-text-2);}
.btn-groups .arco-btn-outline.arco-btn-disabled{border-color:var(--color-border-2); color:var(--color-text-4);}
.filetable .opt-icon{cursor:pointer; box-sizing:border-box; display:inline-block; line-height:1; min-width:24px; padding:4px; border-radius:2px; font-size:16px; color:#165dff;}
body[arco-theme='dark'] .filetable .opt-icon{color:#3c7eff;}
.filetable .opt-icon:hover{background:var(--color-secondary-hover);}
.filetable .opt-icon + .opt-icon{margin-left:10px;}

/* 编辑器增强样式 - 全局样式 */
.editor-modal .arco-modal-body,
.arco-modal.editor-modal .arco-modal-body,
.arco-modal-body.editor-modal-body { 
    padding: 0 !important; 
    display: flex !important; 
    flex-direction: column !important; 
    height: 75vh !important;
    max-height: 75vh !important;
    min-height: 400px !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
}

/* 编辑器Modal - 使用 Arco Design CSS 变量 */
.editor-modal.arco-modal,
.arco-modal.editor-modal {
    --editor-bg-1: var(--color-bg-1, #1e1e1e);
    --editor-bg-2: var(--color-bg-2, #252526);
    --editor-bg-3: var(--color-fill-3, #3c3c3c);
    --editor-border: var(--color-border-1, #3c3c3c);
    --editor-text: var(--color-text-2, #cccccc);
    --editor-text-muted: var(--color-text-4, #6d6d6d);
}
.editor-modal .arco-modal-header {
    background: var(--color-bg-2, #252526) !important;
    border-bottom: 1px solid var(--color-border-1, #3c3c3c) !important;
    padding: 10px 16px !important;
}
.editor-modal .arco-modal-title {
    color: var(--color-text-2, #cccccc) !important;
}
.editor-modal .arco-modal-close-btn {
    color: var(--color-text-4, #6d6d6d) !important;
}
.editor-modal .arco-modal-close-btn:hover {
    color: var(--color-text-1, #ffffff) !important;
    background: var(--color-fill-3, #3c3c3c) !important;
}
.editor-modal .arco-modal-content {
    background: var(--color-bg-1, #1e1e1e) !important;
}

/* 编辑器内滚动条 */
.editor-wrapper::-webkit-scrollbar,
.editor-tabs-scroll::-webkit-scrollbar,
.sidebar-content::-webkit-scrollbar,
#editor_textarea .cm-scroller::-webkit-scrollbar {
    width: 10px;
    height: 10px;
}
.editor-wrapper::-webkit-scrollbar-track,
.editor-tabs-scroll::-webkit-scrollbar-track,
.sidebar-content::-webkit-scrollbar-track,
#editor_textarea .cm-scroller::-webkit-scrollbar-track {
    background: var(--color-bg-1, #1e1e1e);
}
.editor-wrapper::-webkit-scrollbar-thumb,
.editor-tabs-scroll::-webkit-scrollbar-thumb,
.sidebar-content::-webkit-scrollbar-thumb,
#editor_textarea .cm-scroller::-webkit-scrollbar-thumb {
    background: var(--color-fill-4, #424242);
    border-radius: 5px;
}
.editor-wrapper::-webkit-scrollbar-thumb:hover,
.editor-tabs-scroll::-webkit-scrollbar-thumb:hover,
.sidebar-content::-webkit-scrollbar-thumb:hover,
#editor_textarea .cm-scroller::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-4, #4f4f4f);
}

/* 编辑器头部 */
.editor-header {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
}
.editor-title-text { font-weight: 500; }
.editor-current-file { 
    color: var(--color-text-3); 
    font-size: 12px;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 编辑器包装器 - 使用 Arco Design CSS 变量实现主题适配 */
.editor-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--color-bg-1, #1e1e1e);
}

/* 标签栏 */
.editor-tabs-bar {
    display: flex;
    height: 32px;
    background: var(--color-bg-2, #252526);
    border-bottom: 1px solid var(--color-border-1, #3c3c3c);
    flex-shrink: 0;
}

.editor-tabs-scroll {
    display: flex;
    overflow-x: auto;
    flex: 1;
    scrollbar-width: none;
}
.editor-tabs-scroll::-webkit-scrollbar { display: none; }

.editor-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    height: 32px;
    min-width: 60px;
    max-width: 140px;
    background: var(--color-fill-2, #2d2d2d);
    border-right: 1px solid var(--color-border-1, #3c3c3c);
    cursor: pointer;
    font-size: 12px;
    color: var(--color-text-3, #969696);
    transition: all 0.15s;
    user-select: none;
}
.editor-tab:hover { background: var(--color-fill-3, #3c3c3c); }
.editor-tab.active { 
    background: var(--color-bg-1, #1e1e1e); 
    color: var(--color-text-1, #ffffff);
}
.editor-tab.modified .tab-name::before { 
    content: ' ●'; 
    color: #e2c08d;
    font-size: 10px;
    margin-right:2px;
}
.tab-name { 
    overflow: hidden; 
    text-overflow: ellipsis; 
    white-space: nowrap; 
    flex: 1;
}
.tab-close { 
    display: flex; 
    align-items: center; 
    justify-content: center;
    width: 16px; 
    height: 16px; 
    border-radius: 3px;
    font-size: 10px;
    color: var(--color-text-4, #6d6d6d);
    opacity: 0;
    transition: opacity 0.15s;
}
.editor-tab:hover .tab-close { opacity: 1; }
.tab-close:hover { 
    background: var(--color-fill-3, #4d4d4d); 
    color: var(--color-text-1, #ffffff);
}

.tabs-scroll-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 32px;
    background: var(--color-bg-2, #252526);
    cursor: pointer;
    color: var(--color-text-4, #6d6d6d);
    flex-shrink: 0;
    font-size: 12px;
}
.tabs-scroll-btn:hover {
    background: var(--color-fill-3, #3c3c3c);
    color: var(--color-text-2, #cccccc);
}
.editor-tab:hover .tab-close { opacity: 1; }
.tab-close:hover { 
    background: #4d4d4d; 
    color: #ffffff;
}
body[arco-theme='light'] .tab-close { color: #c9cdd4; }
body[arco-theme='light'] .tab-close:hover { 
    background: #c9cdd4; 
    color: #4e5969;
}

.tabs-scroll-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 32px;
    background: #252526;
    cursor: pointer;
    color: #6d6d6d;
    flex-shrink: 0;
    font-size: 12px;
}
body[arco-theme='light'] .tabs-scroll-btn {
    background: #f2f3f5;
    color: #86909c;
}
.tabs-scroll-btn:hover {
    background: #3c3c3c;
    color: #cccccc;
}
body[arco-theme='light'] .tabs-scroll-btn:hover {
    background: #e5e6e8;
    color: #4e5969;
}

.editor-container { 
    display: flex; 
    flex: 1; 
    min-height: 0; 
    overflow: hidden; 
    height: 100%;
}

/* 左侧文件列表 */
.editor-sidebar { 
    width: 200px; 
    min-width: 200px; 
    display: flex; 
    flex-direction: column; 
    background: var(--color-bg-2, #252526); 
    border-right: 1px solid var(--color-border-1, #3c3c3c); 
    min-height: 0; 
    height: 100%;
    box-sizing: border-box;
}
.sidebar-header { 
    padding: 8px 10px; 
    font-weight: 500; 
    border-bottom: 1px solid var(--color-border-1, #3c3c3c); 
    display: flex; 
    align-items: center; 
    gap: 6px; 
    background: var(--color-bg-2, #252526); 
    flex-shrink: 0; 
    font-size: 14px;
    color: var(--color-text-2, #cccccc);
}
.sidebar-refresh { 
    margin-left: auto; 
    font-size: 12px; 
    color: var(--color-text-4, #6d6d6d); 
    cursor: pointer;
    display: flex;
    align-items: center;
}
.sidebar-refresh:hover { color: var(--color-text-2, #cccccc); }
.sidebar-back { 
    font-size: 11px; 
    color: rgb(var(--primary-6, 55, 148, 255)); 
    cursor: pointer; 
    display: flex; 
    align-items: center; 
    gap: 2px; 
    padding: 2px 6px;
    border-radius: 4px;
}
.sidebar-back:hover { background: var(--color-fill-3, #3c3c3c); }
.sidebar-path { 
    padding: 4px 10px; 
    font-size: 10px; 
    color: var(--color-text-4, #6d6d6d); 
    background: var(--color-bg-2, #252526); 
    border-bottom: 1px solid var(--color-border-1, #3c3c3c); 
    flex-shrink: 0; 
    overflow: hidden; 
    text-overflow: ellipsis; 
    white-space: nowrap; 
}
.sidebar-path .path-text { word-break: break-all; }
.sidebar-content { flex: 1 1 0; overflow-y: auto; padding: 2px 0; min-height: 0; }
.sidebar-file-item { 
    padding: 4px 10px; 
    cursor: pointer; 
    display: flex; 
    align-items: center; 
    gap: 6px; 
    transition: background 0.15s; 
    font-size: 14px;
    color: var(--color-text-2, #cccccc);
}
.sidebar-file-item:hover { background: var(--color-fill-2, #2a2d2e); }
.sidebar-file-item.active { background: rgba(var(--primary-6, 9, 71, 113), 0.1); color: rgb(var(--primary-6, 255, 255, 255)); }
.sidebar-file-item.is-dir { color: var(--color-text-2, #c5c5c5); }
.sidebar-file-item.is-symlink { color: var(--color-text-4, #6d6d6d); font-style: italic; }
.sidebar-file-item .file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.sidebar-file-item .file-size { font-size: 10px; color: var(--color-text-4, #6d6d6d); }
.sidebar-loading, .sidebar-empty, .sidebar-error { padding: 16px; text-align: center; color: var(--color-text-4, #6d6d6d); font-size: 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.sidebar-error { color: var(--color-text-3); }
.sidebar-error-actions { margin-top: 6px; }
.sidebar-back-empty {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
    padding: 4px 10px;
    background: var(--color-fill-3, #3c3c3c);
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    color: var(--color-text-2, #cccccc);
    transition: all 0.15s;
}
.sidebar-back-empty:hover {
    background: var(--color-fill-4, #4d4d4d);
    color: var(--color-text-1, #ffffff);
}

/* 右侧编辑器 */
.editor-main { 
    flex: 1 1 0; 
    display: flex; 
    flex-direction: column; 
    background: var(--color-bg-1, #1e1e1e); 
    overflow: hidden; 
    min-width: 0; 
    min-height: 0; 
}
#editor_textarea { flex: 1 1 0; overflow: hidden; min-height: 0; }
#editor_textarea .cm-editor { height: 100% !important; }
#editor_textarea .cm-scroller { overflow: auto !important; }

/* 底部工具栏 */
.editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 10px;
    background: var(--color-bg-2, #252526);
    border-top: 1px solid var(--color-border-1, #3c3c3c);
    font-size: 11px;
    color: var(--color-text-4, #6d6d6d);
    min-height: 28px;
}

.toolbar-left {
    display: flex;
    align-items: center;
    gap: 6px;
}

.toolbar-center {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    justify-content: center;
}

.toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.toolbar-left .arco-btn {
    font-size: 12px;
    padding: 2px 8px;
    height: 24px;
}

.status-readonly { color: #cca700; display: flex; align-items: center; gap: 4px; }
.status-modified { color: #e2c08d; }
.status-cursor { color: #858585; }
.status-language { color: #569cd6; }
.status-size { color: #858585; }
.status-hint { color: #6d6d6d; font-size: 11px; }

.toolbar-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    transition: all 0.2s;
}
.toolbar-toggle:hover { background: var(--color-fill-3, #3c3c3c); }
.toolbar-toggle.active { color: rgb(var(--primary-6, 22, 93, 255)); }
.toolbar-toggle.disabled { cursor:no-drop; }

.toolbar-encoding {
    display: flex;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
}
.toolbar-encoding:hover { background: var(--color-fill-3, #3c3c3c); }

/* 搜索面板 */
.search-panel {
    background: var(--color-bg-2, #252526);
    border-bottom: 1px solid var(--color-border-1, #3c3c3c);
    padding: 6px 10px;
    flex-shrink: 0;
}
.search-panel-row {
    display: flex;
    align-items: center;
    gap: 6px;
}
.search-panel-row .arco-input-wrapper {
    background: var(--color-fill-3, #3c3c3c);
    border-color: var(--color-fill-3, #3c3c3c);
    width: 180px;
    height: 24px;
    font-size: 12px;
}
.search-panel-row .arco-input-wrapper:focus-within {
    border-color: rgb(var(--primary-6, 55, 148, 255));
}
.search-panel-row .arco-input {
    color: var(--color-text-2, #cccccc);
    font-size: 12px;
}
.search-panel-row .arco-input::placeholder {
    color: var(--color-text-4, #6d6d6d);
}
.search-actions {
    display: flex;
    align-items: center;
    gap: 2px;
}
.search-actions .arco-btn {
    background: transparent;
    border-color: transparent;
    color: var(--color-text-4, #6d6d6d);
    padding: 2px 6px;
    height: 24px;
    min-width: 24px;
}
.search-actions .arco-btn:hover {
    background: var(--color-fill-3, #3c3c3c);
    color: var(--color-text-2, #cccccc);
}
.search-info {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
    font-size: 11px;
    color: var(--color-text-4, #6d6d6d);
}
.search-info .no-match {
    color: rgb(var(--danger-6, 241, 76, 76));
}
.search-option {
    display: flex;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    font-size: 10px;
}
.search-option .arco-checkbox {
    font-size: 10px;
}
.search-option .arco-checkbox-label {
    color: var(--color-text-4, #6d6d6d);
}

/* 搜索高亮 */
.cm-search-match {
    background-color: rgba(255, 215, 0, 0.3) !important;
    border: 1px solid rgba(255, 215, 0, 0.5);
}
.cm-search-match.cm-selection {
    background-color: rgba(255, 215, 0, 0.5) !important;
}

/* 兼容旧样式 */
.editor-status-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 12px;
    background: #252526;
    border-top: 1px solid #3c3c3c;
    font-size: 12px;
    color: #858585;
}

/* 全局语法高亮样式 - 深色主题 */
body[arco-theme='dark'] .cm-editor .tok-keyword,
body[arco-theme='dark'] .cm-editor .tok-operator,
body[arco-theme='dark'] .cm-editor .tok-punctuation { color: #569cd6 !important; }
body[arco-theme='dark'] .cm-editor .tok-string { color: #ce9178 !important; }
body[arco-theme='dark'] .cm-editor .tok-number { color: #b5cea8 !important; }
body[arco-theme='dark'] .cm-editor .tok-comment { color: #6a9955 !important; }
body[arco-theme='dark'] .cm-editor .tok-variableName { color: #9cdcfe !important; }
body[arco-theme='dark'] .cm-editor .tok-typeName { color: #4ec9b0 !important; }
body[arco-theme='dark'] .cm-editor .tok-propertyName { color: #9cdcfe !important; }
body[arco-theme='dark'] .cm-editor .tok-atom { color: #569cd6 !important; }
body[arco-theme='dark'] .cm-editor .tok-meta { color: #808080 !important; }
body[arco-theme='dark'] .cm-editor .tok-labelName { color: #c8c8c8 !important; }
body[arco-theme='dark'] .cm-editor .tok-attributeValue { color: #ce9178 !important; }
body[arco-theme='dark'] .cm-editor .tok-attributeName { color: #9cdcfe !important; }
body[arco-theme='dark'] .cm-editor .tok-heading { color: #569cd6 !important; font-weight: bold; }
body[arco-theme='dark'] .cm-editor .tok-quote { color: #6a9955 !important; }
body[arco-theme='dark'] .cm-editor .tok-link { color: #3794ff !important; text-decoration: underline; }
body[arco-theme='dark'] .cm-editor .tok-invalid { color: #f44747 !important; }

/* 全局语法高亮样式 - 浅色主题 */
body:not([arco-theme='dark']) .cm-editor .tok-keyword,
body:not([arco-theme='dark']) .cm-editor .tok-operator,
body:not([arco-theme='dark']) .cm-editor .tok-punctuation { color: #cf222e !important; }
body:not([arco-theme='dark']) .cm-editor .tok-string { color: #0a3069 !important; }
body:not([arco-theme='dark']) .cm-editor .tok-number { color: #0550ae !important; }
body:not([arco-theme='dark']) .cm-editor .tok-comment { color: #6e7781 !important; }
body:not([arco-theme='dark']) .cm-editor .tok-variableName { color: #953800 !important; }
body:not([arco-theme='dark']) .cm-editor .tok-typeName { color: #116329 !important; }
body:not([arco-theme='dark']) .cm-editor .tok-propertyName { color: #0550ae !important; }
body:not([arco-theme='dark']) .cm-editor .tok-atom { color: #cf222e !important; }
body:not([arco-theme='dark']) .cm-editor .tok-meta { color: #6e7781 !important; }
body:not([arco-theme='dark']) .cm-editor .tok-labelName { color: #24292f !important; }
body:not([arco-theme='dark']) .cm-editor .tok-attributeValue { color: #0a3069 !important; }
body:not([arco-theme='dark']) .cm-editor .tok-attributeName { color: #0550ae !important; }
body:not([arco-theme='dark']) .cm-editor .tok-heading { color: #0550ae !important; font-weight: bold; }
body:not([arco-theme='dark']) .cm-editor .tok-quote { color: #6e7781 !important; }
body:not([arco-theme='dark']) .cm-editor .tok-link { color: #0969da !important; text-decoration: underline; }
body:not([arco-theme='dark']) .cm-editor .tok-invalid { color: #cf222e !important; }
</style>
<style scoped>
.commit-alert{line-height:26px; font-size:14px; padding:0 8px;}
.cont{padding:10px;}
.pathbox{padding:6px 10px; height:32px; box-sizing:border-box; line-height:20px; border:1px solid #ccc;}
.pathbox .item{cursor:pointer;}
.icon{vertical-align:middle;}
.filename{cursor:pointer; min-width:80px; line-height:22px;}
.filename:hover{color:#0052d9;}
.options span{display:inline-block; line-height:30px;}
.renameinput{margin-left:10px; height:26px; padding:0 6px; border:1px solid #999; width:200px;}
.upload{position:relative;}
.upload input[type='file']{min-width:0; position:absolute; top:0; left:0; right:0; bottom:0; z-index:1; opacity:0; cursor:pointer;}

.point{display:inline-block; width:8px; height:8px; border-radius:50%; background:#00A870; margin-right:6px;}
.point.green{background:rgb(var(--green-5));}
.point.gray{background:var(--color-neutral-4);}

.command-upfile{position:relative; margin:0 12px;}
.command-upfile input[type='file']{min-width:30px; position:absolute; top:0; left:0; right:0; bottom:0; z-index:1; opacity:0;}
</style>