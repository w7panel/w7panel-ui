import { defineComponent, h } from 'vue';
import { createLibrary, defineComponent as defineOpenUIComponent } from '@openuidev/vue-lang';
import { z } from 'zod';

const children = z.array(z.any()).default([]);

const CopilotCard = defineOpenUIComponent({
  name: 'CopilotCard',
  description: 'A titled group of Copilot content.',
  props: z.object({ children, title: z.string().default('诊断结果') }),
  component: defineComponent({
    props: { props: { type: Object, required: true }, renderNode: { type: Function, required: true } },
    setup(componentProps: any) {
      return () => h('section', { class: 'copilot-card' }, [
        h('h3', componentProps.props.title),
        ...(componentProps.props.children || []).map((node: unknown) => componentProps.renderNode(node)),
      ]);
    },
  }),
});

const CopilotText = defineOpenUIComponent({
  name: 'CopilotText',
  description: 'A concise diagnostic sentence or paragraph.',
  props: z.object({ text: z.string() }),
  component: defineComponent({
    props: { props: { type: Object, required: true } },
    setup(componentProps: any) { return () => h('p', { class: 'copilot-text' }, componentProps.props.text); },
  }),
});

const CopilotMetric = defineOpenUIComponent({
  name: 'CopilotMetric',
  description: 'A labelled cluster metric.',
  props: z.object({ label: z.string(), value: z.string() }),
  component: defineComponent({
    props: { props: { type: Object, required: true } },
    setup(componentProps: any) {
      return () => h('div', { class: 'copilot-metric' }, [h('span', componentProps.props.label), h('strong', componentProps.props.value)]);
    },
  }),
});

const CopilotAlert = defineOpenUIComponent({
  name: 'CopilotAlert',
  description: 'An information, warning, or error notice.',
  props: z.object({ text: z.string(), level: z.enum(['info', 'warning', 'error']).default('info') }),
  component: defineComponent({
    props: { props: { type: Object, required: true } },
    setup(componentProps: any) { return () => h('div', { class: `copilot-alert ${componentProps.props.level}` }, componentProps.props.text); },
  }),
});

const CopilotYaml = defineOpenUIComponent({
  name: 'CopilotYaml',
  description: 'A single proposed Kubernetes resource change that requires a user confirmation.',
  props: z.object({ operation: z.enum(['apply', 'delete']), manifest: z.string() }),
  component: defineComponent({
    props: { props: { type: Object, required: true } },
    setup(componentProps: any) {
      const propose = () => window.dispatchEvent(new CustomEvent('w7panel-copilot-proposal', { detail: componentProps.props }));
      return () => h('div', { class: 'copilot-yaml' }, [
        h('pre', componentProps.props.manifest),
        h('button', { class: 'arco-btn arco-btn-primary arco-btn-size-mini', onClick: propose }, `${componentProps.props.operation === 'delete' ? '确认删除' : '确认变更'}`),
      ]);
    },
  }),
});

const CopilotAction = defineOpenUIComponent({
  name: 'CopilotAction',
  description: 'A dry-run validated resource change that still requires user confirmation.',
  props: z.object({ id: z.string(), operation: z.enum(['apply', 'delete', 'command']), resource: z.string() }),
  component: defineComponent({
    props: { props: { type: Object, required: true } },
    setup(componentProps: any) {
      const confirm = () => window.dispatchEvent(new CustomEvent('w7panel-copilot-action-confirm', { detail: componentProps.props }));
      return () => h('button', { class: 'arco-btn arco-btn-primary arco-btn-size-mini', onClick: confirm }, `${componentProps.props.operation === 'command' ? '确认执行' : componentProps.props.operation === 'delete' ? '确认删除' : '确认变更'} ${componentProps.props.resource}`);
    },
  }),
});

export const copilotLibrary = createLibrary({
  components: [CopilotCard, CopilotText, CopilotMetric, CopilotAlert, CopilotYaml, CopilotAction],
  root: 'CopilotCard',
});
