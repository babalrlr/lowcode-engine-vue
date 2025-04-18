import { ref, Suspense, type PropType } from 'vue';
import type { DocumentInstance, VueSimulatorRenderer } from './interface';
import { defineComponent, h, renderSlot } from 'vue';
import LowCodeRenderer from '@knxcloud/lowcode-vue-renderer';
import { RouterView } from 'vue-router';
import type { IPublicTypeComponentSchema } from '@alilc/lowcode-types';
import { ProjectContext } from './simulator';
import { deepMerge } from './utils';

export const Layout = defineComponent({
  props: {
    simulator: {
      type: Object as PropType<VueSimulatorRenderer>,
      required: true,
    },
  },
  render() {
    const { simulator, $slots } = this;
    const { layout, getComponent } = simulator;
    if (layout) {
      const { Component, props = {}, componentName } = layout;
      if (Component) {
        return h(Component, { ...props, key: 'layout', simulator } as any, $slots);
      }
      const ComputedComponent = componentName && getComponent(componentName);
      if (ComputedComponent) {
        return h(ComputedComponent, { ...props, key: 'layout', simulator }, $slots);
      }
    }
    return renderSlot($slots, 'default');
  },
});

export const SimulatorRendererView = defineComponent({
  props: {
    simulator: {
      type: Object as PropType<VueSimulatorRenderer>,
      required: true,
    },
  },
  render() {
    const { simulator } = this;
    return h(Layout, { simulator }, () => {
      return h(RouterView, null, {
        default: ({ Component }) => {
          return Component && h(Suspense, null, () => h(Component));
        },
      });
    });
  },
});

export const Renderer = defineComponent({
  props: {
    simulator: {
      type: Object as PropType<VueSimulatorRenderer>,
      required: true,
    },
    documentInstance: {
      type: Object as PropType<DocumentInstance>,
      required: true,
    },
  },
  setup: () => ({ renderer: ref() }),
  render() {
    const { documentInstance, simulator } = this;
    const { schema, scope, messages, appHelper, key } = documentInstance;
    const { designMode, device, locale, components, requestHandlersMap } = simulator;

    return h(LowCodeRenderer, {
      ref: 'renderer',
      key: key,
      scope: scope,
      schema: schema,
      locale: locale,
      device: device,
      messages: messages,
      appHelper: appHelper,
      components: components,
      designMode: designMode,
      requestHandlersMap: requestHandlersMap,
      disableCompMock: simulator.disableCompMock,
      thisRequiredInJSE: simulator.thisRequiredInJSE,
      getNode: (id) => documentInstance.getNode(id) as any,
      onCompGetCtx: (schema, ref) => documentInstance.mountInstance(schema.id!, ref),
    });
  },
});

/**
 * 过滤属性 
 * 某个属性，会导致组件无法选择。没有排查，全部加上了
*/
const SKIP_KEY = {
  $: true,
  $el: true,
  $data: true,
  $props: true,
  $attrs: true,
  $slots: true,
  // $refs: true,
  $parent: true,
  $root: true,
  $host: true,
  $emit: true,
  $options: true,
  $forceUpdate: true,
  $nextTick: true,
  $watch: true,
};
export const createComponent = (context: ProjectContext, simulator: VueSimulatorRenderer) => {
  return (schema: IPublicTypeComponentSchema) => defineComponent({
    name: schema.componentName,
    setup(props, { attrs, expose }) {

      /**
       * 透传属性，父组件可执行子组件属性和方法
       */
      const componentRef = ref();
      expose(
        new Proxy(
          {},
          {
            get: (_, key) => {
              const target = componentRef?.value?.runtimeScope;
              if (target) return Reflect.get(target, key);
            },
            set: (_, key, value) => {
              const target = componentRef?.value?.runtimeScope;
              if (target) return Reflect.set(target, key, value);
              return false;
            },
            has: (_, key) => {
              if (key in SKIP_KEY) return false;
              return key in componentRef?.value?.runtimeScope;
            },
          }
        )
      );
      
      return () => h(LowCodeRenderer, {
        ref: componentRef,
        schema: structuredClone(schema), 
        passProps: attrs, 
        locale: simulator.locale,
        device: simulator.device, 
        messages:  deepMerge(context.i18n, Reflect.get(schema, 'i18n')),
        appHelper: context.appHelper,
        components: simulator.components, 
        designMode: simulator.designMode, 
        disableCompMock: simulator.disableCompMock, 
        thisRequiredInJSE: simulator.thisRequiredInJSE, 
        requestHandlersMap: simulator.requestHandlersMap,
      });
    },
  });
}