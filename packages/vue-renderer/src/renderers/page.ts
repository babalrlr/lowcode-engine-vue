import { defineComponent, h } from 'vue';
import { useRenderer, rendererProps, useRootScope } from '../core';

const Page = defineComponent((props, { slots }) => {
  return () => h('div', { class: 'lc-page', style: { height: '100%' }, ...props }, slots);
});

export const PageRenderer = defineComponent({
  name: 'PageRenderer',
  props: rendererProps,
  inheritAttrs: false, // 如果不设置，PageComponent的props设置表达式时，会被覆盖。
  __renderer__: true,
  setup(props, context) {
    const { scope, wrapRender } = useRootScope(props, context);
    const { renderComp, componentsRef, schemaRef } = useRenderer(props, scope);

    return wrapRender(() => {
      return renderComp(schemaRef.value, scope, componentsRef.value.Page || Page);
    });
  },
});
