declare const __DEV__: boolean;
declare const __PROD__: boolean;

declare module 'markdown-it-task-lists' {
    import { type PluginSimple } from 'markdown-exit';
    const taskList: PluginSimple;
    export default taskList;
}
