<template>
    <div class="description">
        <div class="tabs">
            <span class="active">应用介绍</span>
        </div>
        <a-empty v-if="!docEntries.length">暂无应用介绍</a-empty>

        <div v-else class="description__layout" :class="{ 'is-single': !showSidebar }">
            <aside v-if="showSidebar" class="description__sidebar">
                <button v-for="item in orderedDocEntries" :key="item.path" type="button" class="description__nav-item"
                    :class="{ 'is-active': item.path === activePath }" @click="selectEntry(item.path)">
                    <span class="description__nav-title">{{ item.title === 'README' ? '简介' : item.title }}</span>
                </button>
            </aside>

            <section class="description__main">
                <div class="description__viewer">
                    <markdown-preview :text="activeEntry.content"></markdown-preview>
                </div>
            </section>
        </div>
    </div>
</template>

<script>
import MarkdownPreview from '@/components/markdown-preview.vue';

const normalizePath = (path = '') => String(path || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');

const isReadmePath = (path = '') => /^readme\.md$/i.test(normalizePath(path));

const getTitleFromPath = (path = '') => {
    const normalized = normalizePath(path);
    if (isReadmePath(normalized)) {
        return 'README';
    }

    const fileName = normalized.split('/').pop() || normalized;
    return fileName.replace(/\.md$/i, '') || normalized;
};

export default {
    name: 'SiteDescription',
    components: { MarkdownPreview },
    props: {
        files: {
            type: Object,
            default: () => ({}),
        },
    },
    data() {
        return {
            activePath: '',
        };
    },
    computed: {
        docEntries() {
            const source = this.files && typeof this.files === 'object' && !Array.isArray(this.files)
                ? this.files
                : {};

            return Object.keys(source)
                .map((path) => {
                    const normalizedPath = normalizePath(path);
                    return {
                        path: normalizedPath,
                        title: getTitleFromPath(normalizedPath),
                        content: source[path] == null ? '' : String(source[path]),
                        isReadme: isReadmePath(normalizedPath),
                    };
                })
                .filter(item => item.path&&item.path!=='docs/.order')
                .sort((a, b) => {
                    if (a.isReadme !== b.isReadme) {
                        return a.isReadme ? -1 : 1;
                    }
                    return a.path.localeCompare(b.path, 'zh-Hans-CN');
                });
        },
        showSidebar() {
            return this.docEntries.length > 1;
        },
        activeEntry() {
            return this.docEntries.find(item => item.path === this.activePath) || this.docEntries[0] || {
                path: '',
                title: '',
                content: '',
            };
        },
        orderedDocEntries() {
            let sortOrder = this.files?.['docs/.order']?.split?.(',') || [];
            let readme = this.docEntries.find(item => item.isReadme);
            const sortedItems = [...this.docEntries.filter(i=>!i.isReadme)].sort((x, y) => {
                const indexX = sortOrder.indexOf(x.path);
                const indexY = sortOrder.indexOf(y.path);

                if (indexX === -1 && indexY === -1) return 0;
                if (indexX === -1) return 1;
                if (indexY === -1) return -1;

                return indexX - indexY;
            });
            return readme? [readme,...sortedItems] : sortedItems;
        },
    },
    watch: {
        files: {
            immediate: true,
            deep: true,
            handler() {
                this.syncActivePath();
            },
        },
    },
    methods: {
        syncActivePath() {
            if (!this.docEntries.length) {
                this.activePath = '';
                return;
            }

            const exists = this.docEntries.some(item => item.path === this.activePath);
            if (!exists) {
                this.activePath = this.docEntries[0].path;
            }
        },
        selectEntry(path) {
            this.activePath = path;
        },
    },
};
</script>

<style scoped lang="css">
.description {
    background-color: #fff;
    padding: 20px;
}

.description__layout {
    display: flex;
    gap: 20px;
    align-items: flex-start;
}

.description__layout.is-single {
    display: block;
}

.description__sidebar {
    width: 240px;
    flex: 0 0 240px;
    background: #fff;
    border-radius: 12px;
    padding: 20px 0;
    position: sticky;
    top: 20px;
}

.description__sidebar-title {
    padding: 0 20px 12px;
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
    color: rgba(0, 0, 0, 0.9);
}

.description__nav-item {
    width: 100%;
    border: 0;
    background: transparent;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 20px;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
}

.description__nav-item:hover {
    background: #f5f8ff;
}

.description__nav-item.is-active {
    background: #edf3ff;
}

.description__nav-title {
    font-size: 14px;
    line-height: 22px;
    color: rgba(0, 0, 0, 0.88);
    word-break: break-word;
}

.description__nav-item.is-active .description__nav-title {
    color: #2d5fff;
}

.description__nav-path {
    font-size: 12px;
    line-height: 18px;
    color: rgba(0, 0, 0, 0.45);
    word-break: break-all;
}

.description__main {
    min-width: 0;
    flex: 1;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
}

.description__header {
    padding: 24px 28px 0;
}

.description__title {
    font-size: 24px;
    font-weight: 600;
    line-height: 32px;
    color: rgba(0, 0, 0, 0.9);
    word-break: break-word;
}

.description__path {
    margin-top: 8px;
    font-size: 13px;
    line-height: 20px;
    color: rgba(0, 0, 0, 0.45);
    word-break: break-all;
}

.description__viewer :deep(.v-note-wrapper) {
    min-height: 240px;
    border: 0;
}

.description__viewer :deep(.v-note-wrapper .v-note-panel .v-note-show .v-show-content, .v-note-wrapper .v-note-panel .v-note-show .v-show-content-html) {
    padding: 0;
}

.description__viewer :deep(.v-note-panel) {
    min-height: 240px;
}

.description__viewer :deep(.v-note-op) {
    display: none;
}

.description__viewer :deep(.v-note-show) {
    padding: 0;
    background: transparent;
}

.description__viewer :deep(.markdown-body) {
    padding: 0;
}

.tabs {
    display: flex;
}

.tabs span {
    cursor: pointer;
    line-height: 18px;
    font-size: 14px;
    text-align: center;
    padding: 10px 0;
    margin: 0 12px;
    position: relative;
}

.tabs span:first-child {
    margin-left: 0;
}

.tabs span.active {
    border-bottom: 2px solid #2d5fff;
}

.tabs span font {
    color: #2d5fff;
    font-weight: bold;
    margin-left: 5px;
}
</style>
