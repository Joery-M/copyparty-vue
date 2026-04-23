<script setup lang="ts">
import { getApiUrl } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import type { File } from '@/lib/interop';
import { PaintBucket, ZoomIn, ZoomOut } from 'lucide-vue-next';
import DialogFooter from '../ui/dialog/DialogFooter.vue';

import { Button } from '@shadcn/button';
import { ButtonGroup } from '@shadcn/button-group';
import { Select, SelectContent, SelectGroup, SelectItem } from '@shadcn/select';
import { useElementSize, useKeyModifier, useLocalStorage, whenever } from '@vueuse/core';
import { computed, onMounted, ref, useTemplateRef } from 'vue';

const props = defineProps<{ file: File }>();

const mediaUrl = getApiUrl(props.file.fullPath);

enum BackgroundType {
    Transparent = 'transparent',
    Black = 'black',
    White = 'white',
    Grid = 'grid'
}
const backgroundType = useLocalStorage<BackgroundType>(
    'preview-background-type',
    BackgroundType.Transparent
);
const backgroundClass = computed(() => {
    if (isLoading.value) return [];

    switch (backgroundType.value) {
        case BackgroundType.Black:
            return ['bg-black'];
        case BackgroundType.White:
            return ['bg-white'];
        case BackgroundType.Transparent:
            return ['bg-transparent'];
        case BackgroundType.Grid:
            return ['background-grid'];
    }
});

const backgroundTypeButton = useTemplateRef('backgroundTypeButton');
const backgroundTypeSelectOpen = ref(false);

const isLoading = ref(true);

const zoomFactor = ref(100);

const isHoldingShift = useKeyModifier('Shift');

const mediaElem = useTemplateRef('media');
const mediaSize = useElementSize(mediaElem);

const zoomedMediaWidth = computed(() => (zoomFactor.value / 100) * mediaSize.width.value);
const zoomedMediaHeight = computed(() => (zoomFactor.value / 100) * mediaSize.height.value);
const smallestMediaAxis = computed(() => Math.min(zoomedMediaWidth.value, zoomedMediaHeight.value));
const largestMediaAxis = computed(() => Math.min(zoomedMediaWidth.value, zoomedMediaHeight.value));

function zoom(ratio: number) {
    if (ratio < 0) {
        if (smallestMediaAxis.value < 5) return;
    } else if (ratio > 0) {
        if (largestMediaAxis.value > window.innerWidth * 4) return;
    }

    zoomFactor.value *= 1 + ratio;
    zoomFactor.value = Math.max(zoomFactor.value, 1);
}
whenever(
    smallestMediaAxis,
    (size) => {
        const desiredMinSize = Math.max(window.innerHeight, window.innerWidth) * 0.2;
        const desiredMaxSize = Math.min(window.innerHeight, window.innerWidth);
        if (size < desiredMinSize) {
            zoomFactor.value = (desiredMinSize / size) * 100;
        }
        if (size > desiredMaxSize) {
            // Fix this
            zoomFactor.value = (size / desiredMaxSize) * 100;
        }
    },
    { once: true }
);

function loaded() {
    isLoading.value = false;
}

const zoomOutFactor = -0.5;
const zoomInFactor = zoomOutFactor * -2;
</script>

<template>
    <div
        class="self-center justify-self-center h-0 flex-1 flex pointer-events-none! *:pointer-events-auto p-10"
    >
        <img
            ref="media"
            v-if="
                file.classification === FileClassification.RasterImage ||
                file.classification === FileClassification.VectorImage
            "
            class="self-center justify-self-center transition-transform"
            :style="{
                transform: `scale(${zoomFactor / 100})`,
                cursor: isHoldingShift ? 'zoom-out' : 'zoom-in'
            }"
            :class="backgroundClass"
            :src="mediaUrl"
            :alt="file.name"
            @load="loaded()"
            @click="zoom(isHoldingShift ? zoomOutFactor : zoomInFactor)"
        />
        <video
            ref="media"
            v-else-if="file.classification === FileClassification.Video"
            class="self-center justify-self-center transition-transform"
            :style="{ transform: `scale(${zoomFactor / 100})` }"
            :src="mediaUrl"
            :alt="file.name"
            controls
            autoplay
        />
    </div>
    <DialogFooter class="sm:justify-center pointer-events-none! *:pointer-events-auto z-10">
        <ButtonGroup>
            <ButtonGroup>
                <Button
                    @click="backgroundTypeSelectOpen = true"
                    variant="accent"
                    ref="backgroundTypeButton"
                    size="icon-lg"
                    aria-label="Background"
                >
                    <PaintBucket />
                </Button>
            </ButtonGroup>
            <ButtonGroup>
                <Button
                    @click="zoom(zoomInFactor)"
                    variant="accent"
                    size="icon-lg"
                    aria-label="Zoom in"
                >
                    <ZoomIn />
                </Button>
                <Button
                    @click="zoomFactor = 100"
                    variant="accent"
                    size="lg"
                    aria-label="Reset zoom"
                >
                    {{ (zoomFactor / 100).toLocaleString(undefined, { style: 'percent' }) }}
                </Button>
                <Button
                    @click="zoom(zoomOutFactor)"
                    variant="accent"
                    size="icon-lg"
                    aria-label="Zoom out"
                >
                    <ZoomOut />
                </Button>
            </ButtonGroup>
        </ButtonGroup>
    </DialogFooter>

    <!-- Background color select -->
    <Select v-model="backgroundType" v-model:open="backgroundTypeSelectOpen">
        <SelectContent position="popper" :reference="backgroundTypeButton?.$el">
            <SelectGroup>
                <SelectItem :value="BackgroundType.Transparent"> Transparent </SelectItem>
                <SelectItem :value="BackgroundType.Black"> Black </SelectItem>
                <SelectItem :value="BackgroundType.White"> White </SelectItem>
                <SelectItem :value="BackgroundType.Grid"> Grid </SelectItem>
            </SelectGroup>
        </SelectContent>
    </Select>
</template>

<style lang="scss" scoped>
.background-grid {
    // https://stackoverflow.com/a/65129916
    background: repeating-conic-gradient(#ffffff 0 25%, #cacaca 0 50%) 50% / 10px 10px;
}
</style>
