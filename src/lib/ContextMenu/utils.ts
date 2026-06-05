import type { ContextMenuContentProps } from 'reka-ui';
import type { DeepReadonly, InjectionKey, ShallowRef } from 'vue';

import { inject } from 'vue';

export interface ContextMenuPayload {
    data: any;
    onOpen?: () => void;
    menuProps?: ContextMenuContentProps;
}

export interface Point {
    x: number;
    y: number;
}
export interface ContextMenuRootContext {
    curTarget: DeepReadonly<ShallowRef<[Element, ContextMenuPayload] | null>>;
    isOpen: DeepReadonly<ShallowRef<boolean>>;
    elemMap: Map<Element, ContextMenuPayload>;
    open(payload: ContextMenuPayload, point: Point, elem: HTMLElement): void;
}

export const injectionKeyCustomContextMenuRootContext: InjectionKey<ContextMenuRootContext | null> =
    Symbol('CustomContextMenuRoot');

export const injectCustomContextMenuRootContext = () => {
    const context = inject(injectionKeyCustomContextMenuRootContext);
    if (context) return context;

    throw new Error(
        'Injection `CustomContextMenuRoot` not found. Component must be used within `ContextMenuRoot`'
    );
};
