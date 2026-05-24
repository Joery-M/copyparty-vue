<script setup lang="ts">
import { useSettings } from '@/stores/useSettings';
import { Button } from '@shadcn/button';
import { FormControl, FormField, FormItem, FormLabel } from '@shadcn/form';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/popover';
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputItemDelete } from '@shadcn/tags-input';
import { Settings, Undo2 } from 'lucide-vue-next';
import { TagsInputItemText } from 'reka-ui';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const i18n = useI18n();
const settings = useSettings();

const tagHeaders = computed(() => {
    const tags = i18n.tm('filelist.tags');
    return Object.fromEntries(Object.entries(tags).map(([k, v]) => [k, i18n.rt(v)]));
});
</script>

<template>
    <Popover>
        <PopoverTrigger as-child>
            <Button size="icon" variant="ghost" class="main-btn">
                <Settings />
            </Button>
        </PopoverTrigger>
        <PopoverContent class="w-md">
            <form>
                <FormField name="hiddenCols">
                    <FormItem>
                        <FormLabel>
                            {{ $t('filelist.hidden_cols') }}
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                type="button"
                                @click="settings.resetPath('fileView.hiddenListColumns')"
                            >
                                <Undo2 />
                            </Button>
                        </FormLabel>
                        <FormControl>
                            <TagsInput
                                v-model="settings.fileView.hiddenListColumns"
                                class="bg-input/20 dark:bg-input/30"
                            >
                                <TagsInputItem
                                    v-for="item in settings.fileView.hiddenListColumns"
                                    :key="item"
                                    :value="item"
                                    class="bg-foreground text-background"
                                >
                                    <TagsInputItemText
                                        class="py-0.5 px-2 text-sm rounded bg-transparent"
                                    >
                                        <template v-if="tagHeaders[item]">
                                            {{ tagHeaders[item] }}
                                            <code
                                                class="text-xs text-background/50 dark:text-background/70"
                                            >
                                                ({{ item }})
                                            </code>
                                        </template>
                                        <template v-else>
                                            {{ item }}
                                        </template>
                                    </TagsInputItemText>
                                    <TagsInputItemDelete />
                                </TagsInputItem>

                                <TagsInputInput />
                            </TagsInput>
                        </FormControl>
                    </FormItem>
                </FormField>
            </form>
        </PopoverContent>
    </Popover>
</template>

<style scoped>
@reference "@/style.css";

.main-btn {
    @apply size-full px-2 rounded-none;
}
</style>
