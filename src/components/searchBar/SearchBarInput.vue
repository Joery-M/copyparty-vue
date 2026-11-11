<script setup lang="ts">
import { CurlyBraces, Search, TextCursorInput } from '@lucide/vue';
import { injectPopoverRootContext } from 'reka-ui';
import { ref, useTemplateRef, watch } from 'vue';

import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { PopoverAnchor } from '@/components/ui/popover';
import { compileQuery, MultiSearchQuery, SingleSearchQuery } from '@/lib/searchApi';

const rootContext = injectPopoverRootContext();

const input = useTemplateRef('input');
const model = defineModel<string>();

const simpleSearchInput = ref('');
watch(simpleSearchInput, (input) => {
    if (input.trim() === '') {
        model.value = '';
        return;
    }
    const query = compileQuery(
        MultiSearchQuery.or(
            SingleSearchQuery.like('path', `*${input}*`),
            SingleSearchQuery.like('name', `*${input}*`),
            SingleSearchQuery.like('tags', `*${input}*`)
        )
    );
    model.value = query;
});

const rawSearch = ref(false);

defineExpose({
    input,
});
</script>

<template>
    <PopoverAnchor>
        <InputGroup>
            <InputGroupInput
                class="w-75"
                ref="input"
                :placeholder="$t('search')"
                role="combobox"
                autocapitalize="off"
                autocorrect="off"
                autocomplete="off"
                aria-haspopup="false"
                :aria-expanded="rootContext.open.value"
                aria-controls="search-autocomplete-menu"
                @focus="rootContext.open.value = true"
                :modelValue="rawSearch ? model : simpleSearchInput"
                @update:modelValue="rawSearch ? (model = $event) : (simpleSearchInput = $event)"
            />
            <InputGroupAddon>
                <Search />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end" class="pr-1">
                <Button
                    variant="ghost"
                    class="rounded-l-none"
                    size="icon"
                    @click="rawSearch = !rawSearch"
                >
                    <TextCursorInput v-if="rawSearch" />
                    <CurlyBraces v-else />
                </Button>
            </InputGroupAddon>
        </InputGroup>
    </PopoverAnchor>
</template>
