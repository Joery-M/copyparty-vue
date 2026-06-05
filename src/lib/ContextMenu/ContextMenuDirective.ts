import type { Directive, VNode } from 'vue';

import type { ContextMenuPayload, ContextMenuRootContext } from './utils';

import { injectionKeyCustomContextMenuRootContext } from './utils';

const injectFromVnode = (vnode: VNode) => {
    const rootContext: ContextMenuRootContext | null =
        //@ts-expect-error
        vnode.ctx.provides[injectionKeyCustomContextMenuRootContext];
    if (rootContext === null)
        throw new Error(
            'Injection `CustomContextMenuRoot` not found. Component must be used within `ContextMenuRoot`'
        );
    return rootContext;
};

export const vContextMenu: Directive<Element, ContextMenuPayload> = {
    mounted(el, binding, vnode) {
        const rootContext = injectFromVnode(vnode);
        rootContext.elemMap.set(el, binding.value);
        el.setAttribute('data-context-menu', '');
    },
    beforeUnmount(el, _binding, vnode) {
        const rootContext = injectFromVnode(vnode);
        rootContext.elemMap.delete(el);
    },
};

declare module 'vue' {
    export interface GlobalDirectives {
        vContextMenu: typeof vContextMenu;
    }
}
