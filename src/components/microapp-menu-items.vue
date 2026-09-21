<template>
    <div v-if="groupTitle" class="microapp-menu-header" :class="{ 'is-collapsed': collapsed }">
        <span class="microapp-menu-header__icon">
            <IconApps />
        </span>
        <span v-if="!collapsed" class="microapp-menu-header__title">{{ groupTitle }}</span>
    </div>
    <template v-for="menu in menus" :key="menu.key || menu.do">
        <a-menu-item v-if="!menu.children || !menu.children.length" :key="menu.key || menu.do">
            <template v-if="level === 1" #icon>
                <span v-if="menu.icon_svg" v-html="elementsToSvg(menu.icon_svg)"></span>
                <span v-else-if="menu.icon" class="wi" :class="'wi-' + menu.icon"></span>
                <IconMenu v-else />
            </template>
            <span>{{ menu.title }}</span>
        </a-menu-item>
        <a-sub-menu v-else :key="menu.key || menu.do">
            <template v-if="level === 1" #icon>
                <span v-if="menu.icon_svg" v-html="elementsToSvg(menu.icon_svg)"></span>
                <span v-else-if="menu.icon" class="wi" :class="'wi-' + menu.icon"></span>
                <IconMenu v-else />
            </template>
            <template #title>{{ menu.title }}</template>
            <microapp-menu-items :menus="menu.children" :level="level + 1" />
        </a-sub-menu>
    </template>
</template>

<script>
export default {
    name: 'MicroappMenuItems',
    props: {
        menus: {
            type: Array,
            default: () => [],
        },
        groupTitle: {
            type: String,
            default: '',
        },
        collapsed: {
            type: Boolean,
            default: false,
        },
        level: {
            type: Number,
            default: 1,
        },
    },
    methods: {
        elementsToSvg(elementsArray, options = {}) {
            if (!Array.isArray(elementsArray)) {
                return '';
            }

            const elements = [...elementsArray];
            const svgElementIndex = elements.findIndex(item => item?.type === 'svg');
            const svgRoot = svgElementIndex === -1
                ? { type: 'svg', xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 48 48' }
                : { ...elements.splice(svgElementIndex, 1)[0] };
            svgRoot.width = options.width ?? svgRoot.width ?? 16;
            svgRoot.height = options.height ?? svgRoot.height ?? 16;

            const attrs = Object.entries(svgRoot)
                .filter(([key]) => key !== 'type')
                .map(([key, value]) => `${key}="${String(value)}"`)
                .join(' ');
            const children = elements
                .filter(element => element && typeof element === 'object' && element.type)
                .map((element) => {
                    const { type, content, ...elementAttrs } = element;
                    const attrText = Object.entries(elementAttrs)
                        .map(([key, value]) => `${key}="${String(value)}"`)
                        .join(' ');
                    return content
                        ? `<${type} ${attrText}>${content}</${type}>`
                        : `<${type} ${attrText} />`;
                })
                .join('');

            return `<svg ${attrs}>${children}</svg>`;
        },
    },
};
</script>

<style scoped lang="less">
.microapp-menu-header {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: 40px;
    margin-bottom: 4px;
    padding: 0 12px;
    overflow: hidden;
    color: var(--color-text-3);
    font-size: 13px;
    line-height: 40px;
    white-space: nowrap;
    cursor: default;

    &__icon {
        display: inline-flex;
        flex: 0 0 32px;
        align-items: center;
        width: 32px;
    }

    &__title {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    :deep(.arco-icon) {
        width: 16px;
        margin-right: 0;
        color: var(--color-text-3);
        font-size: 16px;
    }

    &.is-collapsed {
        justify-content: center;
        padding: 0;

        .microapp-menu-header__icon {
            justify-content: center;
        }
    }
}

:deep(.arco-menu-icon) {
    display: inline-flex;
    flex: 0 0 32px;
    align-items: center;
    width: 32px;
    margin-right: 0 !important;
}

:deep(.arco-menu-icon > *) {
    flex: 0 0 16px;
    width: 16px;
}

:deep(.arco-menu-icon svg) {
    width: 16px !important;
    height: 16px !important;
}
</style>
