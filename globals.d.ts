declare const __DEV__: boolean;
declare const __PROD__: boolean;

declare module 'markdown-it-task-lists' {
    import { type PluginSimple } from 'markdown-exit';
    const taskList: PluginSimple;
    export default taskList;
}

interface InitialState {
    dir: string;
    preview: string;
}

declare var __initial_state: undefined | InitialState;
