// Markdown-it plugin to render GitHub-style task lists; see
//
// https://github.com/blog/1375-task-lists-in-gfm-issues-pulls-comments
// https://github.com/blog/1825-task-lists-in-all-markdown-documents

import type { PluginWithOptions } from 'markdown-exit';
import type { Options, State, StateToken, Token } from './types';

let options: Options = {
    enabled: false,
    label: false,
    labelAfter: false,
    labelBefore: false,
    containerClass: 'task-list',
    itemClass: 'task-list__item',
    labelClass: 'task-list__label',
    inputClass: 'task-list__input'
};

const MarkdownItTasks: PluginWithOptions<Options> = (md, opts) => {
    options = { ...options, ...opts };

    md.core.ruler.after('inline', 'github-task-lists', function (state: State) {
        const tokens: Token = state.tokens;
        for (let i = 2; i < tokens.length; i++) {
            if (isTodoItem(tokens, i)) {
                createTodo(tokens[i], state.Token);
                attrSet(
                    tokens[i - 2],
                    'class',
                    options.itemClass + (options.enabled ? ` ${options.itemClass}--enabled` : ``)
                );
                attrSet(tokens[parentToken(tokens, i - 2)], 'class', options.containerClass || '');
            }
        }
    });
};

const attrSet = (token: Token, name: string, value: string): void => {
    const index = token.attrIndex(name);
    const attr = [name, value];

    if (index < 0) token.attrPush(attr);
    else token.attrs[index] = attr;
};

const parentToken = (tokens: Token[], index: number): number => {
    var targetLevel = tokens[index].level - 1;
    for (var i = index - 1; i >= 0; i--) {
        if (tokens[i].level === targetLevel) {
            return i;
        }
    }
    return -1;
};

const isTodoItem = (tokens: Token[], index: number): boolean => {
    return (
        isInline(tokens[index]) &&
        isParagraph(tokens[index - 1]) &&
        isListItem(tokens[index - 2]) &&
        startsWithTodoMarkdown(tokens[index])
    );
};

const createTodo = (token: Token, TokenConstructor: StateToken): void => {
    token.children.unshift(makeCheckbox(token, TokenConstructor));
    token.children[1].content = token.children[1].content.slice(3);
    token.content = token.content.slice(3);

    if (options.label) {
        if (options.labelAfter || options.labelBefore) {
            token.children.pop();

            // Use large random number as id property of the checkbox.
            var id = `${options.itemClass}--${Math.ceil(Math.random() * (10000 * 1000) - 1000)}`;
            token.children[0].content = `${token.children[0].content.slice(0, -1)} id="${id}">`;
            if (options.labelAfter)
                token.children.push(singleLabel(token.content, id, TokenConstructor));
            else if (options.labelBefore)
                token.children.unshift(singleLabel(token.content, id, TokenConstructor));
        } else {
            token.children.unshift(beginLabel(TokenConstructor));
            token.children.push(endLabel(TokenConstructor));
        }
    }
};

const makeCheckbox = (token: Token, TokenConstructor: StateToken): Token => {
    const checkbox = new TokenConstructor('html_inline', '', 0);
    const disabledAttr = options.enabled ? `` : ` disabled`;
    const checked =
        token.content.indexOf('[x] ') === 0 || token.content.indexOf('[X] ') === 0
            ? ` checked`
            : ``;
    const indeterminate =
        token.content.indexOf('[-] ') === 0 || token.content.indexOf('[/] ') === 0
            ? ` indeterminate`
            : ``;
    checkbox.content = `<input class="${options.inputClass}${indeterminate}" type="checkbox"${checked}${disabledAttr}>`;

    return checkbox;
};

// these next two functions are kind of hacky; probably should really be a
// true block-level token with .tag=='label'
const beginLabel = (TokenConstructor: StateToken): Token => {
    var token = new TokenConstructor('html_inline', '', 0);
    token.content = `<label class="${options.labelClass}">`;
    return token;
};

const endLabel = (TokenConstructor: StateToken): Token => {
    var token = new TokenConstructor('html_inline', '', 0);
    token.content = '</label>';
    return token;
};

const singleLabel = (content: string, id: string, TokenConstructor: StateToken): Token => {
    var token = new TokenConstructor('html_inline', '', 0);
    token.content = `<label class="${options.labelClass}" for="${id}">${content.trim()}</label>`;
    token.attrs = [{ for: id }];
    return token;
};

const isInline = (token: Token): boolean => token.type === 'inline';
const isParagraph = (token: Token): boolean => token.type === 'paragraph_open';
const isListItem = (token: Token): boolean => token.type === 'list_item_open';
const startsWithTodoMarkdown = (token: Token): boolean =>
    token.content.indexOf('[ ] ') === 0 ||
    token.content.indexOf('[x] ') === 0 ||
    token.content.indexOf('[X] ') === 0 ||
    token.content.indexOf('[-] ') === 0 ||
    token.content.indexOf('[/] ') === 0;

export default MarkdownItTasks;
