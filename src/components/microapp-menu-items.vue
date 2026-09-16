<template>
    <template v-for="menu in menus" :key="menu.key || menu.do">
        <a-menu-item v-if="!menu.children || !menu.children.length" :key="menu.key || menu.do">
            <template #icon>
                <span v-if="menu.icon_svg" v-html="elementsToSvg(menu.icon_svg)"></span>
                <span v-else-if="menu.icon" class="wi" :class="'wi-' + menu.icon"></span>
                <IconMenu v-else />
            </template>
            <span>{{ menu.title }}</span>
        </a-menu-item>
        <a-sub-menu v-else :key="menu.key || menu.do">
            <template #icon>
                <span v-if="menu.icon_svg" v-html="elementsToSvg(menu.icon_svg)"></span>
                <span v-else-if="menu.icon" class="wi" :class="'wi-' + menu.icon"></span>
                <IconMenu v-else />
            </template>
            <template #title>{{ menu.title }}</template>
            <microapp-menu-items :menus="menu.children" />
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
