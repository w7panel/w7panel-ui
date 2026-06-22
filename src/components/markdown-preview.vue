<template>
    <VMdPreview :text="text" />
</template>

<script lang="ts" setup>
import hljs from 'highlight.js/lib/common';
import VMdPreview from '@kangc/v-md-editor/lib/preview';
import '@kangc/v-md-editor/lib/style/preview.css';
import githubTheme from '@kangc/v-md-editor/lib/theme/github.js';
import '@kangc/v-md-editor/lib/theme/style/github.css';
import createEmojiPlugin from '@kangc/v-md-editor/lib/plugins/emoji/index';
import '@kangc/v-md-editor/lib/plugins/emoji/emoji.css';

VMdPreview.use(githubTheme, {
    Hljs: hljs,
}).use(createEmojiPlugin());

defineProps({
    text: {
        type: String,
        default: '',
    },
});
</script>
